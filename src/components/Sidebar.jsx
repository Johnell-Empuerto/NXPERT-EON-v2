// src/components/Sidebar.js
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
  faUser,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";
import SidebarTooltip from "./SidebarTooltip";
import "./Sidebar.css";

const AppSidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  return (
    <Sidebar
      collapsed={collapsed}
      width="260px"
      collapsedWidth="80px"
      rootStyles={{
        position: "relative",
        margin: "10px 0 10px 10px",
        border: "1px solid #efefef",
        borderRadius: "10px",
        boxShadow: "rgba(17, 12, 46, 0.15) 0px 48px 100px 0px",
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
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px",
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
          component={<Link to="/dashboard/planning" />}
          active={location.pathname === "/dashboard/planning"}
        >
          Production Planning
        </MenuItem>

        <MenuItem
          icon={
            <SidebarTooltip label="Process Tracking" collapsed={collapsed}>
              <FontAwesomeIcon icon={faRoute} />
            </SidebarTooltip>
          }
          component={<Link to="/dashboard/tracking" />}
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
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px",
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
          component={<Link to="/dashboard/quality" />}
          active={location.pathname === "/dashboard/quality"}
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
          component={<Link to="/dashboard/quality/ng-rework" />}
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
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px",
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
          component={<Link to="/dashboard/reports/daily" />}
          active={location.pathname === "/dashboard/reports/daily"}
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
          component={<Link to="/dashboard/reports/monthly" />}
          active={location.pathname === "/dashboard/reports/monthly"}
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
          component={<Link to="/dashboard/reports/yearly" />}
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
            paddingLeft: collapsed ? "0px" : "16px",
            fontSize: collapsed ? "0px" : "12px",
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
          component={<Link to="/dashboard/analytics" />}
          active={location.pathname === "/dashboard/analytics"}
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
          component={<Link to="/dashboard/usermaster" />}
          active={location.pathname === "/dashboard/usermaster"}
        >
          User Master
        </MenuItem>
      </Menu>
    </Sidebar>
  );
};

export default AppSidebar;
