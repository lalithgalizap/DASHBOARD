import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit, Archive, ExternalLink } from 'lucide-react';
import ProjectModal from '../components/ProjectModal';
import UpdateModal from '../components/UpdateModal';
import DetailsModal from '../components/DetailsModal';
import ProjectDocuments from '../components/ProjectDocuments';
import './ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [weeklyUpdates, setWeeklyUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const [projectRes, updatesRes] = await Promise.all([
        axios.get(`/api/projects/${id}`),
        axios.get('/api/weekly-updates', { params: { project: '' } })
      ]);
      
      setProject(projectRes.data);
      const projectUpdates = updatesRes.data.filter(
        update => update.project_id === parseInt(id)
      );
      setWeeklyUpdates(projectUpdates);
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      await axios.put(`/api/projects/${id}`, projectData);
      setShowProjectModal(false);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
  };

  const handleSaveUpdate = async (updateData) => {
    try {
      const dataToSave = {
        ...updateData,
        project_id: parseInt(id),
        project_name: project.name,
        stage: project.stage
      };

      if (editingUpdate) {
        await axios.put(`/api/weekly-updates/${editingUpdate.id}`, dataToSave);
      } else {
        await axios.post('/api/weekly-updates', dataToSave);
      }
      
      setShowUpdateModal(false);
      setEditingUpdate(null);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error saving update:', error);
      alert('Error saving update. Please try again.');
    }
  };

  const handleSaveDetails = async (detailsData) => {
    try {
      const updatedProject = { ...project, ...detailsData };
      await axios.put(`/api/projects/${id}`, updatedProject);
      setShowDetailsModal(false);
      fetchProjectDetails();
    } catch (error) {
      console.error('Error saving details:', error);
      alert('Error saving details. Please try again.');
    }
  };

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this project?')) {
      try {
        await axios.delete(`/api/projects/${id}`);
        navigate('/');
      } catch (error) {
        console.error('Error archiving project:', error);
        alert('Error archiving project.');
      }
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'Active': '#10b981',
      'Advance': '#3b82f6',
      'Incubate': '#8b5cf6',
      'Maintain': '#f59e0b',
      'Scale': '#06b6d4'
    };
    return colors[stage] || '#71717a';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': '#10b981',
      'On-track': '#10b981',
      'Development': '#3b82f6',
      'Complete': '#8b5cf6',
      'On-hold': '#ef4444'
    };
    return colors[status] || '#71717a';
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="loading">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="error">Project not found</div>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="project-detail-container">
        {/* Sidebar */}
        <aside className="project-sidebar">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Portfolio
          </button>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <h3 className="sidebar-title">DETAILS</h3>
              <button className="edit-details-btn" onClick={() => setShowDetailsModal(true)}>
                <Edit size={14} />
              </button>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-label">OWNER</span>
              <span className="sidebar-value">{project.owner || 'Unset'}</span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-label">VERTICAL</span>
              <span className="sidebar-value">{project.vertical || 'Unset'}</span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-label">REGION</span>
              <span className="sidebar-value">{project.region || 'Global'}</span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-label">SPONSOR</span>
              <span className="sidebar-value">{project.sponsor || 'Unset'}</span>
            </div>
            <div className="sidebar-item">
              <span className="sidebar-label">ANCHOR CUSTOMER</span>
              <span className="sidebar-value">{project.anchor_customer || 'Unset'}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">CUSTOMER ENGAGEMENT</h3>
            <div className="sidebar-item">
              <span className="sidebar-value">{project.clients || 'None'}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">PRIORITY</h3>
            <div className="sidebar-item">
              <span className="priority-badge">{project.priority}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">STATUS</h3>
            <div className="sidebar-item">
              <span className="sidebar-value">{project.status}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">MODE OF ENGAGEMENT</h3>
            <div className="sidebar-item">
              <span className="sidebar-value">{project.mcc || 'Internal'}</span>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">LINKS</h3>
            {project.links ? (
              <a href={project.links} target="_blank" rel="noopener noreferrer" className="sidebar-link">
                <ExternalLink size={14} />
                Live URL
              </a>
            ) : (
              <div className="sidebar-empty">-</div>
            )}
            <a href="#" className="sidebar-link">
              <ExternalLink size={14} />
              Spec Page
            </a>
            <a href="#" className="sidebar-link">
              <ExternalLink size={14} />
              Demo Video
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="project-main">
          <div className="project-header">
            <div className="project-header-left">
              <h1>{project.name}</h1>
              <div className="project-badges">
                <span 
                  className="badge stage-badge"
                  style={{ 
                    backgroundColor: `${getStageColor(project.stage)}20`, 
                    color: getStageColor(project.stage) 
                  }}
                >
                  {project.stage}
                </span>
                <span 
                  className="badge status-badge"
                  style={{ 
                    backgroundColor: `${getStatusColor(project.status)}20`, 
                    color: getStatusColor(project.status) 
                  }}
                >
                  {project.status}
                </span>
              </div>
            </div>
            <div className="project-header-actions">
              <button className="action-btn edit-btn" onClick={() => setShowProjectModal(true)}>
                <Edit size={16} />
                Edit Project
              </button>
              <button className="action-btn archive-btn" onClick={handleArchive}>
                <Archive size={16} />
                Archive
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <section className="content-section">
            <div className="section-header">
              <h2>SUMMARY</h2>
              <button className="edit-section-btn">Edit</button>
            </div>
            <div className="section-content">
              <p>{project.summary || 'No summary provided'}</p>
            </div>
          </section>

          {/* Customer Engagement Section */}
          <section className="content-section">
            <div className="section-header">
              <h2>CUSTOMER ENGAGEMENT</h2>
              <button className="edit-section-btn">Edit</button>
            </div>
            <div className="section-content">
              <p>{project.clients ? `e.g., ${project.clients}` : 'No customer engagement data'}</p>
            </div>
          </section>

          {/* Weekly Updates Section */}
          <section className="content-section">
            <div className="section-header">
              <h2>WEEKLY UPDATES</h2>
              <button className="add-update-btn-inline" onClick={() => {
                setEditingUpdate(null);
                setShowUpdateModal(true);
              }}>+ Add Update</button>
            </div>
            <div className="section-content">
              {weeklyUpdates.length === 0 ? (
                <p className="empty-message">No weekly updates yet</p>
              ) : (
                <div className="updates-timeline">
                  {weeklyUpdates.map((update) => (
                    <div key={update.id} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">{update.week_date}</span>
                          {update.name && (
                            <span className="timeline-author">by {update.name}</span>
                          )}
                        </div>
                        <div className="timeline-body">
                          {update.update_text && (
                            <div className="timeline-section">
                              <strong>Update:</strong> {update.update_text}
                            </div>
                          )}
                          {update.next_steps && (
                            <div className="timeline-section">
                              <strong>Next Steps:</strong> {update.next_steps}
                            </div>
                          )}
                          {update.blockers && (
                            <div className="timeline-section">
                              <strong>Blockers:</strong> {update.blockers}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Documents Section */}
          <section className="content-section documents-section">
            <ProjectDocuments projectId={id} projectName={project?.name} />
          </section>
        </main>
      </div>

      {showProjectModal && (
        <ProjectModal
          project={project}
          onClose={() => setShowProjectModal(false)}
          onSave={handleSaveProject}
        />
      )}

      {showUpdateModal && (
        <UpdateModal
          update={editingUpdate || { 
            project_id: parseInt(id), 
            project_name: project.name,
            stage: project.stage 
          }}
          onClose={() => {
            setShowUpdateModal(false);
            setEditingUpdate(null);
          }}
          onSave={handleSaveUpdate}
        />
      )}

      {showDetailsModal && (
        <DetailsModal
          project={project}
          onClose={() => setShowDetailsModal(false)}
          onSave={handleSaveDetails}
        />
      )}
    </div>
  );
}

export default ProjectDetail;
