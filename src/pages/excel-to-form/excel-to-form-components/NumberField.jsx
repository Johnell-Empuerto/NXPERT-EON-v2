// fields/NumberField.js
import React, { useState, useEffect, useRef } from "react";

const NumberField = ({
  label,
  name,
  value = null,
  onChange,
  decimalPlaces, // can be number (e.g. 2) or undefined/null for integer-only
  height = 38,
  onHeightChange,
}) => {
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef(null);

  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  const allowsDecimal = decimalPlaces !== undefined && decimalPlaces !== null;

  // Sync displayValue with incoming value
  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
      return;
    }

    const num = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(num)) {
      setDisplayValue("");
      return;
    }

    if (allowsDecimal) {
      setDisplayValue(num.toFixed(decimalPlaces));
    } else {
      setDisplayValue(Math.round(num).toString()); // integer only
    }
  }, [value, decimalPlaces, allowsDecimal]);

  // Auto-resize font
  useEffect(() => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const containerWidth = input.clientWidth - 20;
    const containerHeight = height;

    const text = displayValue || label || "";

    if (!text) {
      input.style.fontSize = `${defaultFontSize}px`;
      return;
    }

    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    span.style.font = window.getComputedStyle(input).font;
    span.textContent = text;
    document.body.appendChild(span);

    const textWidth = span.getBoundingClientRect().width;
    const textHeight = span.getBoundingClientRect().height;
    document.body.removeChild(span);

    let fontSize = defaultFontSize;

    if (textWidth > containerWidth) {
      fontSize = (containerWidth / textWidth) * defaultFontSize;
    }

    if (textHeight > containerHeight) {
      fontSize = Math.min(fontSize, (containerHeight / textHeight) * fontSize);
    }

    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    input.style.fontSize = `${fontSize}px`;
  }, [displayValue, label, height]);

  const handleChange = (e) => {
    const val = e.target.value;

    // Allow empty, minus sign, and digits
    let regex;
    if (allowsDecimal) {
      // Allow one decimal point
      regex = /^-?\d*\.?\d*$/;
    } else {
      // Integer only: no decimal point allowed
      regex = /^-?\d*$/;
    }

    if (val === "" || val === "-" || regex.test(val)) {
      setDisplayValue(val);

      // Convert to number or null
      const num = val === "" || val === "-" ? null : parseFloat(val);
      onChange(name, isNaN(num) ? null : num, "number", label);
    }
    // If invalid, do nothing (don't update displayValue)
  };

  const handleBlur = () => {
    if (displayValue === "" || displayValue === "-" || displayValue === ".") {
      setDisplayValue("");
      onChange(name, null, "number", label);
      return;
    }

    let num = parseFloat(displayValue);
    if (isNaN(num)) {
      setDisplayValue("");
      onChange(name, null, "number", label);
      return;
    }

    if (allowsDecimal) {
      // Format with fixed decimal places
      const formatted = num.toFixed(decimalPlaces);
      setDisplayValue(formatted);
      onChange(name, parseFloat(formatted), "number", label);
    } else {
      // Integer only: round and remove decimals
      num = Math.round(num);
      setDisplayValue(num.toString());
      onChange(name, num, "number", label);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={allowsDecimal ? "decimal" : "numeric"}
      placeholder={label}
      className="form-input"
      style={{
        height: `${height}px`,
        fontSize: `${defaultFontSize}px`,
        padding: "0 10px",
        boxSizing: "border-box",
        overflow: "hidden",
        textOverflow: "clip",
        whiteSpace: "nowrap",
      }}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default NumberField;
