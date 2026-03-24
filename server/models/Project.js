const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  priority: String,
  stage: String,
  status: {
    type: String,
    default: 'Active'
  },
  summary: String,
  clients: String,
  links: String,
  owner: String,
  vertical: String,
  region: String,
  sponsor: String,
  anchor_customer: String,
  created_at: Date,
  updated_at: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
