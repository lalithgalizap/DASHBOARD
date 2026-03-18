# PMO Dashboard - Quick Setup Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

Open terminal in the project root and run:

```bash
npm install
```

Then install client dependencies:

```bash
cd client
npm install
cd ..
```

Or use the convenience command:

```bash
npm run install-all
```

### Step 2: Seed Sample Data (Optional)

To populate the database with sample projects:

```bash
node server/seed.js
```

### Step 3: Start the Application

Run both server and client:

```bash
npm run dev
```

The application will open at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📊 Using the Dashboard

### Import Excel Data

1. Click the **"Import Excel"** button in the top-right corner
2. Upload your Excel file with the following columns:
   - PROJECT, PRI, STAGE, MCC, SUMMARY, STATUS, CLIENTS, LINKS
3. The data will be imported and displayed immediately

### Manage Projects

- **Add New**: Click "New Project" button
- **Edit**: Click the edit icon (pencil) in the Actions column
- **Delete**: Click the delete icon (trash) in the Actions column
- **Filter**: Use the dropdown filters for Priority, Stage, and Status

### View Metrics

The dashboard automatically calculates and displays:
- Active Initiatives
- PR Projects (Priority projects)
- On Track status
- Budget information

## 📁 Excel File Format

Create an Excel file (.xlsx or .xls) with these columns:

| Column | Description | Example Values |
|--------|-------------|----------------|
| PROJECT | Project name | "Contact Graph" |
| PRI | Priority | P0, P1, P2, P3 |
| STAGE | Current stage | Active, Advance, Incubate, Maintain, Scale |
| MCC | MCC value | Internal, Acquisition, Maintain |
| SUMMARY | Description | "Knowledge graph connecting..." |
| STATUS | Project status | Active, On-track, Development, Complete, On-hold |
| CLIENTS | Client names | "Acme, Inc." |
| LINKS | Project URL | "https://example.com" |

## 🛠️ Troubleshooting

### Port Already in Use

If port 3000 or 5000 is already in use:

**Change Backend Port:**
Edit `server/index.js` line 7:
```javascript
const PORT = process.env.PORT || 5001; // Change to 5001
```

**Change Frontend Port:**
Set environment variable before starting:
```bash
set PORT=3001 && npm run client
```

### Database Issues

Delete the database and restart:
```bash
del server\pmo.db
npm run server
```

### Module Not Found

Reinstall dependencies:
```bash
del /s /q node_modules
del package-lock.json
npm install
cd client
del /s /q node_modules
del package-lock.json
npm install
```

## 🎨 Customization

### Change Theme Colors

Edit `client/src/index.css` and component CSS files to customize colors.

### Add New Fields

1. Update database schema in `server/database.js`
2. Add API endpoints in `server/index.js`
3. Update React components in `client/src/components/`

## 📝 API Endpoints

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/metrics` - Get dashboard metrics
- `GET /api/events` - Get upcoming events
- `POST /api/import/excel` - Import Excel file

## 🔒 Production Deployment

For production:

1. Build the React app:
```bash
cd client
npm run build
```

2. Serve the build folder with Express
3. Use environment variables for configuration
4. Add authentication middleware
5. Use a production database (PostgreSQL, MySQL)

## 📞 Support

Check the main README.md for detailed documentation.
