// src/components/Sidebar.js (or AppSidebar.js)

import React from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCalendarAlt,
  faRoute,
  faExclamationTriangle,
  faTools,
  faFileLines,
  faChartBar,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import SidebarTooltip from "./SidebarTooltip";
import "./Sidebar.css";

// 1. ACCEPT THE PROPS: 'collapsed' state and 'setCollapsed' setter from Dashboard.js
const AppSidebar = ({ collapsed, setCollapsed, setCurrentPage }) => {
  // 2. IMPORTANT: The local useState is removed, as state is managed by the parent.

  return (
    <Sidebar
      collapsed={collapsed} // Use the prop
      width="260px"
      collapsedWidth="80px"
      rootStyles={{
        position: "relative",
        margin: "10px 0 10px 10px",
        border: "1px solid #efefef",
        borderRadius: "10px",
        boxShadow: "rgba(17, 12, 46, 0.15) 0px 48px 100px 0px;",
        transition: "width 300ms",
        backgroundColor: "#ffffff",
        height: "90dvh",
      }}
    >
      {/* Header / Toggle */}
      <div
        style={{
          padding: "10px",
          display: "flex",
          alignItems: "center",
          // Use the prop 'collapsed'
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <h2
            style={{
              color: "#2563eb",
              fontSize: "18px",
              margin: 0,
              whiteSpace: "nowrap",
            }}
          >
            NXPERT EON
          </h2>
        )}

        <button
          // 3. IMPORTANT: Use the PROP SETTER 'setCollapsed' to update state in the parent.
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* Menu items remain the same, using the 'collapsed' prop for conditional styles */}

      <Menu
        menuItemStyles={{
          button: {
            color: "#000",
            fontSize: "14px", // sets text size for all items
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
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px", // hide text when collapsed
            height: "24px",
            lineHeight: "24px",
          }}
          disabled={true}
        >
          Production
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Production Planning" collapsed={collapsed}>
              <FontAwesomeIcon icon={faCalendarAlt} />
            </SidebarTooltip>
          }
          component={<Link to="/planning" />}
        >
          Production Planning
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Process Tracking" collapsed={collapsed}>
              <FontAwesomeIcon icon={faRoute} />
            </SidebarTooltip>
          }
          component={<Link to="/tracking" />}
        >
          Process Tracking
        </MenuItem>

        {/* Quality */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px", // hide text when collapsed
            height: "24px",
            lineHeight: "24px",
          }}
          disabled={true}
        >
          Quality
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Quality & Defects" collapsed={collapsed}>
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </SidebarTooltip>
          }
          component={<Link to="/quality" />}
        >
          Quality & Defects
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip
              label="NG & Rework Management"
              collapsed={collapsed}
            >
              <FontAwesomeIcon icon={faTools} />
            </SidebarTooltip>
          }
          component={<Link to="/quality/ng-rework" />}
        >
          NG & Rework Management
        </MenuItem>

        {/* Reports */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px", // hide text when collapsed
            height: "24px",
            lineHeight: "24px",
          }}
          disabled={true}
        >
          Reports
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip
              label="Daily Production Report (DPR)"
              collapsed={collapsed}
            >
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={<Link to="/reports/daily" />}
        >
          Daily Production Report (DPR)
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip
              label="Monthly Production Report (MPR)"
              collapsed={collapsed}
            >
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={<Link to="/reports/monthly" />}
        >
          Monthly Production Report (MPR)
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip
              label="Yearly Production Report (YPR)"
              collapsed={collapsed}
            >
              <FontAwesomeIcon icon={faFileLines} />
            </SidebarTooltip>
          }
          component={<Link to="/reports/yearly" />}
        >
          Yearly Production Report (YPR)
        </MenuItem>

        {/* Analytics */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px", // hide text when collapsed
            height: "24px",
            lineHeight: "24px",
          }}
          disabled={true}
        >
          Analytics
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Analytics & Insights" collapsed={collapsed}>
              <FontAwesomeIcon icon={faChartBar} />
            </SidebarTooltip>
          }
          component={<Link to="/analytics" />}
        >
          Analytics & Insights
        </MenuItem>

        {/* Masters */}
        <MenuItem
          style={{
            fontWeight: "bold",
            cursor: "default",
            color: "#2563eb",
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px",
            height: "24px",
            lineHeight: "24px",
          }}
          disabled={true}
        >
          Masters
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="User Master" collapsed={collapsed}>
              <FontAwesomeIcon icon={faUsers} />
            </SidebarTooltip>
          }
          onClick={() => setCurrentPage("usermaster")} // <- update currentPage
        >
          User Master
        </MenuItem>
      </Menu>
    </Sidebar>
  );
};

export default AppSidebar;
