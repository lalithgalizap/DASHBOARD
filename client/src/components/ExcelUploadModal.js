import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, X } from 'lucide-react';
import './ExcelUploadModal.css';

function ExcelUploadModal({ onClose, onUploadSuccess, currentProject }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(currentProject?.id || '');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    if (!file) {
      setError('Please select a file');
      return;
    }

    const project = projects.find(p => p.id === selectedProject);
    if (!project) {
      setError('Invalid project selected');
      return;
    }

    // Validate file name matches project name
    const fileNameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, '');
    if (fileNameWithoutExt !== project.name) {
      setError(`File name must match project name: "${project.name}.xlsx"`);
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProject);
      formData.append('projectName', project.name);

      await axios.post('/api/projects/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onUploadSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.error || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content excel-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Project Document</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Select Project *</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={currentProject}
              className="form-select"
            >
              <option value="">Choose a project...</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="file-name-hint">
              <strong>Required file name:</strong> {projects.find(p => p.id === selectedProject)?.name}.xlsx
            </div>
          )}

          <div className="form-group">
            <label>Select Excel File *</label>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
                id="excel-file"
              />
              <label htmlFor="excel-file" className="file-input-label">
                <Upload size={18} />
                {file ? file.name : 'Choose file...'}
              </label>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="upload-info">
            <p><strong>Note:</strong> The Excel file name must exactly match the project name.</p>
            <p>If a document already exists for this project, it will be replaced.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleUpload}
            disabled={uploading || !selectedProject || !file}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExcelUploadModal;
