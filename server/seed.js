const db = require('./database');

const sampleProjects = [
  {
    name: 'Contact Graph',
    priority: 'P0',
    stage: 'Advance',
    mcc: 'Internal',
    summary: 'Knowledge graph connecting enterprise data across CRM, RAVE pathology and clinical data',
    status: 'Active',
    clients: 'Acme, Pharma.co',
    links: ''
  },
  {
    name: 'TextBot MCP (Community AI Training Platform)',
    priority: 'P0',
    stage: 'Advance',
    mcc: 'Acquisition',
    summary: 'AI training platform as an initiative to increase usage that generates sessions and end user heads into tenant-some LLM, machine learning, scaling AI infrastructure',
    status: 'Active',
    clients: 'Clients: Acme, Inc.',
    links: ''
  },
  {
    name: 'Voca.AI — Realtime Call Routing',
    priority: 'P0',
    stage: 'Advance',
    mcc: 'Maintain',
    summary: 'Voca AI as an AI-native enterprise phone system that intelligently routes calls in real-time, generates high-order leads and automatically resolves real-time capabilities',
    status: 'Active',
    clients: 'Clients: ABC, Inc.',
    links: ''
  },
  {
    name: 'AI Secure-Master',
    priority: 'P1',
    stage: 'Advance',
    mcc: 'Internal',
    summary: 'An enterprise open delivery service MVP providing new features',
    status: 'On-track',
    clients: '',
    links: ''
  },
  {
    name: 'Biowrx.io',
    priority: 'P1',
    stage: 'Scale',
    mcc: 'Maintain',
    summary: 'Biowrx is a centralized digital reserve-care platform that documents best outcomes and optimizes customer service',
    status: 'Active',
    clients: '',
    links: ''
  },
  {
    name: 'Cerebral Intelligence',
    priority: 'P1',
    stage: 'Incubate',
    mcc: 'Internal',
    summary: 'Internal intelligence as knowledge repository of PMC data collection in progress',
    status: 'Development',
    clients: 'Clients: zen.com',
    links: ''
  },
  {
    name: 'Restaurant LMS',
    priority: 'P1',
    stage: 'Incubate',
    mcc: 'Maintain',
    summary: 'Learning management system for restaurant operations',
    status: 'Complete',
    clients: '',
    links: ''
  },
  {
    name: 'Zoomify Academy',
    priority: 'P1',
    stage: 'Scale',
    mcc: 'Internal',
    summary: 'Education low-code no-code platform to upskill 2K+ employees on AI capabilities',
    status: 'Active',
    clients: 'Clients: company',
    links: ''
  }
];

const sampleEvents = [
  { title: 'NHLV', date: 'AI Smart Copilot', tag: 'Due Mar 17' },
  { title: 'RMS', date: 'Laundry Copilot', tag: 'Wed Mar 18' },
  { title: 'RMS', date: 'Laundry Copilot', tag: 'Wed Mar 18' }
];

console.log('Seeding database with sample data...');

const stmt = db.prepare(
  `INSERT INTO projects (name, priority, stage, mcc, summary, status, clients, links) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

sampleProjects.forEach(project => {
  stmt.run(
    project.name,
    project.priority,
    project.stage,
    project.mcc,
    project.summary,
    project.status,
    project.clients,
    project.links
  );
});

stmt.finalize();

const eventStmt = db.prepare('INSERT INTO events (title, date, tag) VALUES (?, ?, ?)');

sampleEvents.forEach(event => {
  eventStmt.run(event.title, event.date, event.tag);
});

eventStmt.finalize(() => {
  console.log('Database seeded successfully!');
  console.log(`Added ${sampleProjects.length} projects and ${sampleEvents.length} events`);
  process.exit(0);
});
