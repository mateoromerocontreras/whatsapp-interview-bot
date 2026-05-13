const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
    candidateName: String,
    candidatePhone: String,
    candidateAge: String,
    candidateCity: String,
    interviewDate: Date,
    interviewTime: String,
    position: String,
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    calendarLink: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Interview', interviewSchema);