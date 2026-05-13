const express = require('express');
const router = express.Router();
const { handleIncomingMessage } = require('../controllers/interviewController');

// Webhook endpoint for receiving messages
router.post('/webhook', handleIncomingMessage);

module.exports = router;