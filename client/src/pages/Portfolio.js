import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PortfolioMetrics from '../components/PortfolioMetrics';
import './Portfolio.css';

function Portfolio() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/portfolio');
      setPortfolioData(response.data);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
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

  if (error) {
    return (
      <div className="portfolio-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-btn" onClick={fetchPortfolioData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-container">
        {/* Portfolio Metrics Cards */}
        <PortfolioMetrics metrics={portfolioData} />

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
      </div>
    </div>
  );
}

export default Portfolio;
