# PMO Dashboard - Complete Runbook

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Models](#database-models)
5. [API Documentation](#api-documentation)
6. [Frontend Structure](#frontend-structure)
7. [Authentication & Authorization](#authentication--authorization)
8. [Environment Variables](#environment-variables)
9. [Installation & Setup](#installation--setup)
10. [Deployment Guide](#deployment-guide)
11. [Operations & Maintenance](#operations--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

PMO Dashboard is a comprehensive Project Management Office application for tracking projects, managing weekly updates, and handling project documents with Excel integration. It supports role-based access control with three user roles: Admin, Project Manager, and Viewer.

### Key Features
- **Project Management**: Create, edit, track projects with status, priority, stage
- **Document Management**: Upload and parse Excel files (RAID logs, project plans, etc.)
- **Weekly Updates**: Track project progress with weekly status updates
- **Portfolio View**: Aggregate metrics across all projects
- **User Management**: Role-based access with Admin controls
- **Self-Service Password Change**: Non-admin users can change their own passwords

---

## Tech Stack

### Backend
- **Runtime**: Node.js 18.x+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Password Hashing**: bcryptjs 3.0.3
- **File Uploads**: Multer 1.4.5-lts.1
- **Excel Processing**: xlsx 0.18.5
- **CORS**: cors 2.8.5
- **Environment**: dotenv 16.3.1

### Frontend
- **Framework**: React 18.x
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Build Tool**: Create React App

### Database
- **MongoDB** v4.4+ (local or Atlas)
- Collections: users, roles, permissions, rolepermissions, projects, projectscopes, events

---

## Architecture

```
DASHBOARD/
├── client/                    # React Frontend
│   ├── public/
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── contexts/         # React contexts (Auth)
│       ├── pages/            # Page-level components
│       ├── App.js            # Main app with routes
│       └── index.js          # Entry point
├── server/                   # Express Backend
│   ├── models/               # Mongoose schemas
│   ├── auth.js               # JWT auth middleware
│   ├── dbAdapter.js          # Database abstraction
│   ├── index.js              # Main server + API routes
│   ├── mongodb.js            # DB connection
│   └── uploads/              # Temp upload folder
├── project-documents/        # Excel files storage
├── project-closure-documents/# Closure docs storage
├── uploads/                  # Temp uploads
├── .env                      # Environment variables
├── package.json              # Root dependencies
└── setup-auth-only.js        # Auth setup script
```

### Request Flow
1. Client (React) → API Request → Express Server
2. Server → Auth Middleware (JWT verification)
3. Server → Route Handler → dbAdapter → MongoDB
4. MongoDB → dbAdapter → Route Handler → Client

---

## Database Models

### User
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  role_id: ObjectId (ref: Role),
  created_at: Date,
  updatedAt: Date
}
```

### Role
```javascript
{
  role_name: String (required, unique),
  description: String,
  created_at: Date,
  updatedAt: Date
}
```

### Permission
```javascript
{
  permission_name: String (required, unique),
  description: String,
  created_at: Date,
  updatedAt: Date
}
```

### RolePermission
```javascript
{
  role_id: ObjectId (ref: Role, required),
  permission_id: ObjectId (ref: Permission, required)
}
```

### Project
```javascript
{
  project_id: String (required, unique),
  name: String (required),
  priority: String,
  stage: String,
  status: String (default: 'Active'),
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
}
```

### ProjectScope
```javascript
{
  project_id: String (required),
  scope_included: String,
  scope_excluded: String,
  updated_at: Date
}
```

### Event
```javascript
{
  title: String (required),
  description: String,
  start_date: Date (required),
  end_date: Date,
  project_id: String,
  created_at: Date
}
```

---

## API Documentation

### Authentication

#### POST /api/auth/login
Login and receive JWT token.
**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role_id": "string",
    "role": "string",
    "role_name": "string",
    "permissions": ["view_dashboard", "manage_projects"]
  }
}
```

#### GET /api/auth/me
Get current authenticated user.
**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "role_id": "string",
    "role": "string",
    "role_name": "string",
    "permissions": ["view_dashboard"]
  }
}
```

#### POST /api/auth/change-password
Change password for non-admin users.
**Headers:** `Authorization: Bearer <token>`
**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Response:**
```json
{
  "message": "Password changed successfully"
}
```

---

### Projects

#### GET /api/projects
Get all projects with optional filters.
**Query Parameters:**
- `priority`: Filter by priority (Low, Medium, High)
- `stage`: Filter by stage
- `status`: Filter by status
- `client`: Filter by client name

**Response:**
```json
[
  {
    "id": "string",
    "project_id": "string",
    "name": "string",
    "priority": "string",
    "stage": "string",
    "status": "string",
    "summary": "string",
    "clients": "string",
    "created_at": "date"
  }
]
```

#### GET /api/projects/:id
Get single project by ID.

#### POST /api/projects
Create new project.
**Auth:** Requires `manage_projects` permission
**Request:**
```json
{
  "name": "string",
  "priority": "string",
  "stage": "string",
  "summary": "string",
  "clients": "string",
  "links": "string",
  "owner": "string",
  "vertical": "string",
  "region": "string",
  "sponsor": "string",
  "anchor_customer": "string"
}
```

#### PUT /api/projects/:id
Update project.
**Auth:** Requires `manage_projects` permission

#### PATCH /api/projects/:id/:field
Update single field (priority, stage, status).
**Auth:** Requires `manage_projects` permission
**URL:** `/api/projects/123/status`
**Request:**
```json
{
  "value": "On Track"
}
```

#### DELETE /api/projects/:id
Delete project and associated Excel file.
**Auth:** Requires `manage_projects` permission

#### POST /api/projects/upload-document
Upload Excel document for project.
**Auth:** Requires `manage_projects` permission
**Content-Type:** `multipart/form-data`
**Form Fields:**
- `document`: Excel file (.xlsx or .xls)
- `projectName`: Must match file name

#### GET /api/projects/:id/documents
Get parsed project documents data.
**Query:** `?projectName=<name>&t=<timestamp>`
**Response:** Parsed Excel data including:
- `projectCharter`
- `raidLog`
- `riskRegister`
- `projectPlan`
- `milestoneTracker`
- `stakeholderRegister`
- `raciMatrix`
- `governanceCadences`
- `changeManagement`
- `resourceManagement`

#### GET /api/projects/:id/scope
Get project scope.

#### PUT /api/projects/:id/scope
Update project scope.
**Request:**
```json
{
  "scope_included": "string",
  "scope_excluded": "string"
}
```

---

### Users (Admin Only)

#### GET /api/users
Get all users with roles.
**Auth:** Requires Admin role

#### POST /api/users
Create new user.
**Auth:** Requires Admin role
**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role_id": "string",
  "is_active": 1
}
```

#### PUT /api/users/:id
Update user.
**Auth:** Requires Admin role
**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role_id": "string",
  "is_active": 1
}
```

#### DELETE /api/users/:id
Delete user.
**Auth:** Requires Admin role

---

### Roles (Admin Only)

#### GET /api/roles
Get all roles with permissions.
**Auth:** Requires Admin role

#### POST /api/roles
Create new role.
**Auth:** Requires Admin role
**Request:**
```json
{
  "name": "string",
  "description": "string",
  "permission_ids": ["id1", "id2"]
}
```

#### PUT /api/roles/:id
Update role.
**Auth:** Requires Admin role

#### DELETE /api/roles/:id
Delete role.
**Auth:** Requires Admin role

#### GET /api/permissions
Get all available permissions.
**Auth:** Requires Admin role

---

### Metrics

#### GET /api/metrics
Get dashboard metrics.
**Response:**
```json
{
  "active_projects": 10,
  "total_clients": 5,
  "on_track": 8,
  "total_projects": 12,
  "completed_projects": 2
}
```

---

## Frontend Structure

### Pages

| Page | Route | Component | Access |
|------|-------|-----------|--------|
| Login | `/login` | Login.js | Public |
| Dashboard | `/` | Dashboard.js | view_dashboard permission |
| Project Detail | `/project/:id` | ProjectDetail.js | view_projects permission |
| Portfolio | `/portfolio` | Portfolio.js | view_projects permission |
| User Management | `/admin/users` | UserManagement.js | Admin only |
| Role Management | `/admin/roles` | RoleManagement.js | Admin only |

### Components

| Component | Purpose |
|-----------|---------|
| Header.js | Navigation, user info, logout, change password button |
| ProtectedRoute.js | Route guard for authenticated users |
| ProjectModal.js | Create/Edit project form with client multi-select |
| ExcelUploadModal.js | Upload project Excel documents |
| ProjectDashboard.js | Metrics display from Excel data |
| ProjectDocuments.js | Tabbed document viewer |
| PortfolioMetrics.js | Portfolio-level aggregated metrics |
| ChangePasswordModal.js | Self-service password change |
| ProjectsTable.js | Project listing with inline editing |
| DetailsModal.js | Project details editor |
| ImportModal.js | Bulk import from Excel |

### Contexts

| Context | Purpose |
|---------|---------|
| AuthContext.js | Authentication state, user info, permissions, isAdmin check |

---

## Authentication & Authorization

### JWT Authentication
- Token generated on login with 24-hour expiry
- Token contains: `id`, `username`, `email`, `role_id`
- Sent in header: `Authorization: Bearer <token>`
- Middleware `authenticate()` validates token

### Authorization Levels

#### Admin
- Full system access
- Can access `/admin/*` routes
- Can manage users, roles, permissions
- Can upload project documents
- Cannot use self-service password change (must use User Management)

#### Project Manager
- View dashboard, projects, portfolio
- Manage projects (create, edit, delete)
- Manage weekly updates
- Upload project documents
- Can change own password via self-service

#### Viewer
- View dashboard, projects, portfolio, updates
- Read-only access
- Can change own password via self-service

### Permission System
Permissions are stored as: `{action}_{resource}`
- `view_dashboard`
- `view_projects`
- `manage_projects`
- `view_updates`
- `manage_updates`
- `manage_users`
- `manage_import`

---

## Environment Variables

Create `.env` file in root directory:

```env
# MongoDB Configuration
# Local: mongodb://localhost:27017/pmo_db
# Production with auth: mongodb://user:pass@localhost:27017/pmo_db
# Atlas: mongodb+srv://user:pass@cluster.mongodb.net/pmo_db
MONGODB_URI=mongodb://localhost:27017/pmo_db

# Server Configuration
PORT=5000

# JWT Secret (generate strong secret for production)
JWT_SECRET=your-secret-key-change-this-in-production

# Node Environment
# Options: development, production
NODE_ENV=development
```

---

## Installation & Setup

### Prerequisites
- Node.js v18.x or higher
- MongoDB v4.4 or higher
- npm or yarn
- Git

### Local Development Setup

1. **Clone repository**
   ```bash
   cd DASHBOARD
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client && npm install && cd ..
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start MongoDB**
   ```bash
   # Windows
   mongod
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

6. **Initialize authentication data**
   ```bash
   node setup-auth-only.js
   ```
   This creates:
   - Admin role with full permissions
   - Project Manager role with project management permissions
   - Viewer role with read-only permissions
   - Admin user: `admin` / `admin123`

7. **Start development server**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

---

## Deployment Guide

### AWS EC2 Deployment

#### 1. Launch EC2 Instance
- **AMI:** Ubuntu Server 22.04 LTS
- **Instance Type:** t2.micro (Free Tier) or t3.small
- **Security Group:**
  - SSH (22) - Your IP
  - HTTP (80) - Anywhere
  - HTTPS (443) - Anywhere
  - Custom TCP (3000) - Anywhere (dev)
  - Custom TCP (5000) - Anywhere (API)

#### 2. SSH into Instance
```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # v18.x
npm --version

# Install Git
sudo apt install git -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 4. Clone and Setup Application
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/DASHBOARD

# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env
cd server
nano .env
```

Add to `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pmo_dashboard
JWT_SECRET=your-production-secret-key
NODE_ENV=production
```

#### 5. Build and Start
```bash
# Build React app
cd client
npm run build

# Go back and setup auth
cd ..
node setup-auth-only.js

# Start backend with PM2
cd server
pm2 start index.js --name "pmo-api"
pm2 save
pm2 startup
# Run the command PM2 outputs
```

#### 6. Configure Nginx
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/pmo-dashboard
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;

    location / {
        root /home/ubuntu/YOUR_REPO/DASHBOARD/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. Access Application
- Open browser: `http://YOUR_EC2_IP`
- Login: `admin` / `admin123`

---

## Operations & Maintenance

### PM2 Commands
```bash
# View logs
pm2 logs pmo-api

# Restart app
pm2 restart pmo-api

# Stop app
pm2 stop pmo-api

# Monitor
pm2 monit
```

### Nginx Commands
```bash
# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### MongoDB Commands
```bash
# Check status
sudo systemctl status mongod

# Restart
sudo systemctl restart mongod

# Shell access
mongosh
```

### Updating Application
```bash
cd ~/YOUR_REPO/DASHBOARD
git pull origin main
npm install
cd client && npm install && npm run build
cd ../server
pm2 restart pmo-api
```

### Backup MongoDB
```bash
mongodump --db pmo_dashboard --out /backup/$(date +%Y%m%d)
```

### Restore MongoDB
```bash
mongorestore --db pmo_dashboard /backup/YYYYMMDD/pmo_dashboard
```

---

## Troubleshooting

### MongoDB Connection Issues
- Check MongoDB is running: `sudo systemctl status mongod`
- Verify connection string in `.env`
- Check firewall allows port 27017

### Application Won't Start
- Check Node.js version: `node --version` (needs v18+)
- Check all dependencies installed: `npm install`
- Check `.env` file exists and is configured
- Check port not in use: `sudo lsof -i :5000`

### Nginx 502 Error
- Check backend is running: `pm2 status`
- Check Nginx config: `sudo nginx -t`
- Check backend logs: `pm2 logs pmo-api`

### Permission Denied Errors
- Verify JWT token is valid
- Check user role has required permissions
- Admin routes require Admin role specifically

### File Upload Issues
- Check `project-documents/` folder exists and has write permissions
- Verify file name matches project name exactly
- File must be .xlsx or .xls format

### Password Change Not Working
- Non-admin users only can use self-service
- Current password must be correct
- New password must be at least 6 characters

---

## Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@example.com`

**Important:** Change default password after first login!

---

## Support

For issues and questions:
1. Check logs: `pm2 logs` and browser console
2. Verify environment variables
3. Check MongoDB connection
4. Review this runbook

---

## License

MIT
