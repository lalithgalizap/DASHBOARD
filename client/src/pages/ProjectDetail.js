import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Upload, ArrowLeft } from 'lucide-react';
import ProjectModal from '../components/ProjectModal';
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
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
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
              {(hasPermission('projects', 'add_delete') || hasPermission('projects', 'edit')) && (
                <>
                  {hasPermission('projects', 'add_delete') && (
                    <button className="action-btn upload-btn" onClick={() => setShowUploadModal(true)}>
                      <Upload size={16} />
                      Upload Document
                    </button>
                  )}
                  {hasPermission('projects', 'edit') && (
                    <button className="action-btn edit-btn" onClick={() => setShowProjectModal(true)}>
                      <Edit size={16} />
                      Edit Project
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Project Dashboard */}
          <ProjectDashboard 
            projectId={id} 
            projectName={project.name} 
            project={project}
          />

          {/* Documents Section */}
          <section className="content-section documents-section">
            <ProjectDocuments projectId={id} projectName={project?.name} canEdit={hasPermission('projects', 'edit')} />
          </section>
        </main>
      </div>

      {showProjectModal && (
        <ProjectModal
          project={project}
          onClose={() => setShowProjectModal(false)}
          onSave={handleSaveProject}
          isAdmin={isAdmin() === true}
          canManageClients={hasPermission('projects', 'edit')}
          canAddClients={hasPermission('projects', 'add_delete')}
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
    </div>
  );
}

export default ProjectDetail;
