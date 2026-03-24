# PMO Dashboard

A comprehensive Project Management Office (PMO) dashboard application for tracking projects, weekly updates, and project documents.

## Tech Stack

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **bcrypt** for password hashing
- **XLSX** for Excel file processing
- **Multer** for file uploads

### Frontend
- **React** 18
- **React Router** for navigation
- **Axios** for API calls
- **Lucide React** for icons

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Manager, Viewer)
- Permission-based feature access

### Project Management
- Create, read, update, delete projects
- Inline editing for priority, stage, and status
- Project filtering by priority, stage, status, and client
- Project detail pages with comprehensive information

### Weekly Updates
- Create and manage weekly updates per project
- Filter by project and week
- Timeline view on project detail pages
- RAG status tracking

### Document Management
- Upload project-specific Excel documents
- Automatic document parsing (RAID logs, risk registers, project plans, etc.)
- File validation (must match project name)
- Automatic cleanup on project deletion

### User Management (Admin only)
- Create, edit, delete users
- Assign roles to users
- View user permissions

### Role Management (Admin only)
- Create, edit, delete roles
- Assign permissions to roles
- Predefined roles: Admin, Manager, Viewer

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   cd DASHBOARD
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Run the setup script:
     ```bash
     setup-mongodb.bat
     ```

4. **Configure environment variables**
   - Create a `.env` file in the root directory:
     ```
     MONGODB_URI=mongodb://localhost:27017/pmo_db
     JWT_SECRET=your-secret-key-change-this-in-production
     PORT=5000
     ```

5. **Start the application**
   ```bash
   npm run dev
   ```
   This will start both the backend (port 5000) and frontend (port 3000)

## Project Structure

```
DASHBOARD/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # Reusable components
│       ├── contexts/      # React contexts (Auth)
│       ├── pages/         # Page components
│       └── App.js
├── server/                # Express backend
│   ├── models/           # Mongoose models
│   ├── auth.js           # Authentication middleware
│   ├── dbAdapter.js      # Database abstraction layer
│   ├── index.js          # Main server file
│   └── mongodb.js        # MongoDB connection
├── project-documents/    # Uploaded Excel files (gitignored)
├── uploads/             # Temporary upload folder (gitignored)
└── package.json
```

## Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Important:** Change the default password after first login!

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `PATCH /api/projects/:id/:field` - Update single field
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/upload-document` - Upload Excel document
- `GET /api/projects/:id/documents` - Get project documents

### Weekly Updates
- `GET /api/weekly-updates` - Get all updates
- `POST /api/weekly-updates` - Create update
- `PUT /api/weekly-updates/:id` - Update weekly update
- `DELETE /api/weekly-updates/:id` - Delete update

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Roles (Admin only)
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `GET /api/permissions` - Get all permissions

## Excel Document Upload

### Requirements
- File must be in `.xlsx` or `.xls` format
- File name must exactly match the project name
- Only Admins and users with `manage_projects` permission can upload

### Supported Sheets
- RAID Log
- Risk Register
- RAID Dashboard
- Project Cover Sheet
- Project Plan
- Milestone Tracker
- Stakeholder Register
- RACI Matrix
- Resource Management Plan
- Resource Availability
- Governance & Cadences
- Change Management Plan

### File Management
- Files are stored in `project-documents/` folder
- Uploading a new file with the same project name replaces the old one
- Files are automatically deleted when the project is deleted

## Permissions

### Admin
- Full system access
- All permissions enabled

### Manager
- View dashboard, projects, updates, documents
- Manage projects and updates
- Import Excel files

### Viewer
- View dashboard, projects, updates, documents
- Read-only access

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Backend Only
```bash
npm run server
```

### Running Frontend Only
```bash
npm run client
```

### Building for Production
```bash
cd client
npm run build
```

## Database

### MongoDB Collections
- `users` - User accounts
- `roles` - User roles
- `permissions` - System permissions
- `rolepermissions` - Role-permission mappings
- `projects` - Project information
- `weeklyupdates` - Weekly project updates
- `projectscopes` - Project scope details
- `events` - Calendar events

### Seeding Data
```bash
node server/seed.js
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Change port in `client/package.json`

### File Upload Issues
- Check `project-documents/` folder exists
- Verify file name matches project name exactly
- Ensure user has proper permissions

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
