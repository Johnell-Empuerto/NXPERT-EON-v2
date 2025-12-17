import React, { useState } from "react";
import AppSidebar from "../../components/Sidebar";
import Profile from "../profile/Profile";
import UserMaster from "../usermaster/UserMaster";
import Header from "../../components/Header"; // import header
import "../dashboard/Dashboard.css";
import "../../styles/Global.css";
import Setting from "../settings/Setting";

const Dashboard = ({ user, setUser, handleLogout }) => {
  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Current page state
  const [currentPage, setCurrentPage] = useState("home");

  // Sidebar width
  const sidebarWidth = isSidebarCollapsed ? "100px" : "280px";

  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case "profile":
        return <Profile user={user} setUser={setUser} />;
      case "usermaster":
        return <UserMaster />;
      case "setting": // Add this case
        return <Setting user={user} />;
      case "home":
      default:
        return (
          <div style={{ padding: "20px" }}>
            <h1>Welcome to the Dashboard!</h1>
            <p>Select a menu item from the sidebar or header.</p>
          </div>
        );
    }
  };

  return (
    <div className="wrapper">
      {/* Header */}
      <Header
        user={user}
        handleLogout={handleLogout}
        setCurrentPage={setCurrentPage} // ✅ pass setter to header
      />

      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="sidebar-con">
          <AppSidebar
            collapsed={isSidebarCollapsed}
            setCollapsed={setIsSidebarCollapsed}
            setCurrentPage={setCurrentPage}
          />
        </div>

        {/* Main content */}
        <main
          className="dashboard-content"
          style={{ marginLeft: sidebarWidth, transition: "margin-left 0.3s" }}
        >
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
