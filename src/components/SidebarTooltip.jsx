import React from "react";
import "./SidebarTooltip.css";

const SidebarTooltip = ({ label, collapsed, children }) => {
  // Only show tooltip when sidebar is collapsed
  if (!collapsed) {
    return <>{children}</>;
  }

  return (
    <div className="sidebar-tooltip-container">
      {children}
      <div className="sidebar-tooltip">{label}</div>
    </div>
  );
};

export default SidebarTooltip;
