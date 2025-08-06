const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const chatbotRoute = require('./routes/chatbot');

dotenv.config();
const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// Routes
app.use('/api/chat', chatbotRoute);

app.listen(5000, () => console.log("Server running on port 5000"));
