const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    step: {
        type: String,
        enum: [
            'awaiting_name',
            'awaiting_age',
            'awaiting_city',
            'awaiting_interview_choice',
            'awaiting_date',
            'awaiting_time',
            'done'
        ],
        default: 'awaiting_name'
    },
    data: {
        name: String,
        age: String,
        city: String,
        date: String, // DD/MM/YYYY
        time: String  // HH:MM
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
