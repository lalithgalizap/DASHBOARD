import React from 'react';
import './PortfolioMetrics.css';

function PortfolioMetrics({ metrics }) {
  if (!metrics) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="portfolio-metrics">
      <div className="portfolio-header">
        <h1 className="portfolio-title">Portfolio Overview</h1>
        <p className="portfolio-last-updated">Last Update: {formatDate(metrics.lastUpdated)}</p>
      </div>
      
      <div className="metrics-grid">
        {/* Row 1 */}
        <div className="metric-card metric-card-blue">
          <div className="metric-value metric-large">{metrics.totalActiveProjects}</div>
          <div className="metric-label">Total Active Projects</div>
          <div className="metric-sublabel">Active delivery projects</div>
        </div>

        <div className="metric-card metric-card-green">
          <div className="metric-value metric-large">
            <span className="rag-green">{metrics.projectsByRAG?.green || 0}</span>
            <span className="rag-divider">/</span>
            <span className="rag-amber">{metrics.projectsByRAG?.amber || 0}</span>
            <span className="rag-divider">/</span>
            <span className="rag-red">{metrics.projectsByRAG?.red || 0}</span>
          </div>
          <div className="metric-label">Projects by RAG Status</div>
          <div className="metric-sublabel">Green / Amber / Red</div>
        </div>

        <div className="metric-card metric-card-default">
          <div className="metric-value metric-large">{metrics.projectsUpdatedThisWeek}</div>
          <div className="metric-label">Projects Updated This Week</div>
          <div className="metric-sublabel">Updated in last 7 days</div>
        </div>

        <div className="metric-card metric-card-warning">
          <div className="metric-value metric-large">{metrics.projectsMissingWeeklyUpdate}</div>
          <div className="metric-label">Projects Missing Weekly Update</div>
          <div className="metric-sublabel">Last update older than 7 days</div>
        </div>

        <div className="metric-card metric-card-red">
          <div className="metric-value metric-large">
            {metrics.plannedVsActualProgress >= 0 ? '+' : ''}{metrics.plannedVsActualProgress}%
          </div>
          <div className="metric-label">Planned vs Actual Progress</div>
          <div className="metric-sublabel">Negative variance indicates behind schedule</div>
        </div>

        {/* Row 2 */}
        <div className="metric-card metric-card-default">
          <div className="metric-value">{metrics.overdueMilestonesTotal}</div>
          <div className="metric-label">Overdue Milestones (Total)</div>
          <div className="metric-sublabel">Past due and not completed</div>
        </div>

        <div className="metric-card metric-card-default">
          <div className="metric-value">{metrics.projectsWithOverdueMilestones}</div>
          <div className="metric-label">Projects with ≥1 Overdue Milestone</div>
          <div className="metric-sublabel">Distinct active projects</div>
        </div>

        <div className="metric-card metric-card-default">
          <div className="metric-value">{metrics.upcomingMilestones14Days}</div>
          <div className="metric-label">Upcoming Milestones (Next 14 Days)</div>
          <div className="metric-sublabel">Due in next 14 days</div>
        </div>

        <div className="metric-card metric-card-red">
          <div className="metric-value">{metrics.openCriticalRisks}</div>
          <div className="metric-label">Open Critical Risks</div>
          <div className="metric-sublabel">Critical / High only</div>
        </div>

        <div className="metric-card metric-card-red">
          <div className="metric-value">{metrics.openCriticalIssues}</div>
          <div className="metric-label">Open Critical Issues</div>
          <div className="metric-sublabel">Critical / High only</div>
        </div>

        <div className="metric-card metric-card-default">
          <div className="metric-value">{metrics.openEscalations}</div>
          <div className="metric-label">Open Escalations</div>
          <div className="metric-sublabel">Escalated and not closed</div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioMetrics;
