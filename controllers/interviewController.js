const twilio = require('twilio');
const Interview = require('../models/Interview');
const Session = require('../models/Session');

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// ─── Helpers ────────────────────────────────────────────────────────────────

const sendMessage = async (to, body) => {
    try {
        await twilioClient.messages.create({
            body,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${to}`
        });
    } catch (err) {
        console.error('Twilio error:', err.message);
    }
};

/**
 * Build a Google Calendar "Add to Calendar" link (no API key needed).
 * date: "DD/MM/YYYY", time: "HH:MM"
 */
const buildCalendarLink = (name, date, time) => {
    const [day, month, year] = date.split('/');
    const [hour, minute] = time.split(':');

    // Start datetime
    const start = new Date(year, month - 1, day, hour, minute);
    // End = start + 1 hour
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const fmt = (d) =>
        d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Interview - ${name}`,
        dates: `${fmt(start)}/${fmt(end)}`,
        details: `Job interview scheduled via WhatsApp bot.\nCandidate: ${name}`,
        location: 'Online (Google Meet / Zoom)',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Validate date format DD/MM/YYYY and that it's a real future date.
 */
const isValidDate = (str) => {
    const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    const [, d, m, y] = match;
    const date = new Date(y, m - 1, d);
    return (
        date.getFullYear() === +y &&
        date.getMonth() === m - 1 &&
        date.getDate() === +d &&
        date >= new Date()
    );
};

/**
 * Validate time format HH:MM (24h).
 */
const isValidTime = (str) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(str);

// ─── State Machine ───────────────────────────────────────────────────────────

const handleIncomingMessage = async (req, res) => {
    // Always respond 200 fast so Twilio doesn't retry
    res.status(200).send('OK');

    const msg = (req.body.Body || '').trim();
    const sender = (req.body.From || '').replace('whatsapp:', '');

    if (!msg || !sender) return;

    console.log(`[${sender}] → "${msg}"`);

    // Load or create session
    let session = await Session.findOne({ phone: sender });

    // ── No session or done → start fresh ────────────────────────────────────
    if (!session || session.step === 'done') {
        session = await Session.findOneAndUpdate(
            { phone: sender },
            { step: 'awaiting_name', data: {}, updatedAt: new Date() },
            { upsert: true, returnDocument: 'after' }
        );

        await sendMessage(
            sender,
            `👋 Hello! Welcome to the Interview Scheduler Bot.\n\nWhat's your *full name*?`
        );
        return;
    }

    // Update timestamp
    session.updatedAt = new Date();

    // ── Step machine ─────────────────────────────────────────────────────────
    switch (session.step) {

        case 'awaiting_name': {
            if (msg.length < 2) {
                await sendMessage(sender, '❗ Please enter a valid name.');
                return;
            }
            session.data.name = msg;
            session.step = 'awaiting_age';
            await session.save();
            await sendMessage(sender, `Nice to meet you, *${msg}*! 🙂\n\nHow old are you?`);
            break;
        }

        case 'awaiting_age': {
            const age = parseInt(msg, 10);
            if (isNaN(age) || age < 16 || age > 99) {
                await sendMessage(sender, '❗ Please enter a valid age (16–99).');
                return;
            }
            session.data.age = String(age);
            session.step = 'awaiting_city';
            await session.save();
            await sendMessage(sender, `Got it! 📍\n\nWhich *city* are you based in?`);
            break;
        }

        case 'awaiting_city': {
            if (msg.length < 2) {
                await sendMessage(sender, '❗ Please enter a valid city name.');
                return;
            }
            session.data.city = msg;
            session.step = 'awaiting_interview_choice';
            await session.save();
            await sendMessage(
                sender,
                `Great, *${session.data.city}*! 🌆\n\nWould you like to *schedule an interview*?\n\nReply *yes* or *no*.`
            );
            break;
        }

        case 'awaiting_interview_choice': {
            const answer = msg.toLowerCase();
            if (answer === 'yes' || answer === 'si' || answer === 'sí') {
                session.step = 'awaiting_date';
                await session.save();
                await sendMessage(
                    sender,
                    `📅 What date would you like for the interview?\n\nPlease use the format *DD/MM/YYYY*\n_(e.g. 20/05/2026)_`
                );
            } else if (answer === 'no') {
                session.step = 'done';
                await session.save();
                await sendMessage(
                    sender,
                    `No problem! 😊 Feel free to message anytime if you change your mind.\n\nHave a great day, *${session.data.name}*! 👋`
                );
            } else {
                await sendMessage(sender, '❗ Please reply with *yes* or *no*.');
            }
            break;
        }

        case 'awaiting_date': {
            if (!isValidDate(msg)) {
                await sendMessage(
                    sender,
                    '❗ Invalid date. Please use *DD/MM/YYYY* and make sure it\'s a future date.\n_(e.g. 20/05/2026)_'
                );
                return;
            }
            session.data.date = msg;
            session.step = 'awaiting_time';
            await session.save();
            await sendMessage(
                sender,
                `✅ Date set: *${msg}*\n\n⏰ What time works for you?\n\nUse 24h format *HH:MM*\n_(e.g. 14:30)_`
            );
            break;
        }

        case 'awaiting_time': {
            if (!isValidTime(msg)) {
                await sendMessage(
                    sender,
                    '❗ Invalid time. Please use *HH:MM* in 24h format.\n_(e.g. 14:30)_'
                );
                return;
            }
            session.data.time = msg;
            session.step = 'done';
            await session.save();

            // Build Google Calendar link
            const { name, age, city, date, time } = session.data;
            const calendarLink = buildCalendarLink(name, date, time);

            // Parse date for MongoDB
            const [d, m, y] = date.split('/');
            const interviewDate = new Date(y, m - 1, d);

            // Save interview to DB
            const interview = new Interview({
                candidateName: name,
                candidatePhone: sender,
                candidateAge: age,
                candidateCity: city,
                interviewDate,
                interviewTime: time,
                position: 'To be defined',
                status: 'scheduled',
                calendarLink
            });
            await interview.save();

            await sendMessage(
                sender,
                `🎉 *Interview Scheduled!*\n\n` +
                `👤 Name: ${name}\n` +
                `🎂 Age: ${age}\n` +
                `📍 City: ${city}\n` +
                `📅 Date: ${date}\n` +
                `⏰ Time: ${time}\n\n` +
                `Add it to your Google Calendar:\n📆 ${calendarLink}\n\n` +
                `We'll be in touch soon. Good luck! 🍀`
            );
            break;
        }

        default: {
            // Fallback — reset
            session.step = 'awaiting_name';
            session.data = {};
            await session.save();
            await sendMessage(sender, `👋 Hello! What's your *full name*?`);
        }
    }
};

module.exports = { handleIncomingMessage };