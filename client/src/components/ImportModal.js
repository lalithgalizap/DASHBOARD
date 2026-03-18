import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import './ImportModal.css';

function ImportModal({ onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
    } else {
      alert('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Excel File</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div 
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={48} />
            <p className="dropzone-text">
              {file ? file.name : 'Drag and drop your Excel file here'}
            </p>
            <p className="dropzone-subtext">or</p>
            <label className="file-input-label">
              Browse Files
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileChange}
                className="file-input"
              />
            </label>
          </div>

          <div className="format-info">
            <h4>Expected Excel Format:</h4>
            <ul>
              <li><strong>PROJECT</strong> - Project name</li>
              <li><strong>PRI</strong> - Priority (P0, P1, P2, P3)</li>
              <li><strong>STAGE</strong> - Stage (Active, Advance, Incubate, etc.)</li>
              <li><strong>MCC</strong> - MCC value</li>
              <li><strong>SUMMARY</strong> - Project summary</li>
              <li><strong>STATUS</strong> - Status (Active, On-track, etc.)</li>
              <li><strong>CLIENTS</strong> - Client names</li>
              <li><strong>LINKS</strong> - Project links</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button 
              className="import-btn-modal" 
              onClick={handleSubmit}
              disabled={!file}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportModal;
