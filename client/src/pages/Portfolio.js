import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PortfolioMetrics from '../components/PortfolioMetrics';
import './Portfolio.css';

function Portfolio() {
  const [portfolioData, setPortfolioData] = useState({
    projects: [],
    totalActiveProjects: 0
  });
  const [loading, setLoading] = useState(true);
  const [showActiveProjectsModal, setShowActiveProjectsModal] = useState(false);
  const [showRAGProjectsModal, setShowRAGProjectsModal] = useState(false);
  const [showUpdatedProjectsModal, setShowUpdatedProjectsModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOpenCriticalRisksModal, setShowOpenCriticalRisksModal] = useState(false);
  const [showOpenCriticalIssuesModal, setShowOpenCriticalIssuesModal] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);

  useEffect(() => {
    const fetchProjectsWithRAG = async () => {
      try {
        // First get all projects
        const response = await axios.get('/api/projects');
        const projects = response.data || [];
        
        // Calculate RAG for each project by fetching documents
        const projectsWithRAG = await Promise.all(
          projects.map(async (project) => {
            try {
              const docResponse = await axios.get(`/api/projects/${project._id || project.id}/documents?projectName=${encodeURIComponent(project.name)}`);
              const documents = docResponse.data;
              
              // Calculate metrics same as ProjectDashboard
              const milestones = documents.milestoneTracker || [];
              const tasks = documents.projectPlan || [];
              const raidLog = documents.raidLog || [];
              
              // Get overdue milestone details
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Count overdue milestones and store details
              const overdueMilestoneDetails = milestones.filter(m => {
                if (!m['Planned End Date']) return false;
                const endDate = convertExcelDateToJS(m['Planned End Date']);
                if (!endDate) return false;
                endDate.setHours(0, 0, 0, 0);
                const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
                return endDate < today && !isCompleted;
              });
              const overdueMilestones = overdueMilestoneDetails.length;
              
              // Count upcoming milestones (next 14 days) and store details
              const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
              const upcomingMilestoneDetails = milestones.filter(m => {
                if (!m['Planned End Date']) return false;
                const endDate = convertExcelDateToJS(m['Planned End Date']);
                if (!endDate) return false;
                endDate.setHours(0, 0, 0, 0);
                const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
                return endDate >= today && endDate <= fourteenDaysFromNow && !isCompleted;
              });
              const upcomingMilestones = upcomingMilestoneDetails.length;
              
              // Count overdue tasks
              const overdueTasks = tasks.filter(t => {
                if (!t['Planned End Date'] || t.Status?.toLowerCase() === 'completed') return false;
                const endDate = new Date(t['Planned End Date']);
                return endDate < today;
              }).length;
              
              // Count open critical risks (High & Critical severity) and store details
              const openCriticalRisksDetails = raidLog.filter(r => {
                const isRisk = r.Type && r.Type.toLowerCase() === 'risk';
                const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
                const isHighOrCritical = r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical');
                return isRisk && isOpen && isHighOrCritical;
              });
              const openCriticalRisks = openCriticalRisksDetails.length;
              
              // Count open critical issues (all open issues) and store details
              const openCriticalIssuesDetails = raidLog.filter(r => {
                const isIssue = r.Type && r.Type.toLowerCase() === 'issue';
                const isOpen = r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
                return isIssue && isOpen;
              });
              const openCriticalIssues = openCriticalIssuesDetails.length;
              
              // Determine RAG same as ProjectDashboard
              let ragStatus = 'Green';
              if (overdueMilestones > 0 || overdueTasks > 3) {
                ragStatus = 'Red';
              } else if (openCriticalRisks > 3 || openCriticalIssues > 2) {
                ragStatus = 'Amber';
              }
              
              return { ...project, ragStatus, overdueMilestones, overdueMilestoneDetails, upcomingMilestones, upcomingMilestoneDetails, overdueTasks, openCriticalRisks, openCriticalRisksDetails, openCriticalIssues, openCriticalIssuesDetails };
            } catch (err) {
              // If documents fail to load, default to Green
              return { ...project, ragStatus: 'Green', overdueMilestones: 0, overdueMilestoneDetails: [], upcomingMilestones: 0, upcomingMilestoneDetails: [], overdueTasks: 0, openCriticalRisks: 0, openCriticalRisksDetails: [], openCriticalIssues: 0, openCriticalIssuesDetails: [] };
            }
          })
        );
        
        // Fetch file modification times
        let fileStatusData = { projects: [] };
        try {
          const fileResponse = await axios.get('/api/projects-file-status');
          fileStatusData = fileResponse.data;
        } catch (err) {
          console.error('Error fetching file status:', err);
        }
        
        // Calculate 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // Categorize projects by file update status
        const updatedThisWeek = [];
        const notUpdated = [];
        const noData = [];
        
        projectsWithRAG.forEach(project => {
          const fileInfo = fileStatusData.projects.find(f => f.projectId === (project._id || project.id));
          if (!fileInfo || !fileInfo.hasData) {
            noData.push(project);
          } else if (new Date(fileInfo.lastModified) >= sevenDaysAgo) {
            updatedThisWeek.push({ ...project, lastModified: fileInfo.lastModified });
          } else {
            notUpdated.push({ ...project, lastModified: fileInfo.lastModified });
          }
        });
        
        const activeCount = projectsWithRAG.filter(p => p.status?.toLowerCase() !== 'completed').length;
        
        // Calculate RAG counts
        const projectsByRAG = {
          green: projectsWithRAG.filter(p => p.ragStatus?.toLowerCase() === 'green').length,
          amber: projectsWithRAG.filter(p => p.ragStatus?.toLowerCase() === 'amber').length,
          red: projectsWithRAG.filter(p => p.ragStatus?.toLowerCase() === 'red').length
        };
        
        // Calculate overdue milestones totals
        const overdueMilestonesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.overdueMilestones || 0), 0);
        const projectsWithOverdueMilestones = projectsWithRAG.filter(p => (p.overdueMilestones || 0) > 0).length;
        
        // Calculate upcoming milestones totals
        const upcomingMilestonesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.upcomingMilestones || 0), 0);
        
        // Calculate open critical risks and issues totals
        const openCriticalRisksTotal = projectsWithRAG.reduce((sum, p) => sum + (p.openCriticalRisks || 0), 0);
        const openCriticalIssuesTotal = projectsWithRAG.reduce((sum, p) => sum + (p.openCriticalIssues || 0), 0);
        
        setPortfolioData({
          projects: projectsWithRAG,
          totalActiveProjects: activeCount,
          projectsByRAG: projectsByRAG,
          updatedThisWeek: updatedThisWeek,
          notUpdated: notUpdated,
          noData: noData,
          updatedCount: updatedThisWeek.length,
          overdueMilestonesTotal: overdueMilestonesTotal,
          projectsWithOverdueMilestones: projectsWithOverdueMilestones,
          upcomingMilestonesTotal: upcomingMilestonesTotal,
          openCriticalRisksTotal: openCriticalRisksTotal,
          openCriticalIssuesTotal: openCriticalIssuesTotal
        });
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectsWithRAG();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  // Helper to convert Excel serial dates to JS dates (same as ProjectDashboard)
  const convertExcelDateToJS = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
      return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
    }
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Helper to format dates same as ProjectDashboard
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    // Handle Excel serial date numbers
    if (typeof dateStr === 'number' && dateStr > 40000 && dateStr < 50000) {
      const utcDate = new Date(Date.UTC(1899, 11, 30) + dateStr * 86400 * 1000);
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      const year = utcDate.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }
    
    // Handle ISO date strings
    const date = new Date(dateStr);
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
  };

  const getRAGColor = (ragStatus) => {
    switch (ragStatus?.toLowerCase()) {
      case 'green':
        return '#10b981';
      case 'amber':
        return '#f59e0b';
      case 'red':
        return '#ef4444';
      default:
        return '#10b981';
    }
  };

  if (loading) {
    return (
      <div className="portfolio-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        {/* Portfolio Metrics Cards */}
        <PortfolioMetrics 
          metrics={portfolioData} 
          onMetricClick={(type) => {
            if (type === 'active') setShowActiveProjectsModal(true);
            if (type === 'rag') setShowRAGProjectsModal(true);
            if (type === 'updated') setShowUpdatedProjectsModal(true);
            if (type === 'overdue') setShowOverdueMilestonesModal(true);
            if (type === 'upcoming') setShowUpcomingMilestonesModal(true);
            if (type === 'criticalRisks') setShowOpenCriticalRisksModal(true);
            if (type === 'criticalIssues') setShowOpenCriticalIssuesModal(true);
          }}
        />

        {/* Projects Table */}
        <div className="portfolio-table-section">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>% Complete</th>
                <th>RAG</th>
                <th>Last Updated</th>
                <th>Overdue Milestones</th>
                <th>Critical Risks</th>
                <th>Next Milestone</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData?.projects?.map((project) => (
                <tr key={project.id}>
                  <td className="project-name-cell">
                    <span className="project-name-link">{project.name}</span>
                  </td>
                  <td className="percent-complete-cell">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${project.percentComplete || 0}%`,
                          backgroundColor: getRAGColor(project.ragStatus)
                        }}
                      />
                      <span className="progress-text">{project.percentComplete || 0}%</span>
                    </div>
                  </td>
                  <td className="rag-cell">
                    <div 
                      className="rag-indicator" 
                      style={{ backgroundColor: getRAGColor(project.ragStatus) }}
                    />
                    <span className="rag-text">{project.ragStatus}</span>
                  </td>
                  <td className="date-cell">{formatDate(project.lastUpdated)}</td>
                  <td className="number-cell">{project.overdueMilestones || 0}</td>
                  <td className="number-cell">{project.criticalRisks || 0}</td>
                  <td className="milestone-cell">{project.nextMilestone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Active Projects Modal */}
        {showActiveProjectsModal && (
          <div className="modal-overlay" onClick={() => setShowActiveProjectsModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Active Projects</h2>
                <button onClick={() => setShowActiveProjectsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <table className="portfolio-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Status</th>
                      <th>RAG</th>
                      <th>% Complete</th>
                      <th>Client</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.projects
                      .filter(p => p.status?.toLowerCase() !== 'completed')
                      .map(project => (
                        <tr key={project.id}>
                          <td>{project.name}</td>
                          <td>{project.status}</td>
                          <td>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              backgroundColor: getRAGColor(project.ragStatus),
                              marginRight: '8px'
                            }} />
                            {project.ragStatus}
                          </td>
                          <td>{project.percentComplete || 0}%</td>
                          <td>{project.client || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RAG Status Modal */}
        {showRAGProjectsModal && (
          <div className="modal-overlay" onClick={() => setShowRAGProjectsModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects by RAG Status</h2>
                <button onClick={() => setShowRAGProjectsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {['Green', 'Amber', 'Red'].map(rag => {
                  const projectsWithRAG = portfolioData.projects.filter(p => 
                    p.ragStatus?.toLowerCase() === rag.toLowerCase()
                  );
                  return (
                    <div key={rag} style={{ marginBottom: '24px' }}>
                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '50%', 
                          backgroundColor: getRAGColor(rag)
                        }} />
                        {rag} ({projectsWithRAG.length})
                      </h3>
                      {projectsWithRAG.length > 0 ? (
                        <table className="portfolio-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Project Name</th>
                              <th>Status</th>
                              <th>% Complete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectsWithRAG.map(project => (
                              <tr key={project.id}>
                                <td>{project.name}</td>
                                <td>{project.status}</td>
                                <td>{project.percentComplete || 0}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No projects with {rag} status</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Updated Projects Modal */}
        {showUpdatedProjectsModal && (
          <div className="modal-overlay" onClick={() => setShowUpdatedProjectsModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Project Data Status</h2>
                <button onClick={() => setShowUpdatedProjectsModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {/* Updated This Week */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#10b981' }}>
                    ✅ Updated This Week ({portfolioData.updatedThisWeek?.length || 0})
                  </h3>
                  {portfolioData.updatedThisWeek?.length > 0 ? (
                    <table className="portfolio-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Last Updated</th>
                          <th>RAG Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.updatedThisWeek.map(project => (
                          <tr key={project.id}>
                            <td>{project.name}</td>
                            <td>{new Date(project.lastModified).toLocaleDateString()}</td>
                            <td>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                              {project.ragStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No projects updated in the last 7 days</p>
                  )}
                </div>

                {/* Not Updated */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#f59e0b' }}>
                    ⚠️ Not Updated Recently ({portfolioData.notUpdated?.length || 0})
                  </h3>
                  {portfolioData.notUpdated?.length > 0 ? (
                    <table className="portfolio-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Last Updated</th>
                          <th>RAG Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.notUpdated.map(project => (
                          <tr key={project.id}>
                            <td>{project.name}</td>
                            <td>{project.lastModified ? new Date(project.lastModified).toLocaleDateString() : 'Unknown'}</td>
                            <td>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                              {project.ragStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>All projects have been updated recently</p>
                  )}
                </div>

                {/* No Data */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#ef4444' }}>
                    ❌ No Excel Data ({portfolioData.noData?.length || 0})
                  </h3>
                  {portfolioData.noData?.length > 0 ? (
                    <table className="portfolio-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Status</th>
                          <th>Action Needed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.noData.map(project => (
                          <tr key={project.id}>
                            <td>{project.name}</td>
                            <td>{project.status}</td>
                            <td style={{ color: '#ef4444' }}>Upload Excel file</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>All projects have Excel data uploaded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Milestones Modal */}
        {showOverdueMilestonesModal && (
          <div className="modal-overlay" onClick={() => setShowOverdueMilestonesModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Overdue Milestones</h2>
                <button onClick={() => setShowOverdueMilestonesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {portfolioData.projects?.filter(p => (p.overdueMilestones || 0) > 0).length > 0 ? (
                  <table className="portfolio-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}></th>
                        <th>Project Name</th>
                        <th>Overdue Milestones</th>
                        <th>Status</th>
                        <th>RAG Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.projects
                        .filter(p => (p.overdueMilestones || 0) > 0)
                        .sort((a, b) => (b.overdueMilestones || 0) - (a.overdueMilestones || 0))
                        .map(project => {
                          const todayCalc = new Date();
                          todayCalc.setHours(0, 0, 0, 0);
                          return (
                          <React.Fragment key={project.id}>
                            <tr 
                              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {expandedProject === project.id ? '▼' : '▶'}
                                </span>
                              </td>
                              <td>{project.name}</td>
                              <td style={{ color: '#ef4444', fontWeight: '600' }}>{project.overdueMilestones}</td>
                              <td>{project.status}</td>
                              <td>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                                {project.ragStatus}
                              </td>
                            </tr>
                            {expandedProject === project.id && project.overdueMilestoneDetails?.length > 0 && (
                              <tr>
                                <td colSpan="5" style={{ padding: 0, backgroundColor: '#f9fafb' }}>
                                  <div style={{ padding: '12px 20px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Overdue Milestone Details:</h4>
                                    <table style={{ width: '100%', fontSize: '13px' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Milestone Ref</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Milestone Name</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Planned Start</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Planned End</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Days Overdue</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {project.overdueMilestoneDetails.map((milestone, idx) => {
                                          const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                                          const daysOverdue = endDate ? Math.abs(Math.ceil((todayCalc - endDate) / (1000 * 60 * 60 * 24))) : 0;
                                          return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                              <td style={{ padding: '8px' }}>{milestone['Milestone Ref'] || '-'}</td>
                                              <td style={{ padding: '8px' }}>{milestone['Milestone / Task Name'] || 'Unnamed'}</td>
                                              <td style={{ padding: '8px' }}>{formatDateDisplay(milestone['Planned Start Date'])}</td>
                                              <td style={{ padding: '8px', color: '#dc2626' }}>{formatDateDisplay(milestone['Planned End Date'])}</td>
                                              <td style={{ padding: '8px', color: '#ef4444', fontWeight: '600' }}>{daysOverdue} days</td>
                                              <td style={{ padding: '8px' }}>{milestone.Status || 'Not Started'}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No projects with overdue milestones.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Milestones Modal */}
        {showUpcomingMilestonesModal && (
          <div className="modal-overlay" onClick={() => setShowUpcomingMilestonesModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Upcoming Milestones (Next 14 Days)</h2>
                <button onClick={() => setShowUpcomingMilestonesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {portfolioData.projects?.filter(p => (p.upcomingMilestones || 0) > 0).length > 0 ? (
                  <table className="portfolio-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}></th>
                        <th>Project Name</th>
                        <th>Upcoming Milestones</th>
                        <th>Status</th>
                        <th>RAG Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.projects
                        .filter(p => (p.upcomingMilestones || 0) > 0)
                        .sort((a, b) => (b.upcomingMilestones || 0) - (a.upcomingMilestones || 0))
                        .map(project => {
                          const todayCalc = new Date();
                          todayCalc.setHours(0, 0, 0, 0);
                          return (
                          <React.Fragment key={project.id}>
                            <tr 
                              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {expandedProject === project.id ? '▼' : '▶'}
                                </span>
                              </td>
                              <td>{project.name}</td>
                              <td style={{ color: '#3b82f6', fontWeight: '600' }}>{project.upcomingMilestones}</td>
                              <td>{project.status}</td>
                              <td>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                                {project.ragStatus}
                              </td>
                            </tr>
                            {expandedProject === project.id && project.upcomingMilestoneDetails?.length > 0 && (
                              <tr>
                                <td colSpan="5" style={{ padding: 0, backgroundColor: '#f9fafb' }}>
                                  <div style={{ padding: '12px 20px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Upcoming Milestone Details:</h4>
                                    <table style={{ width: '100%', fontSize: '13px' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Milestone Ref</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Milestone Name</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Planned Start</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Planned End</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Days Until Due</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {project.upcomingMilestoneDetails.map((milestone, idx) => {
                                          const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                                          const daysUntilDue = endDate ? Math.ceil((endDate - todayCalc) / (1000 * 60 * 60 * 24)) : 0;
                                          return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                              <td style={{ padding: '8px' }}>{milestone['Milestone Ref'] || '-'}</td>
                                              <td style={{ padding: '8px' }}>{milestone['Milestone / Task Name'] || 'Unnamed'}</td>
                                              <td style={{ padding: '8px' }}>{formatDateDisplay(milestone['Planned Start Date'])}</td>
                                              <td style={{ padding: '8px', color: '#3b82f6' }}>{formatDateDisplay(milestone['Planned End Date'])}</td>
                                              <td style={{ padding: '8px', color: '#3b82f6', fontWeight: '600' }}>{daysUntilDue} days</td>
                                              <td style={{ padding: '8px' }}>{milestone.Status || 'Not Started'}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No projects with upcoming milestones in the next 14 days.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Open Critical Risks Modal */}
        {showOpenCriticalRisksModal && (
          <div className="modal-overlay" onClick={() => setShowOpenCriticalRisksModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Open Critical Risks (High & Critical)</h2>
                <button onClick={() => setShowOpenCriticalRisksModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {portfolioData.projects?.filter(p => (p.openCriticalRisks || 0) > 0).length > 0 ? (
                  <table className="portfolio-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}></th>
                        <th>Project Name</th>
                        <th>Open Critical Risks</th>
                        <th>Status</th>
                        <th>RAG Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.projects
                        .filter(p => (p.openCriticalRisks || 0) > 0)
                        .sort((a, b) => (b.openCriticalRisks || 0) - (a.openCriticalRisks || 0))
                        .map(project => (
                          <React.Fragment key={project.id}>
                            <tr 
                              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {expandedProject === project.id ? '▼' : '▶'}
                                </span>
                              </td>
                              <td>{project.name}</td>
                              <td style={{ color: '#dc2626', fontWeight: '600' }}>{project.openCriticalRisks}</td>
                              <td>{project.status}</td>
                              <td>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                                {project.ragStatus}
                              </td>
                            </tr>
                            {expandedProject === project.id && project.openCriticalRisksDetails?.length > 0 && (
                              <tr>
                                <td colSpan="5" style={{ padding: 0, backgroundColor: '#f9fafb' }}>
                                  <div style={{ padding: '12px 20px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Open Critical Risk Details:</h4>
                                    <table style={{ width: '100%', fontSize: '13px' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Severity</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Date Raised</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Owner</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {project.openCriticalRisksDetails.map((risk, idx) => (
                                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '8px' }}>{risk['RAID ID'] || risk.ID || '-'}</td>
                                            <td style={{ padding: '8px' }}>{risk.Description || 'No description'}</td>
                                            <td style={{ padding: '8px', color: risk.Severity?.toLowerCase() === 'critical' ? '#dc2626' : '#f59e0b', fontWeight: '600' }}>{risk.Severity || '-'}</td>
                                            <td style={{ padding: '8px' }}>{formatDateDisplay(risk['Date Raised'])}</td>
                                            <td style={{ padding: '8px' }}>{risk.Owner || '-'}</td>
                                            <td style={{ padding: '8px' }}>{risk.Status || 'Open'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No projects with open critical risks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Open Critical Issues Modal */}
        {showOpenCriticalIssuesModal && (
          <div className="modal-overlay" onClick={() => setShowOpenCriticalIssuesModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Projects with Open Critical Issues</h2>
                <button onClick={() => setShowOpenCriticalIssuesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                {portfolioData.projects?.filter(p => (p.openCriticalIssues || 0) > 0).length > 0 ? (
                  <table className="portfolio-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}></th>
                        <th>Project Name</th>
                        <th>Open Critical Issues</th>
                        <th>Status</th>
                        <th>RAG Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.projects
                        .filter(p => (p.openCriticalIssues || 0) > 0)
                        .sort((a, b) => (b.openCriticalIssues || 0) - (a.openCriticalIssues || 0))
                        .map(project => (
                          <React.Fragment key={project.id}>
                            <tr 
                              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {expandedProject === project.id ? '▼' : '▶'}
                                </span>
                              </td>
                              <td>{project.name}</td>
                              <td style={{ color: '#dc2626', fontWeight: '600' }}>{project.openCriticalIssues}</td>
                              <td>{project.status}</td>
                              <td>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus), marginRight: '8px' }} />
                                {project.ragStatus}
                              </td>
                            </tr>
                            {expandedProject === project.id && project.openCriticalIssuesDetails?.length > 0 && (
                              <tr>
                                <td colSpan="5" style={{ padding: 0, backgroundColor: '#f9fafb' }}>
                                  <div style={{ padding: '12px 20px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>Open Critical Issue Details:</h4>
                                    <table style={{ width: '100%', fontSize: '13px' }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Date Raised</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Owner</th>
                                          <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {project.openCriticalIssuesDetails.map((issue, idx) => (
                                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '8px' }}>{issue['RAID ID'] || issue.ID || '-'}</td>
                                            <td style={{ padding: '8px' }}>{issue.Description || 'No description'}</td>
                                            <td style={{ padding: '8px' }}>{formatDateDisplay(issue['Date Raised'])}</td>
                                            <td style={{ padding: '8px' }}>{issue.Owner || '-'}</td>
                                            <td style={{ padding: '8px' }}>{issue.Status || 'Open'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No projects with open critical issues.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio;
