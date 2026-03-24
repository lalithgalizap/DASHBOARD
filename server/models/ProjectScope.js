const mongoose = require('mongoose');

const projectScopeSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true,
    unique: true
  },
  scope_included: {
    type: String,
    default: ''
  },
  scope_excluded: {
    type: String,
    default: ''
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProjectScope', projectScopeSchema);
