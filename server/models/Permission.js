const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  permission_name: {
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

module.exports = mongoose.model('Permission', permissionSchema);
