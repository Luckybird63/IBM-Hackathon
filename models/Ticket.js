const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  complaint: {
    type: Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
  },
  category: {
    type: String,
    enum: ['billing', 'technical', 'service', 'other'],
    default: 'other',
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium',
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Registered', 'In Progress', 'Under Review', 'Resolved'],
    default: 'Registered',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  }
});

module.exports = mongoose.model('Ticket', TicketSchema);