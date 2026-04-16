import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus } from 'lucide-react';
import './ProjectsTable.css';

function ProjectsTable({ projects, allProjects, filters, onFilterChange, onEdit, onDelete, onNewProject, loading, onUpdateField, canAddDelete, canEdit, canImport }) {
  const navigate = useNavigate();
  const statuses = ['Yet to Start', 'On Track', 'On Hold', 'Delayed', 'Completed', 'Cancelled'];
  
  const allStatuses = ['All', ...statuses];
  
  // Extract unique clients from all projects (not filtered, case-insensitive)
  const getUniqueClients = () => {
    const clientsMap = new Map();
    const projectsToUse = allProjects || projects;
    projectsToUse.forEach(project => {
      if (project.clients) {
        const projectClients = project.clients.split(',').map(c => c.trim());
        projectClients.forEach(client => {
          if (client) {
            const lowerClient = client.toLowerCase();
            // Store the first occurrence's original casing
            if (!clientsMap.has(lowerClient)) {
              clientsMap.set(lowerClient, client);
            }
          }
        });
      }
    });
    return Array.from(clientsMap.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  };
  
  const uniqueClients = getUniqueClients();
  const allClients = ['All', ...uniqueClients];

  const getStatusColor = (status) => {
    const colors = {
      'Yet to Start': '#9ca3af',
      'On Track': '#10b981',
      'On Hold': '#f59e0b',
      'Delayed': '#ef4444',
      'Completed': '#6b7280',
      'Cancelled': '#71717a'
    };
    return colors[status] || '#71717a';
  };

  const getStatusCounts = () => {
    const allProjects = projects;
    return {
      all: allProjects.length,
      yetToStart: allProjects.filter(p => p.status === 'Yet to Start').length,
      onTrack: allProjects.filter(p => p.status === 'On Track').length,
      onHold: allProjects.filter(p => p.status === 'On Hold').length,
      delayed: allProjects.filter(p => p.status === 'Delayed').length,
      completed: allProjects.filter(p => p.status === 'Completed').length,
      cancelled: allProjects.filter(p => p.status === 'Cancelled').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="projects-section">
      <div className="projects-header">
        <div className="filters">
          <button 
            className={`filter-btn ${filters.status === 'All' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'All'})}
          >
            All <span className="count">{statusCounts.all}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'Yet to Start' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Yet to Start'})}
          >
            Yet to Start <span className="count">{statusCounts.yetToStart}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'On Track' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'On Track'})}
          >
            On Track <span className="count">{statusCounts.onTrack}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'On Hold' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'On Hold'})}
          >
            On Hold <span className="count">{statusCounts.onHold}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'Delayed' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Delayed'})}
          >
            Delayed <span className="count">{statusCounts.delayed}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'Completed' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Completed'})}
          >
            Completed <span className="count">{statusCounts.completed}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'Cancelled' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Cancelled'})}
          >
            Cancelled <span className="count">{statusCounts.cancelled}</span>
          </button>
        </div>
        
        <div className="filter-dropdowns">
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({...filters, search: e.target.value})}
            className="search-input"
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px',
              flex: '1'
            }}
          />
          <select 
            value={filters.status} 
            onChange={(e) => onFilterChange({...filters, status: e.target.value})}
            className="filter-select"
          >
            {allStatuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>

          <select 
            value={filters.client || 'All'} 
            onChange={(e) => onFilterChange({...filters, client: e.target.value})}
            className="filter-select"
          >
            {allClients.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Clients' : c}</option>
            ))}
          </select>

          <button 
            className="new-project-btn" 
            onClick={onNewProject}
            style={{ visibility: canAddDelete ? 'visible' : 'hidden' }}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects found. Import an Excel file or create a new project.</p>
          </div>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th>PROJECT</th>
                <th>CLIENT</th>
                <th>SUMMARY</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="project-name">
                      <strong 
                        className="project-name-link" 
                        onClick={() => navigate(`/project/${project.id}`)}
                        style={{ cursor: 'pointer', color: '#2563eb' }}
                      >
                        {project.name}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <div className="client-name">
                      {project.clients || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="project-summary">
                      {project.summary || '-'}
                    </div>
                  </td>
                  <td>
                    {canEdit ? (
                      <select
                        value={project.status || 'Active'}
                        onChange={(e) => onUpdateField(project.id, 'status', e.target.value)}
                        className="status-select"
                        style={{ 
                          backgroundColor: `${getStatusColor(project.status)}20`, 
                          color: getStatusColor(project.status)
                        }}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="status-badge"
                        style={{
                          backgroundColor: `${getStatusColor(project.status)}20`,
                          color: getStatusColor(project.status)
                        }}
                      >
                        {project.status || 'Active'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {canEdit && (
                        <button className="action-btn edit-btn" onClick={() => onEdit(project)}>
                          <Edit2 size={14} />
                        </button>
                      )}
                      {canAddDelete && (
                        <button className="action-btn delete-btn" onClick={() => onDelete(project.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ProjectsTable;
