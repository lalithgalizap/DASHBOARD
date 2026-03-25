const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_db';

// Define Project schema
const projectSchema = new mongoose.Schema({
  project_id: String,
  name: String,
  priority: String,
  stage: String,
  summary: String,
  status: String,
  clients: String,
  links: String,
  owner: String,
  vertical: String,
  region: String,
  sponsor: String,
  anchor_customer: String,
  mcc: String
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

async function migrateStatuses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Status mapping from old to new
    const statusMapping = {
      'Active': 'On Track',
      'On-Hold': 'On Hold',
      'Completed': 'Completed',
      'On-track': 'On Track',
      'On Track': 'On Track',  // Keep as is
      'Development': 'On Track',
      'Complete': 'Completed',
      'Yet to Start': 'Yet to Start',  // Keep as is
      'Delayed': 'Delayed',  // Keep as is
      'Cancelled': 'Cancelled'  // Keep as is
    };

    console.log('\n=== Migrating Project Statuses ===\n');

    // Get all projects
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects to check`);

    let updatedCount = 0;

    for (const project of projects) {
      const oldStatus = project.status;
      const newStatus = statusMapping[oldStatus];

      if (newStatus && newStatus !== oldStatus) {
        await Project.updateOne(
          { _id: project._id },
          { $set: { status: newStatus } }
        );
        console.log(`✓ Updated "${project.name}": "${oldStatus}" → "${newStatus}"`);
        updatedCount++;
      } else if (!newStatus && oldStatus) {
        // If status doesn't match any mapping, set to default
        await Project.updateOne(
          { _id: project._id },
          { $set: { status: 'Yet to Start' } }
        );
        console.log(`✓ Updated "${project.name}": "${oldStatus}" → "Yet to Start" (default)`);
        updatedCount++;
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Total projects: ${projects.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Unchanged: ${projects.length - updatedCount}`);

    // Show current status distribution
    console.log('\n=== Current Status Distribution ===');
    const statusCounts = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statusCounts.forEach(item => {
      console.log(`${item._id || 'No Status'}: ${item.count}`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating statuses:', error);
    process.exit(1);
  }
}

migrateStatuses();
