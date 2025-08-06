const express = require('express');
const auth = require('../middleware/auth');
const Complaint = require('./routes/models/Complaint');
const Ticket = require('./routes/models/Ticket');
const User = require('./routes/models/User');

const router = express.Router();

// AI Module placeholder for categorization and prioritization
function aiCategorizeAndPrioritize(description) {
  // Real implementation uses NLP/ML models
  description = description.toLowerCase();
  let category = 'other';
  if(description.includes('billing')) category = 'billing';
  else if(description.includes('tech') || description.includes('error')) category = 'technical';
  else if(description.includes('service')) category = 'service';
  
  let priority = 'medium';
  if(description.includes('urgent') || description.includes('immediately') || description.includes('outage')) {
    priority = 'urgent';
  } else if(description.includes('slow') || description.includes('delay')) {
    priority = 'high';
  }
  
  return { category, priority };
}

// POST: Log Complaint via chatbot or user interface
router.post('/', auth, async (req, res) => {
  try {
    const { description } = req.body;

    if(!description) return res.status(400).json({ msg: 'Description is required' });

    // Save complaint
    const complaint = new Complaint({
      user: req.user.id,
      description,
      chatbotResolved: false
    });
    await complaint.save();

    // AI categorization and prioritization
    const { category, priority } = aiCategorizeAndPrioritize(description);

    // Create ticket
    const ticket = new Ticket({
      complaint: complaint._id,
      category,
      priority,
      status: 'Registered'
    });

    await ticket.save();

    // Optionally notify admin or assign agent (see next steps)

    res.json({ complaint, ticket });

  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET: Get all complaints for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// GET: Get complaint + ticket + status by complaintId for user/admin
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if(!complaint) return res.status(404).json({ msg: 'Complaint not found' });

    // Authorization: user can only access their complaints or admin
    if(complaint.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

    const ticket = await Ticket.findOne({ complaint: complaint._id });

    res.json({ complaint, ticket });
  } catch(err) {
    console.error(err.message);
    if(err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;