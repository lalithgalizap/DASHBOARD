const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  start_date: {
    type: Date,
    required: true
  },
  end_date: Date,
  event_type: String,
  location: String,
  attendees: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

eventSchema.index({ project_id: 1, start_date: 1 });

module.exports = mongoose.model('Event', eventSchema);
