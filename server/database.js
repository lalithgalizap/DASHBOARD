const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'pmo.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    priority TEXT,
    stage TEXT,
    mcc TEXT,
    summary TEXT,
    status TEXT,
    clients TEXT,
    links TEXT,
    owner TEXT,
    vertical TEXT,
    region TEXT,
    sponsor TEXT,
    anchor_customer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    tag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    active_initiatives INTEGER DEFAULT 0,
    paused_initiatives INTEGER DEFAULT 0,
    incubate_initiatives INTEGER DEFAULT 0,
    pr_projects INTEGER DEFAULT 0,
    on_track INTEGER DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    budget_expended INTEGER DEFAULT 0,
    budget_recommended INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS weekly_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    project_name TEXT NOT NULL,
    stage TEXT,
    week_date TEXT NOT NULL,
    name TEXT,
    rag TEXT DEFAULT 'None',
    update_text TEXT,
    next_steps TEXT,
    blockers TEXT,
    customer_engagement TEXT,
    milestone_achieved TEXT,
    momentum TEXT DEFAULT 'Select',
    traction TEXT,
    objective TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  )`);

  db.get("SELECT COUNT(*) as count FROM metrics", (err, row) => {
    if (row.count === 0) {
      db.run(`INSERT INTO metrics (
        active_initiatives, paused_initiatives, incubate_initiatives,
        pr_projects, on_track, total_projects,
        budget_expended, budget_recommended
      ) VALUES (17, 0, 0, 3, 2, 17, 7, 0)`);
    }
  });

  const defaultPermissions = [
    { name: 'view_dashboard', description: 'View main dashboard', resource: 'dashboard', action: 'view' },
    { name: 'view_projects', description: 'View projects page', resource: 'projects', action: 'view' },
    { name: 'manage_projects', description: 'Create, edit, delete projects', resource: 'projects', action: 'manage' },
    { name: 'view_updates', description: 'View weekly updates', resource: 'updates', action: 'view' },
    { name: 'manage_updates', description: 'Manage weekly updates', resource: 'updates', action: 'manage' },
    { name: 'view_documents', description: 'View RAID documents', resource: 'documents', action: 'view' },
    { name: 'manage_users', description: 'Manage users', resource: 'users', action: 'manage' },
    { name: 'manage_roles', description: 'Manage roles and permissions', resource: 'roles', action: 'manage' },
    { name: 'import_excel', description: 'Import Excel files', resource: 'import', action: 'manage' }
  ];

  defaultPermissions.forEach(perm => {
    db.run(
      `INSERT OR IGNORE INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)`,
      [perm.name, perm.description, perm.resource, perm.action]
    );
  });

  db.run(`INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`,
    ['Admin', 'Full system access - can manage everything']);
  db.run(`INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`,
    ['Manager', 'Can view and manage projects and updates']);
  db.run(`INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`,
    ['Viewer', 'Read-only access to dashboard and projects']);

  db.get("SELECT id FROM roles WHERE name = 'Admin'", (err, adminRole) => {
    if (adminRole) {
      db.all("SELECT id FROM permissions", (err, permissions) => {
        permissions.forEach(perm => {
          db.run(
            `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [adminRole.id, perm.id]
          );
        });
      });
    }
  });

  db.get("SELECT id FROM roles WHERE name = 'Manager'", (err, managerRole) => {
    if (managerRole) {
      const managerPerms = ['view_dashboard', 'view_projects', 'manage_projects', 'view_updates', 'manage_updates', 'view_documents', 'import_excel'];
      managerPerms.forEach(permName => {
        db.get("SELECT id FROM permissions WHERE name = ?", [permName], (err, perm) => {
          if (perm) {
            db.run(
              `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
              [managerRole.id, perm.id]
            );
          }
        });
      });
    }
  });

  db.get("SELECT id FROM roles WHERE name = 'Viewer'", (err, viewerRole) => {
    if (viewerRole) {
      const viewerPerms = ['view_dashboard', 'view_projects', 'view_updates', 'view_documents'];
      viewerPerms.forEach(permName => {
        db.get("SELECT id FROM permissions WHERE name = ?", [permName], (err, perm) => {
          if (perm) {
            db.run(
              `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
              [viewerRole.id, perm.id]
            );
          }
        });
      });
    }
  });

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.get("SELECT id FROM roles WHERE name = 'Admin'", (err, adminRole) => {
        if (adminRole) {
          db.run(
            `INSERT INTO users (username, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)`,
            ['admin', 'admin@pmo.local', hashedPassword, adminRole.id, 1]
          );
        }
      });
    }
  });
});

module.exports = db;
