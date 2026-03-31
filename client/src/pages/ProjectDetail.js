import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Archive, Upload, ArrowLeft, X } from 'lucide-react';
import ProjectModal from '../components/ProjectModal';
import UpdateModal from '../components/UpdateModal';
import DetailsModal from '../components/DetailsModal';
import ExcelUploadModal from '../components/ExcelUploadModal';
import ProjectDocuments from '../components/ProjectDocuments';
import ProjectDashboard from '../components/ProjectDashboard';
import { useAuth } from '../contexts/AuthContext';
import './ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [weeklyUpdates, setWeeklyUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [updateSearch, setUpdateSearch] = useState('');
  const [selectedUpdateDetail, setSelectedUpdateDetail] = useState(null);
  const [showUpdateDetailModal, setShowUpdateDetailModal] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
      
      // Fetch weekly updates for this specific project using project name
      const updatesRes = await axios.get('/api/weekly-updates', { 
        params: { project: projectRes.data.name } 
      });
      setWeeklyUpdates(updatesRes.data);
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
        project_id: id,
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
        {/* Main Content */}
        <main className="project-main project-main-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button className="back-btn-inline" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              Back to Projects
            </button>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {(isAdmin() || hasPermission('projects', 'manage')) && (
                <button className="action-btn upload-btn" onClick={() => setShowUploadModal(true)}>
                  <Upload size={16} />
                  Upload Document
                </button>
              )}
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

          {/* Project Dashboard */}
          <ProjectDashboard 
            projectId={id} 
            projectName={project.name} 
            project={project}
          />

          {/* Weekly Updates Section */}
          <section className="content-section">
            <div className="section-header">
              <h2>WEEKLY UPDATES</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search updates..."
                  value={updateSearch}
                  onChange={(e) => setUpdateSearch(e.target.value)}
                  className="update-search-input"
                />
                <button className="add-update-btn-inline" onClick={() => {
                  setEditingUpdate(null);
                  setShowUpdateModal(true);
                }}>+ Add Update</button>
              </div>
            </div>
            <div className="section-content">
              {weeklyUpdates.length === 0 ? (
                <p className="empty-message">No weekly updates yet</p>
              ) : (
                <>
                  <div className="updates-timeline">
                    {(() => {
                      const filteredUpdates = weeklyUpdates.filter(update => {
                        if (!updateSearch) return true;
                        const searchLower = updateSearch.toLowerCase();
                        return (
                          update.update_text?.toLowerCase().includes(searchLower) ||
                          update.next_steps?.toLowerCase().includes(searchLower) ||
                          update.blockers?.toLowerCase().includes(searchLower) ||
                          update.name?.toLowerCase().includes(searchLower) ||
                          update.week_date?.toLowerCase().includes(searchLower)
                        );
                      });
                      const displayUpdates = showAllUpdates ? filteredUpdates : filteredUpdates.slice(0, 2);
                      
                      return displayUpdates.map((update) => (
                        <div 
                          key={update.id} 
                          className="timeline-item clickable-update"
                          onClick={() => {
                            setSelectedUpdateDetail(update);
                            setShowUpdateDetailModal(true);
                          }}
                        >
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
                                  <strong>Update:</strong> {update.update_text.substring(0, 150)}{update.update_text.length > 150 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  {weeklyUpdates.length > 2 && !updateSearch && (
                    <button 
                      className="view-all-updates-btn" 
                      onClick={() => setShowAllUpdates(!showAllUpdates)}
                    >
                      {showAllUpdates ? '− Show Less' : `+ View All Updates (${weeklyUpdates.length})`}
                    </button>
                  )}
                </>
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
            project_id: id, 
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

      {showUploadModal && (
        <ExcelUploadModal
          currentProject={project}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchProjectDetails}
        />
      )}

      {showUpdateDetailModal && selectedUpdateDetail && (
        <div className="modal-overlay" onClick={() => setShowUpdateDetailModal(false)}>
          <div className="modal update-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Weekly Update Details</h2>
              <button className="close-btn" onClick={() => setShowUpdateDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="update-detail-content">
              <div className="detail-row">
                <span className="detail-label">Week:</span>
                <span className="detail-value">{selectedUpdateDetail.week_date}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Author:</span>
                <span className="detail-value">{selectedUpdateDetail.name || 'N/A'}</span>
              </div>
              {selectedUpdateDetail.rag && selectedUpdateDetail.rag !== 'None' && (
                <div className="detail-row">
                  <span className="detail-label">RAG Status:</span>
                  <span className={`rag-badge ${selectedUpdateDetail.rag.toLowerCase()}`}>
                    {selectedUpdateDetail.rag}
                  </span>
                </div>
              )}
              {selectedUpdateDetail.momentum && selectedUpdateDetail.momentum !== 'Select' && (
                <div className="detail-row">
                  <span className="detail-label">Momentum:</span>
                  <span className="detail-value">{selectedUpdateDetail.momentum}</span>
                </div>
              )}
              
              <div className="detail-section">
                <h3>Update</h3>
                <p>{selectedUpdateDetail.update_text || 'No update provided'}</p>
              </div>
              
              {selectedUpdateDetail.next_steps && (
                <div className="detail-section">
                  <h3>Next Steps</h3>
                  <p>{selectedUpdateDetail.next_steps}</p>
                </div>
              )}
              
              {selectedUpdateDetail.blockers && (
                <div className="detail-section">
                  <h3>Blockers</h3>
                  <p>{selectedUpdateDetail.blockers}</p>
                </div>
              )}
              
              {selectedUpdateDetail.milestone_achieved && (
                <div className="detail-section">
                  <h3>Milestone Achieved</h3>
                  <p>{selectedUpdateDetail.milestone_achieved}</p>
                </div>
              )}
              
              {selectedUpdateDetail.customer_engagement && (
                <div className="detail-section">
                  <h3>Customer Engagement</h3>
                  <p>{selectedUpdateDetail.customer_engagement}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
