

## Tech Stack

- **Frontend**: React 18, Lucide Icons
- **Backend**: Node.js, Express
- **Database**: SQLite3
- **File Processing**: XLSX (Excel parsing)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Install root dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

## Running the Application

### Development Mode

Run both server and client concurrently:
```bash
npm run dev
```

Or run them separately:

**Server** (runs on port 5000):
```bash
npm run server
```

**Client** (runs on port 3000):
```bash
npm run client
```

The application will be available at `http://localhost:3000`

## Excel Import Format

Your Excel file should have the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| PROJECT | Project name | "Contact Graph" |
| PRI | Priority (P0-P3) | "P0" |
| STAGE | Stage | "Active", "Advance", "Incubate" |
| MCC | MCC value | "Internal" |
| SUMMARY | Project description | "Knowledge graph connecting..." |
| STATUS | Current status | "Active", "On-track", "Development" |
| CLIENTS | Client names | "Acme, Inc." |
| LINKS | Project URL | "https://..." |

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects (with optional filters)
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Metrics
- `GET /api/metrics` - Get dashboard metrics

### Events
- `GET /api/events` - Get upcoming events
- `POST /api/events` - Create new event

### Import
- `POST /api/import/excel` - Import projects from Excel file

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  priority TEXT,
  stage TEXT,
  mcc TEXT,
  summary TEXT,
  status TEXT,
  clients TEXT,
  links TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Metrics Table
```sql
CREATE TABLE metrics (
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
)
```

## Project Structure

```
DASH-TST/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── server/                # Node.js backend
│   ├── database.js       # SQLite setup
│   ├── index.js          # Express server
│   └── pmo.db           # SQLite database (auto-generated)
├── uploads/              # Temporary upload folder (auto-generated)
├── package.json
└── README.md
```

## Usage

1. **Import Data**: Click "Import Excel" button and upload your Excel file
2. **View Projects**: Browse projects in the table with real-time metrics
3. **Filter**: Use dropdown filters to narrow down projects
4. **Add Project**: Click "New Project" to create a new project
5. **Edit/Delete**: Use action buttons in the table to modify projects

## Performance Optimizations

- Efficient SQLite queries with proper indexing
- Lazy loading for large datasets
- Optimized React rendering with proper key usage
- Minimal re-renders using React hooks
- Compressed file uploads

## License

MIT
