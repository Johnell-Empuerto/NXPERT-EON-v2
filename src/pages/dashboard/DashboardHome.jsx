// src/pages/dashboard/DashboardHome.js
import React from "react";
import "./DashboardHome.css";

const DashboardHome = () => {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h1>Production Dashboard</h1>
        <p className="subtitle">
          Real-time overview of manufacturing operations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#4f46e5" }}>
            📊
          </div>
          <div className="stat-content">
            <h3>Today's Production</h3>
            <p className="stat-value">2,450</p>
            <p className="stat-subtitle">Units</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#10b981" }}>
            ✅
          </div>
          <div className="stat-content">
            <h3>Quality Rate</h3>
            <p className="stat-value">98.7%</p>
            <p className="stat-subtitle">+0.5% from yesterday</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f59e0b" }}>
            ⚡
          </div>
          <div className="stat-content">
            <h3>OEE</h3>
            <p className="stat-value">86.4%</p>
            <p className="stat-subtitle">Overall Equipment Effectiveness</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#ef4444" }}>
            ⚠️
          </div>
          <div className="stat-content">
            <h3>Active Issues</h3>
            <p className="stat-value">3</p>
            <p className="stat-subtitle">Requiring attention</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3>Production Trend (Last 7 Days)</h3>
            <span className="chart-badge">Live</span>
          </div>
          <div className="chart-placeholder">
            <div className="mock-chart">
              {/* Simple mock chart */}
              <div className="mock-bars">
                {[65, 80, 75, 90, 85, 95, 88].map((height, index) => (
                  <div
                    key={index}
                    className="mock-bar"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mock-labels">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>Defects by Category</h3>
          </div>
          <div className="chart-placeholder">
            <div className="mock-pie-chart">
              <div
                className="pie-slice"
                style={{ "--percentage": "60%", "--color": "#4f46e5" }}
              ></div>
              <div
                className="pie-slice"
                style={{ "--percentage": "25%", "--color": "#10b981" }}
              ></div>
              <div
                className="pie-slice"
                style={{ "--percentage": "10%", "--color": "#f59e0b" }}
              ></div>
              <div
                className="pie-slice"
                style={{ "--percentage": "5%", "--color": "#ef4444" }}
              ></div>
              <div className="pie-center">
                <span>Total: 124</span>
              </div>
            </div>
            <div className="pie-legend">
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#4f46e5" }}
                ></span>{" "}
                Dimensional
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#10b981" }}
                ></span>{" "}
                Surface
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#f59e0b" }}
                ></span>{" "}
                Assembly
              </div>
              <div className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: "#ef4444" }}
                ></span>{" "}
                Material
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h3>Recent Production Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon success">✓</div>
            <div className="activity-content">
              <p>
                <strong>Line 3</strong> completed order #ORD-7821
              </p>
              <span className="activity-time">10 minutes ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon warning">⚠</div>
            <div className="activity-content">
              <p>
                <strong>Quality Alert</strong> on Line 2 - Dimensional variance
                detected
              </p>
              <span className="activity-time">25 minutes ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon info">🔄</div>
            <div className="activity-content">
              <p>
                <strong>Maintenance</strong> completed on Press Machine #4
              </p>
              <span className="activity-time">1 hour ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon success">📦</div>
            <div className="activity-content">
              <p>
                <strong>Order #ORD-7820</strong> shipped to customer
              </p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
