const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  project_id: {
    type: String,
    required: true
  },
  metric_name: {
    type: String,
    required: true
  },
  metric_value: {
    type: Number,
    required: true
  },
  metric_date: {
    type: Date,
    default: Date.now
  },
  category: String,
  notes: String
}, {
  timestamps: true
});

metricSchema.index({ project_id: 1, metric_date: -1 });

module.exports = mongoose.model('Metric', metricSchema);
