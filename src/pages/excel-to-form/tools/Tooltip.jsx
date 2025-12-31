// Tooltip.js
import React, { useState, useRef, useEffect } from "react";
import "./Tooltip.css"; // We'll create this
const Tooltip = ({
  children,
  content,
  position = "top",
  delay = 100,
  showOnFocus = true,
  showOnHover = false, // Disabled by default for touch devices
}) => {
  const [visible, setVisible] = useState(false);
  const [touchTimer, setTouchTimer] = useState(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);
  const isTouchDevice = () => {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  };
  const showTooltip = () => {
    if (touchTimer) clearTimeout(touchTimer);
    setVisible(true);
  };
  const hideTooltip = () => {
    // Small delay for better UX on touch devices
    if (isTouchDevice()) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      setTouchTimer(timer);
    } else {
      setVisible(false);
    }
  };
  const handleFocus = () => {
    if (showOnFocus) showTooltip();
  };
  const handleBlur = () => {
    if (showOnFocus) hideTooltip();
  };
  const handleMouseEnter = () => {
    if (showOnHover && !isTouchDevice()) showTooltip();
  };
  const handleMouseLeave = () => {
    if (showOnHover && !isTouchDevice()) hideTooltip();
  };
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimer) clearTimeout(touchTimer);
    };
  }, [touchTimer]);
  return (
    <div
      className="tooltip-container"
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-block", width: "100%" }}
    >
      {children}
      {content && (
        <div
          ref={tooltipRef}
          className={`input-tooltip position-${position} ${
            visible ? "visible" : ""
          }`}
          role="tooltip"
          aria-hidden={!visible}
        >
          <div
            className="tooltip-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </div>
  );
};
export default Tooltip;
