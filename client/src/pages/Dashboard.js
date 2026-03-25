import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MetricsCards from '../components/MetricsCards';
import ProjectsTable from '../components/ProjectsTable';
import ImportModal from '../components/ImportModal';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { hasPermission } = useAuth();
  const [allProjects, setAllProjects] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [weeklyUpdates, setWeeklyUpdates] = useState([]);
  const [filters, setFilters] = useState({
    status: 'All',
    client: 'All'
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, metricsRes, updatesRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/metrics'),
        axios.get('/api/weekly-updates')
      ]);
      setAllProjects(projectsRes.data);
      setMetrics(metricsRes.data);
      setWeeklyUpdates(updatesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredProjects = allProjects.filter(project => {
    // Status filter
    if (filters.status !== 'All' && project.status !== filters.status) {
      return false;
    }
    
    // Client filter
    if (filters.client !== 'All') {
      if (!project.clients) return false;
      const projectClients = project.clients.split(',').map(c => c.trim());
      if (!projectClients.includes(filters.client)) {
        return false;
      }
    }
    
    return true;
  });

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/import/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowImportModal(false);
      fetchData();
    } catch (error) {
      console.error('Error importing file:', error);
      alert('Error importing file. Please check the format.');
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await axios.put(`/api/projects/${editingProject.id}`, projectData);
      } else {
        await axios.post('/api/projects', projectData);
      }
      setShowProjectModal(false);
      setEditingProject(null);
      fetchData();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project.');
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/api/projects/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleUpdateField = async (projectId, field, value) => {
    console.log(`[UPDATE] Starting: project ${projectId}, ${field} = ${value}`);
    
    try {
      // Send update to server first
      const response = await axios.patch(`/api/projects/${projectId}/${field}`, { value });
      console.log('[UPDATE] Server response:', response.data);
      
      // Small delay to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then refresh data to ensure consistency
      console.log('[UPDATE] Refreshing data...');
      await fetchData();
      console.log('[UPDATE] Complete!');
    } catch (error) {
      console.error(`[UPDATE] Error updating ${field}:`, error);
      if (error.response) {
        console.error('[UPDATE] Error response:', error.response.data);
      }
      alert(`Failed to update ${field}. Please try again.`);
      fetchData();
    }
  };

  return (
    <div className="container">
      <MetricsCards metrics={metrics} />
      
      <ProjectsTable
        projects={filteredProjects}
        allProjects={allProjects}
        weeklyUpdates={weeklyUpdates}
        filters={filters}
        onFilterChange={setFilters}
        onEdit={handleEditProject}
        onDelete={handleDeleteProject}
        onNewProject={() => {
          setEditingProject(null);
          setShowProjectModal(true);
        }}
        onUpdateField={handleUpdateField}
        loading={loading}
        canManage={hasPermission('projects', 'manage')}
        canImport={hasPermission('import', 'manage')}
      />

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
        />
      )}
    </div>
  );
}

export default Dashboard;
