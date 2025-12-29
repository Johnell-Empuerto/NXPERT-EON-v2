// src/components/Sidebar.js
import React from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faRoute,
  faExclamationTriangle,
  faTools,
  faFileLines,
  faChartBar,
  faUsers,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";
import SidebarTooltip from "./SidebarTooltip";
import "./Sidebar.css";

const AppSidebar = ({ onLinkClick }) => {
  const location = useLocation();

  // Helper to handle link clicks and close drawer
  const handleLinkClick = () => {
    if (onLinkClick) onLinkClick();
  };

  return (
    <Sidebar
      rootStyles={{
        position: "relative",
        backgroundColor: "#ffffff",
        height: "100dvh",
      }}
    >
      {/* Header - Only Title (No Toggle Button) */}
      <div
        style={{
          padding: "20px 10px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#2563eb",
            fontSize: "20px",
            fontWeight: "700",
            margin: 0,
            letterSpacing: "0.5px",
          }}
        >
          NXPERT EON
        </h2>
      </div>

      <Menu
        menuItemStyles={{
          button: {
            color: "#000",
            fontSize: "14px",
            "& svg": { color: "#2563eb" },
            "&:hover": { backgroundColor: "#e0e7ff", color: "#1e3a8a" },
            "&:hover svg": { color: "#1e3a8a" },
            "&.active": { backgroundColor: "#c7d2fe", color: "#1e3a8a" },
            "&.active svg": { color: "#1e3a8a" },
          },
        }}
      >
        {/* Production */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Production
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Production Planning">
              <FontAwesomeIcon icon={faCalendarAlt} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/planning" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/planning"}
        >
          Production Planning
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Process Tracking">
              <FontAwesomeIcon icon={faRoute} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/tracking" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/tracking"}
        >
          Process Tracking
        </MenuItem>

        {/* Quality */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: "16px",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Quality
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Quality & Defects">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </SidebarTooltip>
          }
          component={<Link to="/dashboard/quality" onClick={handleLinkClick} />}
          active={location.pathname === "/dashboard/quality"}
        >
          Quality & Defects
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="NG & Rework Management">
              <FontAwesomeIcon icon={faTools} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/quality/ng-rework" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/quality/ng-rework"}
        >
          NG & Rework Management
        </MenuItem>

        {/* Reports */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: "16px",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Reports
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Daily Production Report (DPR)">
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/reports/daily" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/reports/daily"}
        >
          Daily Production Report (DPR)
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Monthly Production Report (MPR)">
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/reports/monthly" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/reports/monthly"}
        >
          Monthly Production Report (MPR)
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Yearly Production Report (YPR)">
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/reports/yearly" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/reports/yearly"}
        >
          Yearly Production Report (YPR)
        </MenuItem>

        {/* Analytics */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: "16px",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Analytics
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Analytics & Insights">
              <FontAwesomeIcon icon={faChartBar} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/analytics" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/analytics"}
        >
          Analytics & Insights
        </MenuItem>

        {/* Forms */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: "16px",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Forms
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Create Checksheet Templates">
              <FontAwesomeIcon icon={faClipboardList} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/excel-checksheet" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/excel-checksheet"}
        >
          Create Checksheet Templates
        </MenuItem>

        {/* Masters */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: "16px",
            fontSize: "12px",
            height: "24px",
            lineHeight: "24px",
            marginTop: "10px",
          }}
          disabled={true}
        >
          Masters
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="User Master">
              <FontAwesomeIcon icon={faUsers} />
            </SidebarTooltip>
          }
          component={
            <Link to="/dashboard/usermaster" onClick={handleLinkClick} />
          }
          active={location.pathname === "/dashboard/usermaster"}
        >
          User Master
        </MenuItem>
      </Menu>
    </Sidebar>
  );
};

export default AppSidebar;
