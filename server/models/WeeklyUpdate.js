const mongoose = require('mongoose');

const weeklyUpdateSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true
  },
  project_name: {
    type: String,
    required: true
  },
  stage: String,
  week_date: {
    type: String,
    required: true
  },
  name: String,
  rag: String,
  update_text: String,
  next_steps: String,
  blockers: String,
  customer_engagement: String,
  milestone_achieved: String,
  momentum: String,
  traction: String,
  objective: String,
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

weeklyUpdateSchema.index({ project_id: 1, week_date: -1 });

module.exports = mongoose.model('WeeklyUpdate', weeklyUpdateSchema);
