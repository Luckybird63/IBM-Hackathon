const express = require('express');
const auth = require('../middleware/auth');
const Ticket = require('./routes/models/Ticket');
const Complaint = require('./routes/models/Complaint');
const User = require('./routes/models/User');
const router = express.Router();

// Utility to get agent with lowest workload
async function getLeastBusyAgent() {
  const agents = await User.find({ role: 'agent' });

  const agentWorkloads = await Promise.all(agents.map(async agent => {
    const ongoingTicketsCount = await Ticket.countDocuments({ assignedTo: agent._id, status: { $in: ['Registered', 'In Progress', 'Under Review'] } });
    return { agent, workload: ongoingTicketsCount };
  }));

  agentWorkloads.sort((a,b) => a.workload - b.workload);
  return agentWorkloads.length > 0 ? agentWorkloads[0].agent : null;
}

// Assign ticket (Admin only)
router.put('/:ticketId/assign', auth, async (req, res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });

    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId);
    if(!ticket) return res.status(404).json({ msg: 'Ticket not found' });

    const agent = await getLeastBusyAgent();
    if(!agent) return res.status(400).json({ msg: 'No agents available for assignment' });

    ticket.assignedTo = agent._id;
    ticket.status = 'In Progress';
    await ticket.save();

    res.json({ msg: `Ticket assigned to agent ${agent.name}`, ticket });

  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all tickets (Admin)
router.get('/', auth, async (req, res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ msg: 'Forbidden' });

    // Populate user and assignedTo info
    const tickets = await Ticket.find()
      .populate('complaint')
      .populate('assignedTo', 'name email')
      .sort({ priority: -1, createdAt: -1 });

    res.json(tickets);

  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// User view tickets
router.get('/user', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate({
        path: 'complaint',
        match: { user: req.user.id },
      })
      .populate('assignedTo', 'name email');

    // Filter tickets with complaint for the user
    const filteredTickets = tickets.filter(ticket => ticket.complaint !== null);

    res.json(filteredTickets);

  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update ticket status (Agent/Admin)
router.put('/:ticketId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if(!['Registered', 'In Progress', 'Under Review', 'Resolved'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    const ticket = await Ticket.findById(req.params.ticketId);
    if(!ticket) return res.status(404).json({ msg: 'Ticket not found' });

    // Authorization: admin or assigned agent
    if(req.user.role !== 'admin' && (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user.id)) {
      return res.status(403).json({ msg: 'Forbidden' });
    }

    ticket.status = status;
    if(status === 'Resolved') {
      ticket.resolvedAt = Date.now();
    }
    await ticket.save();

    // Notify user via socket.io (real-time update)
    const io = req.app.get('socketio');
    io.to(ticket.complaint.toString()).emit('ticketStatusUpdated', { ticketId: ticket._id, status: ticket.status });

    res.json(ticket);

  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;