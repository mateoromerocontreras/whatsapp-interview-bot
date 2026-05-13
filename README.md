# 🤖 WhatsApp Interview Bot

A WhatsApp chatbot that guides job candidates through a multi-step conversation to collect their information and schedule interviews, generating a Google Calendar link automatically.

Built with **Node.js · Express · Twilio · MongoDB Atlas · ngrok**.

---

## ✨ Features

- Conversational state machine — remembers where each user is in the flow, persisted in MongoDB
- Collects: name, age, city
- Schedules interviews: validates date (DD/MM/YYYY) and time (HH:MM 24h)
- Generates a ready-to-click **Google Calendar** link (no API key required)
- Saves each completed interview to MongoDB
- Input validation with helpful error messages at every step

---

## 📋 Conversation Flow

```
User sends any message
        │
        ▼
👋 "What's your full name?"
        │
        ▼
😊 "How old are you?"
        │
        ▼
📍 "Which city are you based in?"
        │
        ▼
🗓️ "Would you like to schedule an interview? (yes/no)"
       / \
      /   \
    yes    no
     │      │
     ▼      ▼
📅 "What date? (DD/MM/YYYY)"   👋 Goodbye
     │
     ▼
⏰ "What time? (HH:MM)"
     │
     ▼
✅ Confirmation + 📆 Google Calendar link
```

---

## 🗂️ Project Structure

```
whatsapp-interview-bot/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   └── interviewController.js # State machine & Twilio messaging
├── models/
│   ├── Interview.js           # Scheduled interview schema
│   └── Session.js             # Per-user conversation state schema
├── routes/
│   └── webhook.js             # POST /api/webhook
├── .env                       # Environment variables (git-ignored)
├── .gitignore
├── openapi.yaml               # OpenAPI 3.0 API documentation
├── package.json
└── server.js                  # Express app entry point
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| MongoDB Atlas account | Free tier works |
| Twilio account | Free trial works |
| ngrok | ≥ 3 |

### 1 — Clone and install

```bash
git clone https://github.com/<your-username>/whatsapp-interview-bot.git
cd whatsapp-interview-bot
npm install
```

### 2 — Configure environment variables

Create a `.env` file in the root (never commit this file):

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
PORT=3000
```

| Variable | Where to find it |
|---|---|
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) → Account Info |
| `TWILIO_AUTH_TOKEN` | Same page, click to reveal |
| `TWILIO_WHATSAPP_NUMBER` | Twilio Sandbox number (e.g. `whatsapp:+14155238886`) |
| `MONGODB_URI` | MongoDB Atlas → Clusters → Connect → Drivers |

### 3 — Start the development server

```bash
npm run dev
```

The server starts on `http://localhost:3000`.

### 4 — Expose with ngrok

In a second terminal:

```bash
ngrok http 3000
```

Copy the `Forwarding` HTTPS URL (e.g. `https://arrange-submitter-circulate.ngrok-free.dev`).

### 5 — Configure Twilio Sandbox

1. Go to [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Open **Sandbox Settings**
3. Set **"When a message comes in"** to:
   ```
   https://<your-ngrok-url>.ngrok-free.dev/api/webhook
   ```
4. Method: **POST**
5. Click **Save**

### 6 — Join the sandbox

From your WhatsApp, send the join code to the Twilio sandbox number:

```
join <your-sandbox-code>
```

Then send any message to start the interview flow. 🎉

---

## 🧪 Test the webhook manually

```bash
# Trigger the start of a conversation
curl -X POST http://localhost:3000/api/webhook \
  -d "Body=hello&From=whatsapp:+1234567890"

# Health check
curl http://localhost:3000/health
```

---

## 📖 API Documentation

Full OpenAPI 3.0 specification is available in [`openapi.yaml`](./openapi.yaml).

You can preview it at [editor.swagger.io](https://editor.swagger.io) — paste the contents of `openapi.yaml`.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/webhook` | Twilio webhook — receives WhatsApp messages |
| `GET` | `/health` | Server health check |

---

## 🗄️ Data Models

### `Interview`

| Field | Type | Description |
|---|---|---|
| `candidateName` | String | Collected from conversation |
| `candidatePhone` | String | E.164 phone number |
| `candidateAge` | String | Validated 16–99 |
| `candidateCity` | String | Self-reported city |
| `interviewDate` | Date | Parsed from DD/MM/YYYY input |
| `interviewTime` | String | HH:MM 24h format |
| `position` | String | `"To be defined"` (extend as needed) |
| `status` | String | `scheduled` \| `completed` \| `cancelled` |
| `calendarLink` | String | Google Calendar add-event URL |
| `createdAt` | Date | Auto-generated |

### `Session`

| Field | Type | Description |
|---|---|---|
| `phone` | String | Unique — one session per user |
| `step` | String | Current conversation step (see flow above) |
| `data` | Object | Accumulated `name`, `age`, `city`, `date`, `time` |
| `updatedAt` | Date | Last activity timestamp |

---

## ⚙️ Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload on changes) |
| `npm start` | Start without nodemon (production) |

---

## 🔒 Security Notes

- `.env` is git-ignored — **never commit credentials**
- Twilio validates webhook requests; consider adding [Twilio request validation](https://www.twilio.com/docs/usage/webhooks/webhooks-security) in production
- Rotate your Twilio Auth Token if it was ever exposed

---

## 🛣️ Roadmap / Ideas

- [ ] Add Twilio webhook signature validation middleware
- [ ] Let candidates choose a specific job position
- [ ] Admin dashboard to view/manage scheduled interviews
- [ ] Send reminder messages 24h before the interview
- [ ] Google Calendar API integration (add event to company calendar automatically)
- [ ] Multi-language support (EN/ES)

---

## 📄 License

ISC
