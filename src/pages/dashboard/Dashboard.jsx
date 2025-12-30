// src/pages/dashboard/Dashboard.js
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppSidebar from "../../components/Sidebar";
import Profile from "../profile/Profile";
import UserMaster from "../usermaster/UserMaster";
import Header from "../../components/Header";
import Setting from "../settings/Setting";
import "./Dashboard.css";
import DashboardHome from "./DashboardHome";
import ProductionPlanning from "../productionPlanning/ProductionPlanning";
import ExcelChecksheet from "../excel-to-form/ExcelChecksheet";

const Dashboard = ({ user, setUser, handleLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="wrapper">
      <Header
        user={user}
        handleLogout={handleLogout}
        toggleSidebar={toggleSidebar}
      />

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar - only appears when open */}
      <div className={`sidebar-drawer ${sidebarOpen ? "open" : ""}`}>
        <AppSidebar onLinkClick={closeSidebar} />
      </div>

      {/* Main Content - Full width always */}
      <main className="dashboard-content">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route
            path="/profile"
            element={<Profile user={user} setUser={setUser} />}
          />
          <Route path="/usermaster" element={<UserMaster />} />
          <Route path="/settings" element={<Setting user={user} />} />
          <Route path="/planning" element={<ProductionPlanning />} />
          <Route
            path="/tracking"
            element={<div>Process Tracking - Coming Soon</div>}
          />
          <Route
            path="/quality"
            element={<div>Quality & Defects - Coming Soon</div>}
          />
          <Route
            path="/quality/ng-rework"
            element={<div>NG & Rework Management - Coming Soon</div>}
          />
          <Route
            path="/reports/daily"
            element={<div>Daily Production Report - Coming Soon</div>}
          />
          <Route
            path="/reports/monthly"
            element={<div>Monthly Production Report - Coming Soon</div>}
          />
          <Route
            path="/reports/yearly"
            element={<div>Yearly Production Report - Coming Soon</div>}
          />
          <Route
            path="/analytics"
            element={<div>Analytics & Insights - Coming Soon</div>}
          />
          <Route path="/create-checksheet" element={<ExcelChecksheet />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
