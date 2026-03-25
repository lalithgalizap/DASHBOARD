import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ExternalLink, Plus } from 'lucide-react';
import './ProjectsTable.css';

function ProjectsTable({ projects, allProjects, weeklyUpdates = [], filters, onFilterChange, onEdit, onDelete, onNewProject, loading, onUpdateField, canManage, canImport }) {
  const navigate = useNavigate();
  const priorities = ['P0', 'P1', 'P2', 'P3'];
  const progress = ['Initial Phase', 'On-Track', 'Delayed'];
  const statuses = ['Yet to Start', 'On Track', 'On Hold', 'Delayed', 'Completed', 'Cancelled'];
  
  const allPriorities = ['All', ...priorities];
  const allProgress = ['All', ...progress];
  const allStatuses = ['All', ...statuses];

  // Get latest update for a project
  const getLatestUpdate = (projectName) => {
    const projectUpdates = weeklyUpdates
      .filter(update => update.project_name === projectName)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (projectUpdates.length > 0) {
      const latest = projectUpdates[0];
      return {
        text: latest.update_text,
        author: latest.name
      };
    }
    return null;
  };
  
  // Extract unique clients from all projects (not filtered)
  const getUniqueClients = () => {
    const clientsSet = new Set();
    const projectsToUse = allProjects || projects;
    projectsToUse.forEach(project => {
      if (project.clients) {
        const projectClients = project.clients.split(',').map(c => c.trim());
        projectClients.forEach(client => {
          if (client) clientsSet.add(client);
        });
      }
    });
    return Array.from(clientsSet).sort();
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

  const getProgressColor = (progress) => {
    const colors = {
      'Initial Phase': '#3b82f6',
      'On-Track': '#10b981',
      'Delayed': '#ef4444'
    };
    return colors[progress] || '#71717a';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'P0': '#ef4444',
      'P1': '#f59e0b',
      'P2': '#3b82f6',
      'P3': '#71717a'
    };
    return colors[priority] || '#71717a';
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
            style={{ visibility: canManage ? 'visible' : 'hidden' }}
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
                <th>LATEST UPDATE</th>
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
                      >
                        {project.name}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <div className="project-clients">{project.clients || '-'}</div>
                  </td>
                  <td>
                    <div className="summary">
                      {project.summary}
                    </div>
                  </td>
                  <td>
                    {canManage ? (
                      <select
                        value={project.status || 'Active'}
                        onChange={(e) => onUpdateField(project.id, 'status', e.target.value)}
                        className="inline-select status-select"
                        style={{ 
                          backgroundColor: `${getStatusColor(project.status)}20`, 
                          color: getStatusColor(project.status),
                          border: `1px solid ${getStatusColor(project.status)}40`
                        }}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s}</option>
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
                    <div className="latest-update">
                      {(() => {
                        const latestUpdate = getLatestUpdate(project.name);
                        if (latestUpdate) {
                          return (
                            <>
                              <div className="update-text">{latestUpdate.text}</div>
                              {latestUpdate.author && (
                                <div className="update-author">by {latestUpdate.author}</div>
                              )}
                            </>
                          );
                        }
                        return '-';
                      })()}
                    </div>
                  </td>
                  <td>
                    {canManage && (
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" onClick={() => onEdit(project)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="action-btn delete-btn" onClick={() => onDelete(project.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
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
