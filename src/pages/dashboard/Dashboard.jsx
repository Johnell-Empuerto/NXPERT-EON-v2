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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = isSidebarCollapsed ? "100px" : "280px";

  return (
    <div className="wrapper">
      <Header user={user} handleLogout={handleLogout} />

      <div className="dashboard-container">
        <div className="sidebar-con">
          <AppSidebar
            collapsed={isSidebarCollapsed}
            setCollapsed={setIsSidebarCollapsed}
          />
        </div>

        <main
          className="dashboard-content"
          style={{ marginLeft: sidebarWidth, transition: "margin-left 0.3s" }}
        >
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route
              path="/profile"
              element={<Profile user={user} setUser={setUser} />}
            />
            <Route path="/usermaster" element={<UserMaster />} />
            <Route path="/settings" element={<Setting user={user} />} />

            {/* Add these routes for the existing sidebar links */}
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

            <Route path="/excel-checksheet" element={<ExcelChecksheet />} />

            {/* Fallback for any unmatched routes under /dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
