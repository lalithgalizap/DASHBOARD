import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PortfolioMetrics from '../components/PortfolioMetrics';
import './Portfolio.css';

function Portfolio() {
  const [portfolioData, setPortfolioData] = useState({
    projects: [],
    totalActiveProjects: 0
  });
  const [loading, setLoading] = useState(true);
  const [showRAGProjectsModal, setShowRAGProjectsModal] = useState(false);
  const [showUpdatedProjectsModal, setShowUpdatedProjectsModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOpenCriticalRisksModal, setShowOpenCriticalRisksModal] = useState(false);
  const [showOpenCriticalIssuesModal, setShowOpenCriticalIssuesModal] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [criticalExpanded, setCriticalExpanded] = useState(null);
  const [criticalModalExpanded, setCriticalModalExpanded] = useState(null);
  const [criticalSearch, setCriticalSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [ragSummaryExpanded, setRagSummaryExpanded] = useState(null);
  const [ragProjectExpanded, setRagProjectExpanded] = useState(null);
  const [milestoneTooltip, setMilestoneTooltip] = useState(null);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragExpandedProjectId, setRagExpandedProjectId] = useState(null);
  const [ragCategoryModal, setRagCategoryModal] = useState(null);

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
              
              // Get ALL milestones with dates for timeline visualization
              const allMilestoneDetails = milestones.filter(m => {
                return m['Planned End Date'] && convertExcelDateToJS(m['Planned End Date']) !== null;
              });
              
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
              
              return { ...project, ragStatus, overdueMilestones, overdueMilestoneDetails, upcomingMilestones, upcomingMilestoneDetails, allMilestoneDetails, overdueTasks, openCriticalRisks, openCriticalRisksDetails, openCriticalIssues, openCriticalIssuesDetails, projectCharter: documents.projectCharter };
            } catch (err) {
              // If documents fail to load, default to Green but still try to get charter from project if available
              return { ...project, ragStatus: 'Green', overdueMilestones: 0, overdueMilestoneDetails: [], upcomingMilestones: 0, upcomingMilestoneDetails: [], allMilestoneDetails: [], overdueTasks: 0, openCriticalRisks: 0, openCriticalRisksDetails: [], openCriticalIssues: 0, openCriticalIssuesDetails: [], projectCharter: project.projectCharter || null };
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
        
        const isActiveStatus = (status) => {
          const normalized = (status || '').toLowerCase();
          return normalized !== 'completed' && normalized !== 'cancelled';
        };

        const activeEligibleProjects = projectsWithRAG.filter(p => isActiveStatus(p.status));
        const activeCount = activeEligibleProjects.length;
        
        // Calculate RAG counts (excluding completed/cancelled)
        const projectsByRAG = {
          green: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'green').length,
          amber: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'amber').length,
          red: activeEligibleProjects.filter(p => p.ragStatus?.toLowerCase() === 'red').length
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

  const getProjectOwner = (project) => {
    const owner = project.project_owner || project.owner || project.projectOwner || project.Owner;
    if (owner) return owner;
    
    // Check all possible charter data paths
    const charter = project.projectCharter || project.documents?.projectCharter;
    if (!charter) return 'Unassigned';
    
    // Try basicInfo paths
    if (charter.basicInfo?.projectManager) return charter.basicInfo.projectManager;
    if (charter.basicInfo?.['Project Manager']) return charter.basicInfo['Project Manager'];
    
    // Try direct charter properties
    if (charter.projectManager) return charter.projectManager;
    if (charter['Project Manager']) return charter['Project Manager'];
    
    // Try rawData path (from Excel parsing)
    if (charter.rawData) {
      // Cell C8 would be row 7, col 2 in 0-indexed array
      const row7 = charter.rawData[7];
      if (row7 && row7[2]) return row7[2];
    }
    
    return 'Unassigned';
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'No update yet';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No update yet';
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  // Timeline helper functions for RAG board project cards
  const getMilestoneStatus = (milestone) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = convertExcelDateToJS(milestone['Planned End Date']);
    if (!endDate) return 'unknown';
    endDate.setHours(0, 0, 0, 0);
    const isCompleted = milestone.Status && (milestone.Status.toLowerCase() === 'completed' || milestone.Status.toLowerCase() === 'complete');
    if (isCompleted) return 'completed';
    if (endDate < today) return 'overdue';
    const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (endDate <= fourteenDaysFromNow) return 'upcoming';
    return 'future';
  };

  const getMilestoneColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981'; // green
      case 'overdue': return '#ef4444'; // red
      case 'upcoming': return '#f59e0b'; // amber
      case 'future': return '#9ca3af'; // gray
      default: return '#6b7280';
    }
  };

  const calculateTimelineRange = (milestones) => {
    if (!milestones || milestones.length === 0) return null;
    const dates = milestones
      .map(m => convertExcelDateToJS(m['Planned End Date']))
      .filter(d => d !== null);
    if (dates.length === 0) return null;
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    // Add buffer days
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);
    return { start: minDate, end: maxDate };
  };

  const getMilestonePosition = (milestoneDate, range) => {
    if (!milestoneDate || !range) return 50;
    const date = convertExcelDateToJS(milestoneDate);
    if (!date) return 50;
    const totalDuration = range.end.getTime() - range.start.getTime();
    const position = date.getTime() - range.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  };

  const getTodayPosition = (range) => {
    if (!range) return 50;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDuration = range.end.getTime() - range.start.getTime();
    const position = today.getTime() - range.start.getTime();
    return Math.max(0, Math.min(100, (position / totalDuration) * 100));
  };

  const formatMilestoneDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const date = convertExcelDateToJS(dateValue);
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const ragBuckets = useMemo(() => ({
    red: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'red'),
    amber: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'amber'),
    green: (portfolioData.projects || []).filter(p => p.ragStatus?.toLowerCase() === 'green')
  }), [portfolioData.projects]);

  const activeProjectsList = useMemo(() => {
    return (portfolioData.projects || []).filter(p => (p.status || '').toLowerCase() !== 'completed');
  }, [portfolioData.projects]);

  const freshnessLists = useMemo(() => {
    const fresh = [...(portfolioData.updatedThisWeek || [])].sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
    const stale = [...(portfolioData.notUpdated || [])].sort((a, b) => new Date(a.lastModified || 0) - new Date(b.lastModified || 0));
    const missing = portfolioData.noData || [];
    return { fresh, stale, missing };
  }, [portfolioData.updatedThisWeek, portfolioData.notUpdated, portfolioData.noData]);

  const allCriticalItems = useMemo(() => {
    const projects = portfolioData.projects || [];
    const risks = projects.flatMap(project => (project.openCriticalRisksDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-risk-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Risk Title'] || 'Risk',
      owner: item.Owner || item['Owner'] || 'Unassigned',
      severity: item.Severity || 'High',
      type: 'Risk'
    })));

    const issues = projects.flatMap(project => (project.openCriticalIssuesDetails || []).map((item, index) => ({
      id: `${project.id || project._id}-issue-${index}`,
      projectName: project.name,
      title: item.Title || item.Description || item['Issue Title'] || 'Issue',
      owner: item.Owner || item['Owner'] || 'Unassigned',
      severity: item.Severity || 'High',
      type: 'Issue'
    })));

    return [...risks, ...issues];
  }, [portfolioData.projects]);

  const criticalProjects = useMemo(() => {
    return (portfolioData.projects || [])
      .map(project => {
        const risks = (project.openCriticalRisksDetails || []).map((item, index) => ({
          id: `${project.id || project._id}-risk-side-${index}`,
          title: item.Title || item.Description || item['Risk Title'] || 'Risk',
          owner: item.Owner || item['Owner'] || 'Unassigned',
          severity: item.Severity || 'High',
          type: 'Risk'
        }));
        const issues = (project.openCriticalIssuesDetails || []).map((item, index) => ({
          id: `${project.id || project._id}-issue-side-${index}`,
          title: item.Title || item.Description || item['Issue Title'] || 'Issue',
          owner: item.Owner || item['Owner'] || 'Unassigned',
          severity: item.Severity || 'High',
          type: 'Issue'
        }));
        const items = [...risks, ...issues];
        if (!items.length) return null;
        return {
          id: project.id || project._id,
          name: project.name,
          owner: getProjectOwner(project),
          client: project.clients || '—',
          ragStatus: project.ragStatus || 'Green',
          items
        };
      })
      .filter(Boolean);
  }, [portfolioData.projects]);

  const activeProjectsFiltered = useMemo(() => (
    (portfolioData.projects || []).filter(p => {
      const status = (p.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    })
  ), [portfolioData.projects]);

  const filteredActiveProjects = useMemo(() => {
    if (!activeSearch.trim()) return activeProjectsFiltered;
    const term = activeSearch.toLowerCase();
    return activeProjectsFiltered.filter(project =>
      project.name.toLowerCase().includes(term) ||
      (project.clients || '').toLowerCase().includes(term) ||
      (project.status || '').toLowerCase().includes(term) ||
      (project.ragStatus || '').toLowerCase().includes(term)
    );
  }, [activeProjectsFiltered, activeSearch]);

  const filteredRagBuckets = useMemo(() => {
    const valid = (project) => {
      const status = (project.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    };
    return {
      red: ragBuckets.red.filter(valid),
      amber: ragBuckets.amber.filter(valid),
      green: ragBuckets.green.filter(valid)
    };
  }, [ragBuckets]);

  const staleProjectsList = useMemo(() => ([...freshnessLists.stale, ...freshnessLists.missing]), [freshnessLists]);

  const filteredCriticalProjects = useMemo(() => {
    if (!criticalSearch.trim()) return criticalProjects;
    const term = criticalSearch.toLowerCase();
    return criticalProjects.filter(project =>
      project.name.toLowerCase().includes(term) ||
      project.owner.toLowerCase().includes(term) ||
      project.client.toLowerCase().includes(term)
    );
  }, [criticalProjects, criticalSearch]);

  const staleProjects = staleProjectsList.length;
  const criticalTotal = allCriticalItems.length;
  const summaryHighlights = [
    {
      label: 'Active Projects',
      value: activeProjectsFiltered.length,
      helper: 'In-flight initiatives',
      tone: 'primary',
      type: 'active'
    },
    {
      label: 'Projects by RAG',
      value: `${filteredRagBuckets.green.length}/${filteredRagBuckets.amber.length}/${filteredRagBuckets.red.length}`,
      helper: 'Green / Amber / Red',
      tone: 'warning',
      type: 'rag'
    },
    {
      label: 'Critical Items',
      value: criticalTotal,
      helper: 'Risks & Issues',
      tone: 'danger',
      type: 'critical'
    },
    {
      label: 'Stale / Missing Updates',
      value: staleProjects,
      helper: 'Older than 7 days',
      tone: 'muted',
      type: 'stale'
    }
  ];

  const freshnessBarWidth = (dateString, invert = false) => {
    if (!dateString) return invert ? '15%' : '85%';
    const diffDays = Math.min(14, Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))));
    const width = invert ? Math.min(90, diffDays * 6 + 20) : Math.max(15, 90 - diffDays * 6);
    return `${width}%`;
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
        <section className="portfolio-exec-strip">
          {summaryHighlights.map(item => (
            <button
              key={item.label}
              type="button"
              className={`exec-card exec-${item.tone} exec-clickable`}
              onClick={() => setSummaryModal(item.type)}
            >
              <span className="exec-label">{item.label}</span>
              <span className="exec-value">{item.value}</span>
              <span className="exec-helper">{item.helper}</span>
            </button>
          ))}
        </section>

        {/* Portfolio Metrics Cards */}
        <PortfolioMetrics 
          metrics={portfolioData} 
          onMetricClick={(type) => {
            if (type === 'rag') setShowRAGProjectsModal(true);
            if (type === 'updated') setShowUpdatedProjectsModal(true);
            if (type === 'overdue') setShowOverdueMilestonesModal(true);
            if (type === 'upcoming') setShowUpcomingMilestonesModal(true);
            if (type === 'criticalRisks') setShowOpenCriticalRisksModal(true);
            if (type === 'criticalIssues') setShowOpenCriticalIssuesModal(true);
          }}
        />

      {/* RAG Board Search */}
      <div className="rag-board-search-container" style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>Search Projects:</span>
        <input
          type="text"
          placeholder="Search by project name, client, or owner..."
          value={ragSearchQuery}
          onChange={(e) => setRagSearchQuery(e.target.value)}
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        {ragSearchQuery && (
          <button
            onClick={() => setRagSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        )}
      </div>

      <section className="portfolio-rag-board">
        {['red', 'amber', 'green'].map(status => {
          // Filter projects based on search query
          const filteredProjects = ragBuckets[status].filter(project => {
            if (!ragSearchQuery.trim()) return true;
            const query = ragSearchQuery.toLowerCase();
            const nameMatch = project.name?.toLowerCase().includes(query);
            const clientMatch = project.clients?.toLowerCase().includes(query);
            const ownerMatch = project.projectCharter?.['Project Owner']?.toLowerCase().includes(query);
            return nameMatch || clientMatch || ownerMatch;
          });
          const previewProjects = filteredProjects.slice(0, 3);
          const hasMoreProjects = filteredProjects.length > 3;

          return (
            <div key={status} className={`rag-column rag-${status}`}>
              <div className="rag-column-header">
                <div>
                  <span className="rag-column-label">{status === 'red' ? 'Critical' : status === 'amber' ? 'Caution' : 'On Track'}</span>
                  <p className="rag-column-helper">{status === 'green' ? 'Monitoring' : 'Immediate follow-up'}</p>
                </div>
                <span className="rag-column-count">{filteredProjects.length}</span>
              </div>
              <div className="rag-column-body">
                {filteredProjects.length === 0 && (
                  <p className="rag-empty">{ragSearchQuery ? 'No matching projects' : 'No projects in this band'}</p>
                )}
                {previewProjects.map(project => {
                    const projectId = project.id || project._id;
                    const isProjectExpanded = ragExpandedProjectId === projectId;
                    const allMilestones = project.allMilestoneDetails || [];
                    const timelineRange = calculateTimelineRange(allMilestones);
                    const todayPosition = getTodayPosition(timelineRange);

                    return (
                      <div key={projectId} className="rag-project-card" style={{ position: 'relative' }}>
                        {/* Compact Project Name Row - Always Visible */}
                        <div
                          onClick={() => setRagExpandedProjectId(isProjectExpanded ? null : projectId)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            backgroundColor: isProjectExpanded ? '#f3f4f6' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {isProjectExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{project.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {project.overdueMilestones > 0 && (
                              <span style={{ fontSize: '11px', color: '#ef4444' }}>🔴 {project.overdueMilestones}</span>
                            )}
                            {project.upcomingMilestones > 0 && (
                              <span style={{ fontSize: '11px', color: '#f59e0b' }}>🟡 {project.upcomingMilestones}</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded Project Details */}
                        {isProjectExpanded && (
                          <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
                            <div className="rag-project-meta" style={{ marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>{project.clients || 'Client TBD'}</span>
                              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                                RAG: <span style={{ fontWeight: 500, color: getMilestoneColor(project.ragStatus?.toLowerCase() === 'red' ? 'overdue' : project.ragStatus?.toLowerCase() === 'amber' ? 'upcoming' : 'completed') }}>{project.ragStatus || 'Green'}</span>
                              </span>
                            </div>

                            {/* Interactive Timeline */}
                            {allMilestones.length > 0 && timelineRange && (
                              <div className="rag-timeline-container">
                                <div className="rag-timeline-labels">
                                  <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short' })}</span>
                                  <span className="rag-timeline-today">Today</span>
                                  <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                                <div className="rag-timeline-track">
                                  {/* Timeline bar segments */}
                                  <div className="rag-timeline-past" style={{ width: `${todayPosition}%` }} />
                                  <div className="rag-timeline-future" style={{ width: `${100 - todayPosition}%` }} />

                                  {/* Today marker */}
                                  <div
                                    className="rag-timeline-today-marker"
                                    style={{ left: `${todayPosition}%` }}
                                    title="Today"
                                  />

                                  {/* Milestone dots */}
                                  {allMilestones.slice(0, 5).map((milestone, idx) => {
                                    const milestoneStatus = getMilestoneStatus(milestone);
                                    const position = getMilestonePosition(milestone['Planned End Date'], timelineRange);
                                    const milestoneName = milestone['Milestone / Task Name'] || milestone['Milestone Name'] || milestone['Milestone'] || milestone['Task Name'] || milestone['Name'] || `M${idx + 1}`;
                                    const milestoneDate = formatMilestoneDate(milestone['Planned End Date']);

                                    return (
                                      <div
                                        key={idx}
                                        className={`rag-timeline-dot rag-timeline-dot-${milestoneStatus}`}
                                        style={{ left: `${position}%` }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const isSame = milestoneTooltip && 
                                            milestoneTooltip.projectId === projectId && 
                                            milestoneTooltip.milestoneIndex === idx;
                                          if (isSame) {
                                            setMilestoneTooltip(null);
                                          } else {
                                            setMilestoneTooltip({
                                              projectId: projectId,
                                              milestoneIndex: idx,
                                              name: milestoneName,
                                              date: milestoneDate,
                                              status: milestoneStatus,
                                              milestone: milestone
                                            });
                                          }
                                        }}
                                        title={`${milestoneName}: ${milestoneDate}`}
                                      />
                                    );
                                  })}
                                </div>

                                {/* Milestone summary */}
                                <div className="rag-timeline-summary">
                                  <span className="rag-summary-item rag-summary-overdue">
                                    🔴 {project.overdueMilestones || 0} overdue
                                  </span>
                                  <span className="rag-summary-item rag-summary-upcoming">
                                    🟡 {(project.upcomingMilestones || 0)} upcoming
                                  </span>
                                  {allMilestones.length > 5 && (
                                    <span className="rag-summary-item">+{allMilestones.length - 5} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Show message if no milestones */}
                            {allMilestones.length === 0 && (
                              <div className="rag-timeline-empty">
                                <span>No milestone data available</span>
                              </div>
                            )}

                            {/* Quick stats row */}
                            <div className="rag-project-quick-stats">
                              <span className="rag-stat-badge rag-stat-risks">
                                🔴 {project.openCriticalRisks || 0}
                              </span>
                              <span className="rag-stat-badge rag-stat-issues">
                                ⚠️ {project.openCriticalIssues || 0}
                              </span>
                            </div>

                            {/* Milestone Tooltip - Rendered inside card */}
                            {milestoneTooltip && milestoneTooltip.projectId === projectId && (
                              <div
                                className="milestone-tooltip"
                                style={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: '10px',
                                  transform: 'translateX(-50%)',
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                  zIndex: 100,
                                  minWidth: '260px',
                                  maxWidth: '280px'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Milestone</div>
                                    <strong style={{ fontSize: '15px', color: '#111827', display: 'block' }}>
                                      {milestoneTooltip.milestone?.['Milestone / Task Name'] || milestoneTooltip.milestone?.['Milestone Name'] || milestoneTooltip.milestone?.['Milestone'] || milestoneTooltip.milestone?.['Task Name'] || milestoneTooltip.milestone?.['Name'] || milestoneTooltip.name}
                                    </strong>
                                  </div>
                                  <button
                                    onClick={() => setMilestoneTooltip(null)}
                                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280', padding: 0, marginLeft: '8px' }}
                                  >
                                    ×
                                  </button>
                                </div>

                                {/* Status Badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: getMilestoneColor(milestoneTooltip.status)
                                    }}
                                  />
                                  <span style={{ color: getMilestoneColor(milestoneTooltip.status), fontWeight: 600, fontSize: '13px', textTransform: 'uppercase' }}>
                                    {milestoneTooltip.status}
                                  </span>
                                </div>

                                {/* Details Grid */}
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Planned End:</span>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.date}</span>
                                  </div>
                                  {milestoneTooltip.milestone?.['Actual End Date'] && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Actual End:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                        {formatMilestoneDate(milestoneTooltip.milestone['Actual End Date'])}
                                      </span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.Status && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Status:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Status}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.Owner && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Owner:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.Owner}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.WBS && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>WBS:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone.WBS}</span>
                                    </div>
                                  )}
                                  {milestoneTooltip.milestone?.['Milestone Ref'] && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Ref:</span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{milestoneTooltip.milestone['Milestone Ref']}</span>
                                    </div>
                                  )}
                                </div>
                                {milestoneTooltip.milestone?.Description && (
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Description</div>
                                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
                                      {milestoneTooltip.milestone.Description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* View All Button */}
                  {hasMoreProjects && (
                    <button
                      onClick={() => setRagCategoryModal({ status, projects: filteredProjects, title: status === 'red' ? 'Critical' : status === 'amber' ? 'Caution' : 'On Track' })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '8px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>View All</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>({filteredProjects.length})</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
            </div>
          );
        })}
      </section>

      <div className="portfolio-main-grid">
        <div className="portfolio-main-left">
          <div className="portfolio-table-section">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Owner</th>
                  <th>Client</th>
                  <th>RAG</th>
                  <th>Overdue</th>
                  <th>Upcoming</th>
                  <th>Risks</th>
                  <th>Issues</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.projects.map(project => (
                  <React.Fragment key={project._id || project.id}>
                    <tr onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="project-name-cell">
                          {project.name}
                          <div className="project-identifier">{project.project_identifier || 'No ID'}</div>
                        </div>
                      </td>
                      <td>{getProjectOwner(project)}</td>
                      <td>{project.clients || '—'}</td>
                      <td>
                        <div className="rag-cell">
                          <span className="rag-indicator" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                          <span className="rag-text">{project.ragStatus || 'Green'}</span>
                        </div>
                      </td>
                      <td className="number-cell">{project.overdueMilestones}</td>
                      <td className="number-cell">{project.upcomingMilestones}</td>
                      <td className="number-cell">{project.openCriticalRisks}</td>
                      <td className="number-cell">{project.openCriticalIssues}</td>
                      <td className="date-cell">{formatDate(project.lastUpdated || project.updated_at)}</td>
                    </tr>
                    {expandedProject === project.id && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="expanded-content">
                            <div>
                              <h4>Overdue Milestones</h4>
                              {project.overdueMilestoneDetails?.length ? (
                                <ul>
                                  {project.overdueMilestoneDetails.map((milestone, index) => (
                                    <li key={index}>
                                      <strong>{milestone['Milestone Name'] || milestone['Milestone'] || `Milestone ${index + 1}`}</strong>
                                      <span> — Planned End: {formatDateDisplay(milestone['Planned End Date'])}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No overdue milestones</p>
                              )}
                            </div>
                            <div>
                              <h4>Upcoming Milestones (14 days)</h4>
                              {project.upcomingMilestoneDetails?.length ? (
                                <ul>
                                  {project.upcomingMilestoneDetails.map((milestone, index) => (
                                    <li key={index}>
                                      <strong>{milestone['Milestone Name'] || milestone['Milestone'] || `Milestone ${index + 1}`}</strong>
                                      <span> — Planned End: {formatDateDisplay(milestone['Planned End Date'])}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No upcoming milestones</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="portfolio-main-right">
          <section className="freshness-card">
            <div className="freshness-header">
              <h3>Update Pulse</h3>
              <span>{freshnessLists.fresh.length} updated / {freshnessLists.stale.length + freshnessLists.missing.length} pending</span>
            </div>
            <div className="freshness-groups">
              <div className="freshness-group">
                <h4>Updated this week</h4>
                {freshnessLists.fresh.length === 0 && <p className="freshness-empty">No recent updates</p>}
                {freshnessLists.fresh.slice(0, 5).map(project => (
                  <div key={`fresh-${project.id || project._id}`} className="freshness-row">
                    <div>
                      <div className="freshness-name">{project.name}</div>
                      <div className="freshness-meta">{formatRelativeTime(project.lastModified)}</div>
                    </div>
                    <div className="freshness-bar fill">
                      <span style={{ width: freshnessBarWidth(project.lastModified) }}></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="freshness-group">
                <h4>Needs update</h4>
                {freshnessLists.stale.length === 0 && <p className="freshness-empty">All projects up to date</p>}
                {freshnessLists.stale.slice(0, 5).map(project => (
                  <div key={`stale-${project.id || project._id}`} className="freshness-row">
                    <div>
                      <div className="freshness-name">{project.name}</div>
                      <div className="freshness-meta">Last touch: {formatRelativeTime(project.lastModified)}</div>
                    </div>
                    <div className="freshness-bar outline">
                      <span style={{ width: freshnessBarWidth(project.lastModified, true) }}></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="freshness-group">
                <h4>No data yet</h4>
                {freshnessLists.missing.length === 0 && <p className="freshness-empty">All projects reporting</p>}
                {freshnessLists.missing.slice(0, 4).map(project => (
                  <div key={`missing-${project.id || project._id}`} className="freshness-row no-data">
                    <div>
                      <div className="freshness-name">{project.name}</div>
                      <div className="freshness-meta">Awaiting first upload</div>
                    </div>
                    <span className="freshness-tag">Follow up</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {summaryModal && (
        <div className="modal-overlay" onClick={() => { setSummaryModal(null); setCriticalSearch(''); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', maxWidth: '1000px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{summaryModal === 'active' && 'Active Projects'}{summaryModal === 'rag' && 'Projects by RAG'}{summaryModal === 'critical' && 'Portfolio Critical Items'}{summaryModal === 'stale' && 'Stale or Missing Updates'}</h2>
              <button type="button" onClick={() => { setSummaryModal(null); setCriticalSearch(''); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {summaryModal === 'critical' && (
                <div className="critical-search">
                  <input
                    type="text"
                    placeholder="Search by project, owner, or client"
                    value={criticalSearch}
                    onChange={e => setCriticalSearch(e.target.value)}
                  />
                </div>
              )}

              {summaryModal === 'rag' && (
                <div className="rag-summary-modal">
                  {['green', 'amber', 'red'].map(status => (
                    <div key={`rag-summary-${status}`} className={`rag-summary-card rag-summary-${status}`}>
                      <button
                        type="button"
                        className="rag-summary-header"
                        onClick={() => setRagSummaryExpanded(ragSummaryExpanded === status ? null : status)}
                      >
                        <div className="rag-summary-header-left">
                          <div className="rag-summary-label">{status === 'green' ? 'Green' : status === 'amber' ? 'Amber' : 'Red'}</div>
                          <p className="rag-summary-helper">{filteredRagBuckets[status].length} projects</p>
                        </div>
                        <div className="rag-summary-header-right">
                          <span className={`rag-summary-chevron ${ragSummaryExpanded === status ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {ragSummaryExpanded === status && (
                        <div className="rag-summary-projects">
                          {filteredRagBuckets[status].length > 0 ? (
                            <ul className="rag-summary-list">
                              {filteredRagBuckets[status].map(project => (
                                <li key={`rag-summary-${status}-${project.id || project._id}`} className="rag-summary-project-item">
                                  <button
                                    type="button"
                                    className="rag-summary-project-header"
                                    onClick={() => setRagProjectExpanded(ragProjectExpanded === `${status}-${project.id || project._id}` ? null : `${status}-${project.id || project._id}`)}
                                  >
                                    <div className="rag-summary-project-name">{project.name}</div>
                                    <span className={`rag-summary-chevron ${ragProjectExpanded === `${status}-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                                  </button>
                                  {ragProjectExpanded === `${status}-${project.id || project._id}` && (
                                    <div className="rag-summary-project-metrics">
                                      <span>{project.overdueMilestones || 0} overdue</span>
                                      <span>{project.openCriticalRisks || 0} risks</span>
                                      <span>{project.openCriticalIssues || 0} issues</span>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="rag-summary-empty">No projects in this band</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {summaryModal === 'active' && (
                <div className="rag-summary-modal">
                  <div className="critical-search" style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Search by project, client, status, or RAG"
                      value={activeSearch}
                      onChange={e => setActiveSearch(e.target.value)}
                    />
                  </div>
                  {filteredActiveProjects.length > 0 ? (
                    <ul className="rag-summary-list">
                      {filteredActiveProjects.map(project => (
                        <li key={`active-${project.id || project._id}`} className="rag-summary-project-item">
                          <button
                            type="button"
                            className="rag-summary-project-header"
                            onClick={() => setRagProjectExpanded(ragProjectExpanded === `active-${project.id || project._id}` ? null : `active-${project.id || project._id}`)}
                          >
                            <div className="rag-summary-project-name">{project.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                              <span className={`rag-summary-chevron ${ragProjectExpanded === `active-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                            </div>
                          </button>
                          {ragProjectExpanded === `active-${project.id || project._id}` && (
                            <div className="rag-summary-project-metrics">
                              <span>{getProjectOwner(project)}</span>
                              <span>{project.clients || '—'}</span>
                              <span>{project.status || '—'}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No active projects</p>
                  )}
                </div>
              )}

              {summaryModal === 'critical' && (
                <div className="critical-accordion">
                  {filteredCriticalProjects.map(project => (
                    <div key={`critical-modal-project-${project.id}`} className="critical-project">
                      <button
                        type="button"
                        className="critical-project-header"
                        onClick={() => setCriticalModalExpanded(criticalModalExpanded === project.id ? null : project.id)}
                      >
                        <div className="critical-project-info">
                          <div className="critical-project-name">{project.name}</div>
                          <div className="critical-meta">
                            <span>{project.owner}</span>
                            <span>•</span>
                            <span>{project.client}</span>
                            <span>•</span>
                            <span>{project.items.length} items</span>
                          </div>
                        </div>
                        <div className="critical-project-right">
                          <span className="critical-status-dot" style={{ backgroundColor: getRAGColor(project.ragStatus) }}></span>
                          <span className={`critical-chevron ${criticalModalExpanded === project.id ? 'open' : ''}`}>⌄</span>
                        </div>
                      </button>
                      {criticalModalExpanded === project.id && (
                        <ul className="critical-list">
                          {project.items.map(item => (
                            <li key={`critical-modal-${item.id}`} className={`critical-item critical-${item.type.toLowerCase()}`}>
                              <div className="critical-type">{item.type}</div>
                              <div className="critical-title">{item.title}</div>
                              <div className="critical-meta">
                                <span>{item.owner}</span>
                                <span>•</span>
                                <span>{item.severity}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {summaryModal === 'stale' && (
                <div className="rag-summary-modal">
                  {staleProjectsList.length > 0 ? (
                    <ul className="rag-summary-list">
                      {staleProjectsList.map(project => (
                        <li key={`stale-${project.id || project._id}`} className="rag-summary-project-item">
                          <button
                            type="button"
                            className="rag-summary-project-header"
                            onClick={() => setRagProjectExpanded(ragProjectExpanded === `stale-${project.id || project._id}` ? null : `stale-${project.id || project._id}`)}
                          >
                            <div className="rag-summary-project-name">{project.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                              <span className={`rag-summary-chevron ${ragProjectExpanded === `stale-${project.id || project._id}` ? 'open' : ''}`}>⌄</span>
                            </div>
                          </button>
                          {ragProjectExpanded === `stale-${project.id || project._id}` && (
                            <div className="rag-summary-project-metrics">
                              <span>{project.status || '—'}</span>
                              <span>{project.lastModified ? formatDate(project.lastModified) : 'No data'}</span>
                              <span>{project.clients || '—'}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No stale or missing updates</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAG Category Modal - View All Projects */}
      {ragCategoryModal && (
        <div className="modal-overlay" onClick={() => setRagCategoryModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', maxWidth: '900px', width: '90%', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{ragCategoryModal.title} Projects ({ragCategoryModal.projects.length})</h2>
              <button type="button" onClick={() => setRagCategoryModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {ragCategoryModal.projects.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>No projects in this category</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ragCategoryModal.projects.map(project => {
                    const projectId = project.id || project._id;
                    const isProjectExpanded = ragExpandedProjectId === `modal-${projectId}`;
                    const allMilestones = project.allMilestoneDetails || [];
                    const timelineRange = calculateTimelineRange(allMilestones);
                    const todayPosition = getTodayPosition(timelineRange);

                    return (
                      <div key={projectId} className="rag-modal-project-card" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Compact Project Name Row */}
                        <div
                          onClick={() => setRagExpandedProjectId(isProjectExpanded ? null : `modal-${projectId}`)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            backgroundColor: isProjectExpanded ? '#f9fafb' : 'white',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {isProjectExpanded ? '▼' : '▶'}
                            </span>
                            <div>
                              <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{project.name}</span>
                              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '12px' }}>{project.clients || 'Client TBD'}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {project.overdueMilestones > 0 && (
                              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>🔴 {project.overdueMilestones}</span>
                            )}
                            {project.upcomingMilestones > 0 && (
                              <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>🟡 {project.upcomingMilestones}</span>
                            )}
                            {project.openCriticalRisks > 0 && (
                              <span style={{ fontSize: '12px', color: '#ef4444' }}>🔴 {project.openCriticalRisks}</span>
                            )}
                            {project.openCriticalIssues > 0 && (
                              <span style={{ fontSize: '12px', color: '#f59e0b' }}>⚠️ {project.openCriticalIssues}</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded Project Details */}
                        {isProjectExpanded && (
                          <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                            {/* Timeline */}
                            {allMilestones.length > 0 && timelineRange && (
                              <div className="rag-timeline-container" style={{ marginBottom: '12px' }}>
                                <div className="rag-timeline-labels">
                                  <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short' })}</span>
                                  <span className="rag-timeline-today">Today</span>
                                  <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short' })}</span>
                                </div>
                                <div className="rag-timeline-track">
                                  <div className="rag-timeline-past" style={{ width: `${todayPosition}%` }} />
                                  <div className="rag-timeline-future" style={{ width: `${100 - todayPosition}%` }} />
                                  <div className="rag-timeline-today-marker" style={{ left: `${todayPosition}%` }} title="Today" />
                                  {allMilestones.slice(0, 5).map((milestone, idx) => {
                                    const milestoneStatus = getMilestoneStatus(milestone);
                                    const position = getMilestonePosition(milestone['Planned End Date'], timelineRange);
                                    const milestoneName = milestone['Milestone / Task Name'] || milestone['Milestone Name'] || milestone['Milestone'] || milestone['Task Name'] || milestone['Name'] || `M${idx + 1}`;
                                    const milestoneDate = formatMilestoneDate(milestone['Planned End Date']);

                                    return (
                                      <div
                                        key={idx}
                                        className={`rag-timeline-dot rag-timeline-dot-${milestoneStatus}`}
                                        style={{ left: `${position}%` }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const isSame = milestoneTooltip && 
                                            milestoneTooltip.projectId === `modal-${projectId}` && 
                                            milestoneTooltip.milestoneIndex === idx;
                                          if (isSame) {
                                            setMilestoneTooltip(null);
                                          } else {
                                            setMilestoneTooltip({
                                              projectId: `modal-${projectId}`,
                                              milestoneIndex: idx,
                                              name: milestoneName,
                                              date: milestoneDate,
                                              status: milestoneStatus,
                                              milestone: milestone
                                            });
                                          }
                                        }}
                                        title={`${milestoneName}: ${milestoneDate}`}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="rag-timeline-summary">
                                  <span className="rag-summary-item rag-summary-overdue">🔴 {project.overdueMilestones || 0} overdue</span>
                                  <span className="rag-summary-item rag-summary-upcoming">🟡 {project.upcomingMilestones || 0} upcoming</span>
                                  {allMilestones.length > 5 && <span className="rag-summary-item">+{allMilestones.length - 5} more</span>}
                                </div>
                              </div>
                            )}
                            {allMilestones.length === 0 && (
                              <div className="rag-timeline-empty"><span>No milestone data available</span></div>
                            )}

                            {/* Stats Row */}
                            <div className="rag-project-quick-stats">
                              <span className="rag-stat-badge rag-stat-risks">🔴 {project.openCriticalRisks || 0} risks</span>
                              <span className="rag-stat-badge rag-stat-issues">⚠️ {project.openCriticalIssues || 0} issues</span>
                              <span className="rag-stat-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>RAG: {project.ragStatus || 'Green'}</span>
                            </div>

                            {/* Milestone Tooltip */}
                            {milestoneTooltip && milestoneTooltip.projectId === `modal-${projectId}` && (
                              <div className="milestone-tooltip" style={{ position: 'relative', marginTop: '12px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                  <strong style={{ fontSize: '14px' }}>{milestoneTooltip.milestone?.['Milestone / Task Name'] || milestoneTooltip.name}</strong>
                                  <button onClick={() => setMilestoneTooltip(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>×</button>
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Due: {milestoneTooltip.date}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getMilestoneColor(milestoneTooltip.status) }} />
                                  <span style={{ color: getMilestoneColor(milestoneTooltip.status), fontWeight: 500, textTransform: 'capitalize' }}>{milestoneTooltip.status}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                <div className="rag-summary-modal">
                  {/* Updated This Week */}
                  <div className="rag-summary-card rag-summary-green" style={{ marginBottom: '16px' }}>
                    <div className="rag-summary-header" style={{ cursor: 'default' }}>
                      <div className="rag-summary-header-left">
                        <div className="rag-summary-label">Updated This Week</div>
                        <p className="rag-summary-helper">{portfolioData.updatedThisWeek?.length || 0} projects</p>
                      </div>
                    </div>
                    {portfolioData.updatedThisWeek?.length > 0 && (
                      <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        <ul className="rag-summary-list">
                          {portfolioData.updatedThisWeek.map(project => (
                            <li key={`updated-${project.id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => setRagProjectExpanded(ragProjectExpanded === `updated-${project.id}` ? null : `updated-${project.id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                  <span className={`rag-summary-chevron ${ragProjectExpanded === `updated-${project.id}` ? 'open' : ''}`}>⌄</span>
                                </div>
                              </button>
                              {ragProjectExpanded === `updated-${project.id}` && (
                                <div className="rag-summary-project-metrics">
                                  <span>{new Date(project.lastModified).toLocaleDateString()}</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Not Updated */}
                  <div className="rag-summary-card rag-summary-amber" style={{ marginBottom: '16px' }}>
                    <div className="rag-summary-header" style={{ cursor: 'default' }}>
                      <div className="rag-summary-header-left">
                        <div className="rag-summary-label">Not Updated Recently</div>
                        <p className="rag-summary-helper">{portfolioData.notUpdated?.length || 0} projects</p>
                      </div>
                    </div>
                    {portfolioData.notUpdated?.length > 0 && (
                      <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        <ul className="rag-summary-list">
                          {portfolioData.notUpdated.map(project => (
                            <li key={`notupdated-${project.id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => setRagProjectExpanded(ragProjectExpanded === `notupdated-${project.id}` ? null : `notupdated-${project.id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                  <span className={`rag-summary-chevron ${ragProjectExpanded === `notupdated-${project.id}` ? 'open' : ''}`}>⌄</span>
                                </div>
                              </button>
                              {ragProjectExpanded === `notupdated-${project.id}` && (
                                <div className="rag-summary-project-metrics">
                                  <span>{project.lastModified ? new Date(project.lastModified).toLocaleDateString() : 'Unknown'}</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* No Data */}
                  <div className="rag-summary-card rag-summary-red">
                    <div className="rag-summary-header" style={{ cursor: 'default' }}>
                      <div className="rag-summary-header-left">
                        <div className="rag-summary-label">No Excel Data</div>
                        <p className="rag-summary-helper">{portfolioData.noData?.length || 0} projects</p>
                      </div>
                    </div>
                    {portfolioData.noData?.length > 0 && (
                      <div className="rag-summary-projects" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                        <ul className="rag-summary-list">
                          {portfolioData.noData.map(project => (
                            <li key={`nodata-${project.id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => setRagProjectExpanded(ragProjectExpanded === `nodata-${project.id}` ? null : `nodata-${project.id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <span className={`rag-summary-chevron ${ragProjectExpanded === `nodata-${project.id}` ? 'open' : ''}`}>⌄</span>
                              </button>
                              {ragProjectExpanded === `nodata-${project.id}` && (
                                <div className="rag-summary-project-metrics">
                                  <span>{project.status || '—'}</span>
                                  <span style={{ color: '#ef4444' }}>Upload Excel file</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
                <div className="rag-summary-modal">
                  {portfolioData.projects?.filter(p => (p.overdueMilestones || 0) > 0).length > 0 ? (
                    <ul className="rag-summary-list">
                      {portfolioData.projects
                        .filter(p => (p.overdueMilestones || 0) > 0)
                        .sort((a, b) => (b.overdueMilestones || 0) - (a.overdueMilestones || 0))
                        .map(project => {
                          const todayCalc = new Date();
                          todayCalc.setHours(0, 0, 0, 0);
                          return (
                            <li key={`overdue-${project.id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => setRagProjectExpanded(ragProjectExpanded === `overdue-${project.id}` ? null : `overdue-${project.id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px' }}>{project.overdueMilestones} overdue</span>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                  <span className={`rag-summary-chevron ${ragProjectExpanded === `overdue-${project.id}` ? 'open' : ''}`}>⌄</span>
                                </div>
                              </button>
                              {ragProjectExpanded === `overdue-${project.id}` && project.overdueMilestoneDetails?.length > 0 && (
                                <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                                  {project.overdueMilestoneDetails.map((milestone, idx) => {
                                    const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                                    const daysOverdue = endDate ? Math.abs(Math.ceil((todayCalc - endDate) / (1000 * 60 * 60 * 24))) : 0;
                                    return (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <span>{milestone['Milestone / Task Name'] || 'Unnamed'}</span>
                                        <span style={{ color: '#ef4444' }}>{daysOverdue} days overdue</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No projects with overdue milestones</p>
                  )}
                </div>
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
                <div className="rag-summary-modal">
                  {portfolioData.projects?.filter(p => (p.upcomingMilestones || 0) > 0).length > 0 ? (
                    <ul className="rag-summary-list">
                      {portfolioData.projects
                        .filter(p => (p.upcomingMilestones || 0) > 0)
                        .sort((a, b) => (b.upcomingMilestones || 0) - (a.upcomingMilestones || 0))
                        .map(project => {
                          const todayCalc = new Date();
                          todayCalc.setHours(0, 0, 0, 0);
                          return (
                            <li key={`upcoming-${project.id}`} className="rag-summary-project-item">
                              <button
                                type="button"
                                className="rag-summary-project-header"
                                onClick={() => setRagProjectExpanded(ragProjectExpanded === `upcoming-${project.id}` ? null : `upcoming-${project.id}`)}
                              >
                                <div className="rag-summary-project-name">{project.name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px' }}>{project.upcomingMilestones} upcoming</span>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                  <span className={`rag-summary-chevron ${ragProjectExpanded === `upcoming-${project.id}` ? 'open' : ''}`}>⌄</span>
                                </div>
                              </button>
                              {ragProjectExpanded === `upcoming-${project.id}` && project.upcomingMilestoneDetails?.length > 0 && (
                                <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                                  {project.upcomingMilestoneDetails.map((milestone, idx) => {
                                    const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                                    const daysUntilDue = endDate ? Math.ceil((endDate - todayCalc) / (1000 * 60 * 60 * 24)) : 0;
                                    return (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <span>{milestone['Milestone / Task Name'] || 'Unnamed'}</span>
                                        <span style={{ color: '#3b82f6' }}>{daysUntilDue} days</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No projects with upcoming milestones</p>
                  )}
                </div>
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
                <div className="rag-summary-modal">
                  {portfolioData.projects?.filter(p => (p.openCriticalRisks || 0) > 0).length > 0 ? (
                    <ul className="rag-summary-list">
                      {portfolioData.projects
                        .filter(p => (p.openCriticalRisks || 0) > 0)
                        .sort((a, b) => (b.openCriticalRisks || 0) - (a.openCriticalRisks || 0))
                        .map(project => (
                          <li key={`risks-${project.id}`} className="rag-summary-project-item">
                            <button
                              type="button"
                              className="rag-summary-project-header"
                              onClick={() => setRagProjectExpanded(ragProjectExpanded === `risks-${project.id}` ? null : `risks-${project.id}`)}
                            >
                              <div className="rag-summary-project-name">{project.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '13px' }}>{project.openCriticalRisks} risks</span>
                                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                <span className={`rag-summary-chevron ${ragProjectExpanded === `risks-${project.id}` ? 'open' : ''}`}>⌄</span>
                              </div>
                            </button>
                            {ragProjectExpanded === `risks-${project.id}` && project.openCriticalRisksDetails?.length > 0 && (
                              <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                                {project.openCriticalRisksDetails.map((risk, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <span>{risk.Description || 'No description'}</span>
                                    <span style={{ color: risk.Severity?.toLowerCase() === 'critical' ? '#dc2626' : '#f59e0b' }}>{risk.Severity || '-'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No projects with open critical risks</p>
                  )}
                </div>
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
                <div className="rag-summary-modal">
                  {portfolioData.projects?.filter(p => (p.openCriticalIssues || 0) > 0).length > 0 ? (
                    <ul className="rag-summary-list">
                      {portfolioData.projects
                        .filter(p => (p.openCriticalIssues || 0) > 0)
                        .sort((a, b) => (b.openCriticalIssues || 0) - (a.openCriticalIssues || 0))
                        .map(project => (
                          <li key={`issues-${project.id}`} className="rag-summary-project-item">
                            <button
                              type="button"
                              className="rag-summary-project-header"
                              onClick={() => setRagProjectExpanded(ragProjectExpanded === `issues-${project.id}` ? null : `issues-${project.id}`)}
                            >
                              <div className="rag-summary-project-name">{project.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '13px' }}>{project.openCriticalIssues} issues</span>
                                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRAGColor(project.ragStatus) }} />
                                <span className={`rag-summary-chevron ${ragProjectExpanded === `issues-${project.id}` ? 'open' : ''}`}>⌄</span>
                              </div>
                            </button>
                            {ragProjectExpanded === `issues-${project.id}` && project.openCriticalIssuesDetails?.length > 0 && (
                              <div className="rag-summary-project-metrics" style={{ flexDirection: 'column', gap: '8px' }}>
                                {project.openCriticalIssuesDetails.map((issue, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <span>{issue.Description || 'No description'}</span>
                                    <span style={{ color: '#dc2626' }}>{issue.Status || 'Open'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="rag-summary-empty">No projects with open critical issues</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Portfolio;
