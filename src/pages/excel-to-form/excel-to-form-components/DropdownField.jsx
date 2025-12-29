// fields/DropdownField.js
import React, { useEffect, useRef } from "react";

const DropdownField = ({
  label,
  name,
  value = "",
  onChange,
  options = [],
  height = 38,
  onHeightChange,
}) => {
  const selectRef = useRef(null);

  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  useEffect(() => {
    if (!selectRef.current) return;

    const select = selectRef.current;
    const containerWidth = select.clientWidth - 40; // More padding for select (arrow + padding)
    const containerHeight = height;

    // Get the text to measure: selected value or placeholder (label)
    let displayText = label; // default to placeholder

    if (value) {
      const selectedOption = options.find((opt) => opt === value);
      if (selectedOption) {
        displayText = selectedOption;
      }
    }

    if (!displayText) {
      select.style.fontSize = `${defaultFontSize}px`;
      return;
    }

    // Measure text width with hidden span
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    span.style.font = window.getComputedStyle(select).font;
    span.textContent = displayText;
    document.body.appendChild(span);

    const textWidth = span.getBoundingClientRect().width;
    const textHeight = span.getBoundingClientRect().height;
    document.body.removeChild(span);

    let fontSize = defaultFontSize;

    // Shrink if text is too wide (most common case)
    if (textWidth > containerWidth) {
      fontSize = (containerWidth / textWidth) * defaultFontSize;
    }

    // Optional vertical shrink
    if (textHeight > containerHeight) {
      fontSize = Math.min(fontSize, (containerHeight / textHeight) * fontSize);
    }

    // Clamp
    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));

    select.style.fontSize = `${fontSize}px`;
  }, [value, options, label, height]); // Re-run when selection, options, label or height changes

  return (
    <select
      ref={selectRef}
      className="form-select"
      style={{
        height: `${height}px`,
        fontSize: `${defaultFontSize}px`, // initial
        padding: "0 30px 0 10px", // space for dropdown arrow
        boxSizing: "border-box",
        overflow: "hidden",
        textOverflow: "clip", // avoid ellipsis
        whiteSpace: "nowrap",
      }}
      value={value}
      onChange={(e) => onChange(name, e.target.value, "dropdown", label)}
    >
      <option value="" disabled>
        {label}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};

export default DropdownField;
