const db = require('./database');

const sampleUpdates = [
  {
    project_id: 1,
    project_name: 'Contact Graph',
    stage: 'Advance',
    week_date: '2026-W11',
    name: 'Sarah Johnson',
    update_text: 'Jumped into Biowrx to fill out 30-60m-90d roadmap. Also prefers where enterprise structure session connecting and our Contact Graph "environment") is an CRM conceptual view on 2 view academic production modeling.',
    next_steps: 'Scoping work on building a contact graph to top of the funnel',
    blockers: 'Scaling a new Biowrx roadmap to identify a limited number of raw data and started for claims and analysis.',
    customer_engagement: 'Jazz Pharma, BMS',
    traction: 'Accelerating'
  },
  {
    project_id: 2,
    project_name: 'TextBot MCP (Community AI Training Platform)',
    stage: 'Advance',
    week_date: '2026-W11',
    name: 'Michael Chen',
    update_text: 'development in progress',
    next_steps: 'decided development and ramping demo. The team is working on a new feature for Xoomlys to confirm their current workflow. We are also exploring the expected MCP integration that workflow and ensuring any other resources. Pricing model needs to be discussed.',
    blockers: 'Complex workflows',
    customer_engagement: '',
    traction: ''
  },
  {
    project_id: 8,
    project_name: 'Zoomify Academy',
    stage: 'Scale',
    week_date: '2026-W11',
    name: 'Emily Rodriguez',
    update_text: 'Signed an engagement plan with HR',
    next_steps: 'Implement a plan for onboarding interns and junior devs',
    blockers: '',
    customer_engagement: '',
    traction: 'Accelerating'
  },
  {
    project_id: 7,
    project_name: 'Restaurant LMS',
    stage: 'Incubate',
    week_date: '2026-W10',
    name: 'David Kim',
    update_text: '',
    next_steps: '',
    blockers: '',
    customer_engagement: '',
    traction: '',
    objective: ''
  }
];

console.log('Seeding weekly updates...');

const stmt = db.prepare(
  `INSERT INTO weekly_updates (project_id, project_name, stage, week_date, name, update_text, next_steps, blockers, customer_engagement, traction) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

sampleUpdates.forEach(update => {
  stmt.run(
    update.project_id,
    update.project_name,
    update.stage,
    update.week_date,
    update.name,
    update.update_text,
    update.next_steps,
    update.blockers,
    update.customer_engagement,
    update.traction
  );
});

stmt.finalize(() => {
  console.log(`Weekly updates seeded successfully! Added ${sampleUpdates.length} updates`);
  process.exit(0);
});
