import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import './ProjectDashboard.css';

function ProjectDashboard({ projectId, projectName, project }) {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showPlannedVsActualModal, setShowPlannedVsActualModal] = useState(false);
  const [showMilestoneCompletionModal, setShowMilestoneCompletionModal] = useState(false);
  const [showUpcomingMilestonesModal, setShowUpcomingMilestonesModal] = useState(false);
  const [showOverdueMilestonesModal, setShowOverdueMilestonesModal] = useState(false);
  const [showOverdueTasksModal, setShowOverdueTasksModal] = useState(false);
  const [showOpenRisksModal, setShowOpenRisksModal] = useState(false);
  const [showOpenIssuesModal, setShowOpenIssuesModal] = useState(false);
  const [showAgedRaidModal, setShowAgedRaidModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [projectId, projectName]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/projects/${projectId}/documents?projectName=${encodeURIComponent(projectName)}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setDocuments(response.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDocuments();
  };

  if (loading || !documents) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  const convertExcelDateToJS = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === 'number' && excelDate > 40000 && excelDate < 50000) {
      return new Date(Date.UTC(1899, 11, 30) + excelDate * 86400 * 1000);
    }
    return new Date(excelDate);
  };

  const analyzeTaskPerformance = () => {
    const tasks = documents?.projectPlan || [];
    
    const tasksWithActualDates = tasks.filter(t => t['Actual End Date']);
    
    const onSchedule = tasksWithActualDates.filter(t => {
      const plannedStart = t['Planned Start Date'];
      const actualStart = t['Actual Start Date'];
      const plannedEnd = t['Planned End Date'];
      const actualEnd = t['Actual End Date'];
      
      if (!plannedStart || !actualStart || !plannedEnd || !actualEnd) return false;
      
      const plannedStartDate = convertExcelDateToJS(plannedStart);
      const actualStartDate = convertExcelDateToJS(actualStart);
      const plannedEndDate = convertExcelDateToJS(plannedEnd);
      const actualEndDate = convertExcelDateToJS(actualEnd);
      
      const startOnTime = actualStartDate <= plannedStartDate;
      const endOnTime = actualEndDate <= plannedEndDate;
      
      return startOnTime && endOnTime;
    });
    
    const delayedStart = tasksWithActualDates.filter(t => {
      const plannedStart = t['Planned Start Date'];
      const actualStart = t['Actual Start Date'];
      
      if (!plannedStart || !actualStart) return false;
      
      const plannedStartDate = convertExcelDateToJS(plannedStart);
      const actualStartDate = convertExcelDateToJS(actualStart);
      
      return actualStartDate > plannedStartDate;
    });
    
    const lateFinish = tasksWithActualDates.filter(t => {
      const plannedEnd = t['Planned End Date'];
      const actualEnd = t['Actual End Date'];
      
      if (!plannedEnd || !actualEnd) return false;
      
      const plannedEndDate = convertExcelDateToJS(plannedEnd);
      const actualEndDate = convertExcelDateToJS(actualEnd);
      
      return actualEndDate > plannedEndDate;
    });
    
    return {
      onSchedule,
      delayedStart,
      lateFinish,
      total: tasksWithActualDates
    };
  };

  const calculateMetrics = () => {
    const milestones = documents.milestoneTracker || [];
    const tasks = documents.projectPlan || [];
    const raidLog = documents.raidLog || [];
    const governanceCadences = documents.governanceCadences || [];

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => 
      m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => 
      t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete')
    ).length;

    const projectCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const plannedTasks = tasks.filter(t => t['Planned End Date']).length;
    const actualCompletedTasks = tasks.filter(t => t['Actual End Date']).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingMilestones = milestones.filter(m => {
      if (!m['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(m['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
      return endDate >= today && endDate <= fourteenDaysFromNow && !isCompleted;
    }).length;

    const overdueMilestones = milestones.filter(m => {
      if (!m['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(m['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
      return endDate < today && !isCompleted;
    }).length;

    const overdueTasks = tasks.filter(t => {
      if (!t['Planned End Date']) return false;
      const endDate = convertExcelDateToJS(t['Planned End Date']);
      if (!endDate) return false;
      endDate.setHours(0, 0, 0, 0);
      const isCompleted = t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete');
      return endDate < today && !isCompleted;
    }).length;

    const allRisks = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'risk' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openRisks = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'risk' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved' &&
      r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical')
    ).length;

    const openIssues = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'issue' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openDependencies = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'dependency' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const openAssumptions = raidLog.filter(r => 
      r.Type && r.Type.toLowerCase() === 'assumption' && 
      r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
    ).length;

    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const agedRaid = raidLog.filter(r => {
      if (!r['Date Raised']) return false;
      const raisedDate = new Date(r['Date Raised']);
      return raisedDate < thirtyDaysAgo && 
             r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
    }).length;

    const totalGovernanceMeetings = governanceCadences.length;
    const onTimeGovernance = governanceCadences.filter(g => 
      g.Status && (g.Status.toLowerCase() === 'completed' || g.Status.toLowerCase() === 'on time')
    ).length;
    const governanceCompliance = totalGovernanceMeetings > 0 
      ? Math.round((onTimeGovernance / totalGovernanceMeetings) * 100) 
      : 0;

    return {
      projectCompletion,
      plannedVsActual: { planned: plannedTasks, actual: actualCompletedTasks },
      milestoneCompletion: { completed: completedMilestones, total: totalMilestones },
      upcomingMilestones,
      overdueMilestones,
      overdueTasks,
      allRisks,
      openRisks,
      openIssues,
      openDependencies,
      openAssumptions,
      agedRaid,
      governanceCompliance,
      governanceOnTime: onTimeGovernance,
      governanceTotal: totalGovernanceMeetings
    };
  };

  const metrics = calculateMetrics();

  const getOverallStatus = () => {
    if (metrics.overdueMilestones > 0 || metrics.overdueTasks > 3) return { label: 'RED', color: '#dc2626' };
    if (metrics.openRisks > 3 || metrics.openIssues > 2) return { label: 'AMBER', color: '#f59e0b' };
    return { label: 'GREEN', color: '#10b981' };
  };

  const overallStatus = getOverallStatus();

  const formatDate = (dateStr) => {
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

  const getTrendIcon = (value, threshold = 0) => {
    if (value > threshold) return <TrendingUp size={14} color="#dc2626" />;
    if (value < threshold) return <TrendingDown size={14} color="#10b981" />;
    return null;
  };

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>{projectName}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '13px', color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Owner: <strong style={{ color: '#111827' }}>{project?.owner || documents?.projectCharter?.basicInfo?.projectManager || 'Not Assigned'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Last Updated: <strong style={{ color: '#111827' }}>{formatDate(lastRefresh)}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: overallStatus.color, display: 'inline-block', boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}></span>
              <span>OVERALL STATUS: <strong style={{ color: overallStatus.color }}>{overallStatus.label}</strong></span>
            </span>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-label">Project % Complete</div>
          <div className="metric-value-large">
            {metrics.projectCompletion}%
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowPlannedVsActualModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Tasks Completed</div>
          <div className="metric-value">
            {metrics.plannedVsActual.actual} of {metrics.plannedVsActual.planned}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Click for performance details</div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowMilestoneCompletionModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Milestone Completion</div>
          <div className="metric-value">
            {metrics.milestoneCompletion.completed} / {metrics.milestoneCompletion.total}
          </div>
          <div className="metric-sublabel">
            {metrics.milestoneCompletion.total > 0 
              ? Math.round((metrics.milestoneCompletion.completed / metrics.milestoneCompletion.total) * 100) 
              : 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Click for milestone details</div>
        </div>

        <div className="metric-card clickable" onClick={() => setShowUpcomingMilestonesModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Upcoming (14 Days)</div>
          <div className="metric-value highlight-blue">
            {metrics.upcomingMilestones}
          </div>
          <div className="metric-sublabel">Milestones</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Click for details</div>
        </div>

        <div className="metric-card alert clickable" onClick={() => setShowOverdueMilestonesModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Overdue Milestones</div>
          <div className="metric-value highlight-red">
            {metrics.overdueMilestones}
          </div>
          <div className="metric-sublabel">{getTrendIcon(metrics.overdueMilestones)} Attention</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Click for details</div>
        </div>

        <div className="metric-card alert clickable" onClick={() => setShowOverdueTasksModal(true)} style={{ cursor: 'pointer' }}>
          <div className="metric-label">Overdue Tasks</div>
          <div className="metric-value highlight-orange">
            {metrics.overdueTasks}
          </div>
          <div className="metric-sublabel">{getTrendIcon(metrics.overdueTasks)} Attention</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Click for details</div>
        </div>
      </div>

      <div className="dashboard-footer">
        <div className="raid-section">
          <h3>RAID BREAKDOWN</h3>
          <div className="raid-content">
            <div className="raid-chart-compact">
              <div className="raid-item-compact">
                <div className="raid-label">Risk</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-risk" 
                    style={{ width: `${metrics.allRisks > 0 ? (metrics.allRisks / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.allRisks}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Assumption</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-assumption" 
                    style={{ width: `${metrics.openAssumptions > 0 ? (metrics.openAssumptions / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openAssumptions}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Issue</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-issue" 
                    style={{ width: `${metrics.openIssues > 0 ? (metrics.openIssues / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openIssues}</div>
              </div>
              
              <div className="raid-item-compact">
                <div className="raid-label">Dependency</div>
                <div className="raid-bar-container-compact">
                  <div 
                    className="raid-bar raid-bar-dependency" 
                    style={{ width: `${metrics.openDependencies > 0 ? (metrics.openDependencies / Math.max(metrics.allRisks, metrics.openAssumptions, metrics.openIssues, metrics.openDependencies, 1)) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="raid-count">{metrics.openDependencies}</div>
              </div>
            </div>

            <div className="raid-summary-horizontal">
              <div className="raid-summary-card" onClick={() => setShowOpenRisksModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon risk">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.openRisks}</div>
                  <div className="raid-summary-label">OPEN RISKS (HIGH & CRITICAL)</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>

              <div className="raid-summary-card" onClick={() => setShowOpenIssuesModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon issue">
                    <AlertTriangle size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.openIssues}</div>
                  <div className="raid-summary-label">OPEN ISSUES</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>

              <div className="raid-summary-card" onClick={() => setShowAgedRaidModal(true)} style={{ cursor: 'pointer' }}>
                <div className="raid-summary-card-header">
                  <div className="raid-summary-icon aged">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="raid-summary-content">
                  <div className="raid-summary-value">{metrics.agedRaid}</div>
                  <div className="raid-summary-label">AGED RAID &gt;30 DAYS</div>
                  <div className="raid-summary-status">Open</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planned vs Actual Detail Modal */}
      {showPlannedVsActualModal && (() => {
        const taskPerformance = analyzeTaskPerformance();
        
        return (
          <div className="modal-overlay" onClick={() => setShowPlannedVsActualModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Planned vs Actual - Task Performance Breakdown</h2>
                <button onClick={() => setShowPlannedVsActualModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>ON SCHEDULE</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{taskPerformance.onSchedule.length}</div>
                    <div style={{ fontSize: '11px', color: '#15803d' }}>Started & finished on time</div>
                  </div>
                  
                  <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>DELAYED START</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{taskPerformance.delayedStart.length}</div>
                    <div style={{ fontSize: '11px', color: '#b45309' }}>Started after planned date</div>
                  </div>
                  
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600', marginBottom: '4px' }}>LATE FINISH</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{taskPerformance.lateFinish.length}</div>
                    <div style={{ fontSize: '11px', color: '#b91c1c' }}>Finished after deadline</div>
                  </div>
                  
                  <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#374151', fontWeight: '600', marginBottom: '4px' }}>TOTAL COMPLETED</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{taskPerformance.total.length}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Tasks with actual dates</div>
                  </div>
                </div>

                {/* Task Tables */}
                {taskPerformance.onSchedule.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={16} /> On Schedule Tasks ({taskPerformance.onSchedule.length})
                    </h3>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                      <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual Start</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskPerformance.onSchedule.map((task, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{formatDate(task['Actual Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{formatDate(task['Actual End Date'])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {taskPerformance.delayedStart.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} /> Delayed Start Tasks ({taskPerformance.delayedStart.length})
                    </h3>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                      <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual Start</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Delay (Days)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskPerformance.delayedStart.map((task, idx) => {
                          const plannedStart = convertExcelDateToJS(task['Planned Start Date']);
                          const actualStart = convertExcelDateToJS(task['Actual Start Date']);
                          const delayDays = Math.round((actualStart - plannedStart) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                              <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                              <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                              <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned Start Date'])}</td>
                              <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{formatDate(task['Actual Start Date'])}</td>
                              <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '600' }}>+{delayDays} days</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {taskPerformance.lateFinish.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} /> Late Finish Tasks ({taskPerformance.lateFinish.length})
                    </h3>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                      <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Overrun (Days)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskPerformance.lateFinish.map((task, idx) => {
                          const plannedEnd = convertExcelDateToJS(task['Planned End Date']);
                          const actualEnd = convertExcelDateToJS(task['Actual End Date']);
                          const overrunDays = Math.round((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                              <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                              <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                              <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned End Date'])}</td>
                              <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>{formatDate(task['Actual End Date'])}</td>
                              <td style={{ padding: '10px', color: '#dc2626', fontWeight: '600' }}>+{overrunDays} days</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {taskPerformance.total.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No tasks with actual dates found. Tasks need both Actual Start Date and Actual End Date to appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Milestone Completion Modal */}
      {showMilestoneCompletionModal && (() => {
        const milestones = documents.milestoneTracker || [];
        const completedMilestones = milestones.filter(m => 
          m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete')
        );
        const incompleteMilestones = milestones.filter(m => 
          !m.Status || (m.Status.toLowerCase() !== 'completed' && m.Status.toLowerCase() !== 'complete')
        );

        return (
          <div className="modal-overlay" onClick={() => setShowMilestoneCompletionModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Milestone Completion Details</h2>
                <button onClick={() => setShowMilestoneCompletionModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>COMPLETED</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a' }}>{completedMilestones.length}</div>
                  </div>
                  <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>IN PROGRESS</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{incompleteMilestones.length}</div>
                  </div>
                </div>

                {completedMilestones.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', marginBottom: '12px' }}>Completed Milestones ({completedMilestones.length})</h3>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                      <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Actual End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedMilestones.map((milestone, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{formatDate(milestone['Actual End Date'])}</td>
                            <td style={{ padding: '10px', color: '#16a34a', fontWeight: '500' }}>{milestone.Status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {incompleteMilestones.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '12px' }}>In Progress Milestones ({incompleteMilestones.length})</h3>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                      <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incompleteMilestones.map((milestone, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{milestone.Status || 'Not Started'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Upcoming Milestones Modal */}
      {showUpcomingMilestonesModal && (() => {
        const milestones = documents.milestoneTracker || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fourteenDaysFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

        const upcomingMilestones = milestones.filter(m => {
          if (!m['Planned End Date']) return false;
          const endDate = convertExcelDateToJS(m['Planned End Date']);
          if (!endDate) return false;
          endDate.setHours(0, 0, 0, 0);
          const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
          return endDate >= today && endDate <= fourteenDaysFromNow && !isCompleted;
        });

        return (
          <div className="modal-overlay" onClick={() => setShowUpcomingMilestonesModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Upcoming Milestones (Next 14 Days)</h2>
                <button onClick={() => setShowUpcomingMilestonesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {upcomingMilestones.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Days Until Due</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingMilestones.map((milestone, idx) => {
                        const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                        const daysUntilDue = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#3b82f6', fontWeight: '500' }}>{formatDate(milestone['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#3b82f6', fontWeight: '600' }}>{daysUntilDue} days</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone.Status || 'Not Started'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No upcoming milestones in the next 14 days.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Overdue Milestones Modal */}
      {showOverdueMilestonesModal && (() => {
        const milestones = documents.milestoneTracker || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueMilestones = milestones.filter(m => {
          if (!m['Planned End Date']) return false;
          const endDate = convertExcelDateToJS(m['Planned End Date']);
          if (!endDate) return false;
          endDate.setHours(0, 0, 0, 0);
          const isCompleted = m.Status && (m.Status.toLowerCase() === 'completed' || m.Status.toLowerCase() === 'complete');
          return endDate < today && !isCompleted;
        });

        return (
          <div className="modal-overlay" onClick={() => setShowOverdueMilestonesModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Overdue Milestones</h2>
                <button onClick={() => setShowOverdueMilestonesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {overdueMilestones.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Ref</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Milestone Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Days Overdue</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueMilestones.map((milestone, idx) => {
                        const endDate = convertExcelDateToJS(milestone['Planned End Date']);
                        const daysOverdue = Math.abs(Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone Ref']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{milestone['Milestone / Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(milestone['Planned Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>{formatDate(milestone['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#dc2626', fontWeight: '600' }}>{daysOverdue} days</td>
                            <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>{milestone.Status || 'Not Started'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No overdue milestones.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Overdue Tasks Modal */}
      {showOverdueTasksModal && (() => {
        const tasks = documents.projectPlan || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueTasks = tasks.filter(t => {
          if (!t['Planned End Date']) return false;
          const endDate = convertExcelDateToJS(t['Planned End Date']);
          if (!endDate) return false;
          endDate.setHours(0, 0, 0, 0);
          const isCompleted = t.Status && (t.Status.toLowerCase() === 'completed' || t.Status.toLowerCase() === 'complete');
          return endDate < today && !isCompleted;
        });

        return (
          <div className="modal-overlay" onClick={() => setShowOverdueTasksModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Overdue Tasks</h2>
                <button onClick={() => setShowOverdueTasksModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {overdueTasks.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Task Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned Start</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Planned End</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Days Overdue</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTasks.map((task, idx) => {
                        const endDate = convertExcelDateToJS(task['Planned End Date']);
                        const daysOverdue = Math.abs(Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task ID']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{task['Task Name']}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(task['Planned Start Date'])}</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{formatDate(task['Planned End Date'])}</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '600' }}>{daysOverdue} days</td>
                            <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{task.Status || 'Not Started'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No overdue tasks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Open Risks Modal */}
      {showOpenRisksModal && (() => {
        const raidLog = documents.raidLog || [];
        
        const openRisks = raidLog.filter(r => 
          r.Type && r.Type.toLowerCase() === 'risk' && 
          r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved' &&
          r.Severity && (r.Severity.toLowerCase() === 'high' || r.Severity.toLowerCase() === 'critical')
        );

        return (
          <div className="modal-overlay" onClick={() => setShowOpenRisksModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Open Risks (High & Critical Severity)</h2>
                <button onClick={() => setShowOpenRisksModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {openRisks.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Severity</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Date Raised</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Owner</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openRisks.map((risk, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                          <td style={{ padding: '10px', color: '#111827' }}>{risk.ID || risk['RAID ID']}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{risk.Description}</td>
                          <td style={{ padding: '10px', color: risk.Severity?.toLowerCase() === 'critical' ? '#dc2626' : '#f59e0b', fontWeight: '600' }}>{risk.Severity}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{formatDate(risk['Date Raised'])}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{risk.Owner}</td>
                          <td style={{ padding: '10px', color: '#f59e0b', fontWeight: '500' }}>{risk.Status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No open risks with High or Critical severity.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Open Issues Modal */}
      {showOpenIssuesModal && (() => {
        const raidLog = documents.raidLog || [];
        
        const openIssues = raidLog.filter(r => 
          r.Type && r.Type.toLowerCase() === 'issue' && 
          r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved'
        );

        return (
          <div className="modal-overlay" onClick={() => setShowOpenIssuesModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Open Issues</h2>
                <button onClick={() => setShowOpenIssuesModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {openIssues.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Severity</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Date Raised</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Owner</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openIssues.map((issue, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                          <td style={{ padding: '10px', color: '#111827' }}>{issue.ID || issue['RAID ID']}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{issue.Description}</td>
                          <td style={{ padding: '10px', color: issue.Severity?.toLowerCase() === 'critical' ? '#dc2626' : issue.Severity?.toLowerCase() === 'high' ? '#f59e0b' : '#6b7280', fontWeight: '500' }}>{issue.Severity || 'N/A'}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{formatDate(issue['Date Raised'])}</td>
                          <td style={{ padding: '10px', color: '#111827' }}>{issue.Owner}</td>
                          <td style={{ padding: '10px', color: '#dc2626', fontWeight: '500' }}>{issue.Status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No open issues.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Aged RAID Modal */}
      {showAgedRaidModal && (() => {
        const raidLog = documents.raidLog || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const agedRaidItems = raidLog.filter(r => {
          if (!r['Date Raised']) return false;
          const raisedDate = convertExcelDateToJS(r['Date Raised']);
          if (!raisedDate) return false;
          return raisedDate < thirtyDaysAgo && 
                 r.Status && r.Status.toLowerCase() !== 'closed' && r.Status.toLowerCase() !== 'resolved';
        });

        return (
          <div className="modal-overlay" onClick={() => setShowAgedRaidModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '80vh', overflow: 'auto', background: 'white' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Aged RAID Items (&gt;30 Days)</h2>
                <button onClick={() => setShowAgedRaidModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#111827' }}>×</button>
              </div>
              
              <div className="modal-body" style={{ padding: '20px' }}>
                {agedRaidItems.length > 0 ? (
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', background: 'white' }}>
                    <thead style={{ background: 'white', borderBottom: '2px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>ID</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Description</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Severity</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Date Raised</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Days Open</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Owner</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#111827' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agedRaidItems.map((item, idx) => {
                        const raisedDate = convertExcelDateToJS(item['Date Raised']);
                        const daysOpen = raisedDate ? Math.floor((today - raisedDate) / (1000 * 60 * 60 * 24)) : 0;
                        
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: 'white' }}>
                            <td style={{ padding: '10px', color: '#111827' }}>{item.ID || item['RAID ID']}</td>
                            <td style={{ padding: '10px', color: '#111827', fontWeight: '500' }}>{item.Type}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{item.Description}</td>
                            <td style={{ padding: '10px', color: item.Severity?.toLowerCase() === 'critical' ? '#dc2626' : item.Severity?.toLowerCase() === 'high' ? '#f59e0b' : '#6b7280', fontWeight: '500' }}>{item.Severity || 'N/A'}</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{formatDate(item['Date Raised'])}</td>
                            <td style={{ padding: '10px', color: '#6366f1', fontWeight: '600' }}>{daysOpen} days</td>
                            <td style={{ padding: '10px', color: '#111827' }}>{item.Owner}</td>
                            <td style={{ padding: '10px', color: '#6366f1', fontWeight: '500' }}>{item.Status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <p>No RAID items older than 30 days.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default ProjectDashboard;
