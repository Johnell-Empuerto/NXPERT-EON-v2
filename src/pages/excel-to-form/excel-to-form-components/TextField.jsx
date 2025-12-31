// TextField.js - Remove renderCharacterCounter and update getTooltipContent
import React, { useEffect, useRef, useLayoutEffect } from "react";

const TextField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  multiline = false,
  autoShrinkFont = true,
  // Color props
  bgColor = "#ffffff",
  textColor = "#000000",
  // Exact match
  exactMatchText = "",
  exactMatchBgColor = "#d4edda",
  // Min length
  minLength = null,
  minLengthMode = "warning",
  minLengthWarningBg = "#ffebee",
  // NEW: Max length props
  maxLength = null,
  maxLengthMode = "warning",
  maxLengthWarningBg = "#fff3cd",
  // Other props
  bgColorInRange = "#ffffff",
  borderColorInRange = "#cccccc",
}) => {
  const inputRef = useRef(null);
  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  // Auto-resize textarea height when multiline
  useLayoutEffect(() => {
    if (multiline && inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, multiline]);

  // Auto-shrink font
  useEffect(() => {
    if (!inputRef.current || !autoShrinkFont) {
      if (inputRef.current) {
        inputRef.current.style.fontSize = `${defaultFontSize}px`;
      }
      return;
    }

    const element = inputRef.current;
    const isTextarea = multiline;
    const containerWidth = element.clientWidth - 20;
    const containerHeight = height;

    const text = value || label || "";
    if (!text) {
      element.style.fontSize = `${defaultFontSize}px`;
      return;
    }

    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = isTextarea ? "pre-wrap" : "nowrap";
    span.style.wordWrap = "break-word";
    span.style.width = isTextarea ? `${containerWidth}px` : "auto";
    span.style.font = window.getComputedStyle(element).font;
    span.textContent = text || " ";
    document.body.appendChild(span);

    const textWidth = span.getBoundingClientRect().width;
    const textHeight = span.scrollHeight;
    document.body.removeChild(span);

    let fontSize = defaultFontSize;

    if (textWidth > containerWidth || textHeight > containerHeight) {
      if (isTextarea && textHeight > containerHeight) {
        fontSize = (containerHeight / textHeight) * defaultFontSize;
      }
      if (textWidth > containerWidth) {
        fontSize = Math.min(
          fontSize,
          (containerWidth / textWidth) * defaultFontSize
        );
      }
    }

    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    element.style.fontSize = `${fontSize}px`;
  }, [value, label, height, multiline, autoShrinkFont]);

  // Determine background color based on validation rules
  const getBackgroundColor = () => {
    const currentValue = value || "";

    // Check exact match first (highest priority)
    if (exactMatchText && currentValue.trim() === exactMatchText.trim()) {
      return exactMatchBgColor;
    }

    // Check if below minimum length
    if (minLength !== null && currentValue.length < minLength) {
      return minLengthWarningBg;
    }

    // Check if above maximum length (NEW)
    if (maxLength !== null && currentValue.length > maxLength) {
      return maxLengthWarningBg;
    }

    // Default background
    return bgColor || bgColorInRange;
  };

  // Determine text color for validation states
  const getTextColor = () => {
    const currentValue = value || "";

    // If above maximum in strict mode, show warning color
    if (
      maxLength !== null &&
      maxLengthMode === "strict" &&
      currentLength > maxLength
    ) {
      return "#856404"; // Dark orange for warning text
    }

    // If below minimum in strict mode, show warning color
    if (
      minLength !== null &&
      minLengthMode === "strict" &&
      currentValue.length < minLength
    ) {
      return "#721c24"; // Dark red for warning text
    }

    return textColor;
  };

  // Handle input with validation
  const handleInputChange = (e) => {
    let newValue = e.target.value;
    const currentLength = newValue.length;

    // Handle max length strict mode
    if (
      maxLength !== null &&
      maxLengthMode === "strict" &&
      currentLength > maxLength
    ) {
      newValue = newValue.substring(0, maxLength);
      e.target.value = newValue; // enforce limit
    }

    onChange(name, newValue, "text", label);
  };

  // Calculate character count status for tooltip
  const getCharacterStatus = () => {
    const currentLength = value?.length || 0;

    if (minLength === null && maxLength === null) return null;

    let status = "";
    let statusColor = "#6c757d"; // Default gray

    if (maxLength !== null && currentLength > maxLength) {
      status = "❌ Exceeded maximum";
      statusColor = maxLengthMode === "strict" ? "#dc3545" : "#fd7e14";
    } else if (minLength !== null && currentLength < minLength) {
      status = "⚠️ Below minimum";
      statusColor = minLengthMode === "strict" ? "#dc3545" : "#fd7e14";
    } else if (maxLength !== null && currentLength >= maxLength * 0.9) {
      status = "⚠️ Near limit";
      statusColor = "#ffc107";
    } else if (maxLength !== null) {
      status = "✓ Within limits";
      statusColor = "#28a745";
    } else if (minLength !== null && currentLength >= minLength) {
      status = "✓ Minimum met";
      statusColor = "#28a745";
    }

    return {
      status,
      color: statusColor,
      current: currentLength,
      min: minLength,
      max: maxLength,
    };
  };

  const commonProps = {
    ref: inputRef,
    placeholder: label,
    className: "form-input",
    value: value,
    onChange: handleInputChange,
    maxLength:
      maxLengthMode === "strict" && maxLength !== null ? maxLength : undefined,
    style: {
      height: multiline ? "auto" : `${height}px`,
      minHeight: multiline ? `${height}px` : undefined,
      fontSize: `${defaultFontSize}px`,
      padding: "8px 10px",
      boxSizing: "border-box",
      overflow: "hidden",
      resize: "none",
      whiteSpace: multiline ? "pre-wrap" : "nowrap",
      textOverflow: "clip",
      backgroundColor: getBackgroundColor(),
      color: getTextColor(),
      border: `1px solid ${borderColorInRange}`,
      transition: "all 0.3s ease",
    },
  };

  return multiline ? (
    <textarea {...commonProps} rows={1} />
  ) : (
    <input type="text" {...commonProps} />
  );
};

export default TextField;
