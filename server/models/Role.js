const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  role_name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);
