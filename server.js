const dotenv = require('dotenv');
dotenv.config(); // ← must be first so all modules see process.env

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
db();

// Routes
app.use('/api', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ message: 'Bot is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});