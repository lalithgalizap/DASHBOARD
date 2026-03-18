import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ExternalLink, Plus } from 'lucide-react';
import './ProjectsTable.css';

function ProjectsTable({ projects, allProjects, filters, onFilterChange, onEdit, onDelete, onNewProject, loading, onUpdateField, canManage, canImport }) {
  const navigate = useNavigate();
  const priorities = ['P0', 'P1', 'P2', 'P3'];
  const progress = ['Initial Phase', 'On-Track', 'Delayed'];
  const statuses = ['Active', 'On-Hold', 'Completed'];
  
  const allPriorities = ['All', ...priorities];
  const allProgress = ['All', ...progress];
  const allStatuses = ['All', ...statuses];
  
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
      'Active': '#10b981',
      'On-Hold': '#ef4444',
      'Completed': '#6b7280'
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
      active: allProjects.filter(p => p.status === 'Active').length,
      onHold: allProjects.filter(p => p.status === 'On-Hold').length,
      completed: allProjects.filter(p => p.status === 'Completed').length
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
            className={`filter-btn ${filters.status === 'Active' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Active'})}
          >
            Active <span className="count">{statusCounts.active}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'On-Hold' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'On-Hold'})}
          >
            On-Hold <span className="count">{statusCounts.onHold}</span>
          </button>
          <button 
            className={`filter-btn ${filters.status === 'Completed' ? 'active' : ''}`}
            onClick={() => onFilterChange({...filters, status: 'Completed'})}
          >
            Completed <span className="count">{statusCounts.completed}</span>
          </button>
        </div>
        
        <div className="filter-dropdowns">
          <select 
            value={filters.priority} 
            onChange={(e) => onFilterChange({...filters, priority: e.target.value})}
            className="filter-select"
          >
            {allPriorities.map(p => (
              <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>
            ))}
          </select>

          <select 
            value={filters.stage} 
            onChange={(e) => onFilterChange({...filters, stage: e.target.value})}
            className="filter-select"
          >
            {allProgress.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Progress' : s}</option>
            ))}
          </select>

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
                <th>PRIORITY</th>
                <th>PROGRESS</th>
                <th>SUMMARY</th>
                <th>STATUS</th>
                <th>LINKS</th>
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
                    {canManage ? (
                      <select
                        value={project.priority || 'P2'}
                        onChange={(e) => onUpdateField(project.id, 'priority', e.target.value)}
                        className="inline-select priority-select"
                        style={{ 
                          backgroundColor: `${getPriorityColor(project.priority)}20`, 
                          color: getPriorityColor(project.priority),
                          border: `1px solid ${getPriorityColor(project.priority)}40`
                        }}
                      >
                        {priorities.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="priority-badge"
                        style={{ 
                          backgroundColor: `${getPriorityColor(project.priority)}20`, 
                          color: getPriorityColor(project.priority)
                        }}
                      >
                        {project.priority || 'P2'}
                      </span>
                    )}
                  </td>
                  <td>
                    {canManage ? (
                      <select
                        value={project.stage || 'Initial Phase'}
                        onChange={(e) => onUpdateField(project.id, 'stage', e.target.value)}
                        className="inline-select stage-select"
                        style={{ 
                          backgroundColor: `${getProgressColor(project.stage)}20`, 
                          color: getProgressColor(project.stage),
                          border: `1px solid ${getProgressColor(project.stage)}40`
                        }}
                      >
                        {progress.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="stage-badge"
                        style={{ 
                          backgroundColor: `${getProgressColor(project.stage)}20`, 
                          color: getProgressColor(project.stage)
                        }}
                      >
                        {project.stage || 'Initial Phase'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="summary">
                      {project.summary}
                      {project.clients && (
                        <div className="summary-clients">Clients: {project.clients}</div>
                      )}
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
                    {project.links && (
                      <a href={project.links} target="_blank" rel="noopener noreferrer" className="link-icon">
                        <ExternalLink size={16} />
                      </a>
                    )}
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
