// fields/NumberField.js
import React, { useState, useEffect, useRef } from "react";

const NumberField = ({
  label,
  name,
  value = null,
  onChange,
  decimalPlaces,
  height = 38,
  onHeightChange,
  min = null,
  max = null,
  bgColorInRange = "#ffffff",
  bgColorBelowMin = "#e3f2fd",
  bgColorAboveMax = "#ffebee",
  borderColorInRange = "#cccccc",
  borderColorBelowMin = "#2196f3",
  borderColorAboveMax = "#f44336",
}) => {
  const [displayValue, setDisplayValue] = useState("");
  const [rawValue, setRawValue] = useState(""); // Store raw user input
  const [isValid, setIsValid] = useState(true);
  const [validationStatus, setValidationStatus] = useState("inRange");
  const inputRef = useRef(null);
  const isEditing = useRef(false); // Track if user is currently typing

  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  const allowsDecimal = decimalPlaces !== undefined && decimalPlaces !== null;

  // Initialize displayValue from props
  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
      setRawValue("");
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    const num = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(num)) {
      setDisplayValue("");
      setRawValue("");
      setIsValid(false);
      setValidationStatus("inRange");
      return;
    }

    // Format for display (only when not editing)
    if (!isEditing.current) {
      let formatted;
      if (allowsDecimal) {
        formatted = num.toFixed(decimalPlaces);
      } else {
        formatted = Math.round(num).toString();
      }
      setDisplayValue(formatted);
      setRawValue(formatted);
    }

    // Validate min/max
    validateNumber(num);
  }, [value, decimalPlaces, allowsDecimal, min, max]);

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

  // Validate number against min/max constraints
  const validateNumber = (num) => {
    let isValidValue = true;
    let status = "inRange";

    if (num === null || isNaN(num)) {
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    const minNum = min != null ? parseFloat(min) : null;
    const maxNum = max != null ? parseFloat(max) : null;

    if (minNum !== null && !isNaN(minNum) && num < minNum) {
      isValidValue = false;
      status = "belowMin";
    } else if (maxNum !== null && !isNaN(maxNum) && num > maxNum) {
      isValidValue = false;
      status = "aboveMax";
    }

    setIsValid(isValidValue);
    setValidationStatus(status);
  };

  const getBackgroundColor = () => {
    switch (validationStatus) {
      case "belowMin":
        return bgColorBelowMin;
      case "aboveMax":
        return bgColorAboveMax;
      case "inRange":
      default:
        return bgColorInRange;
    }
  };

  const getBorderColor = () => {
    switch (validationStatus) {
      case "belowMin":
        return borderColorBelowMin;
      case "aboveMax":
        return borderColorAboveMax;
      case "inRange":
      default:
        return borderColorInRange;
    }
  };

  const getValidationIndicator = () => {
    const minNum = min != null ? parseFloat(min) : null;
    const maxNum = max != null ? parseFloat(max) : null;

    switch (validationStatus) {
      case "belowMin":
        return {
          symbol: "<",
          color: borderColorBelowMin,
          title: `Below minimum (${minNum})`,
        };
      case "aboveMax":
        return {
          symbol: ">",
          color: borderColorAboveMax,
          title: `Above maximum (${maxNum})`,
        };
      default:
        return null;
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    isEditing.current = true; // User is typing

    // Allow empty, minus sign, digits, and decimal point
    let regex;
    if (allowsDecimal) {
      // Allow: empty, minus sign, digits, decimal point
      regex = /^-?\d*\.?\d*$/;
    } else {
      regex = /^-?\d*$/;
    }

    if (val === "" || val === "-" || regex.test(val)) {
      // Store raw value as user types
      setRawValue(val);
      setDisplayValue(val);

      // Parse to number for validation
      const num =
        val === "" || val === "-" || val === "." || val === "-."
          ? null
          : parseFloat(val);

      if (
        val === "" ||
        val === "-" ||
        val === "." ||
        val === "-." ||
        isNaN(num)
      ) {
        // Keep raw value as is, don't format yet
        onChange(name, null, "number", label);
        setIsValid(true);
        setValidationStatus("inRange");
      } else {
        // Update the actual value but keep raw display
        onChange(name, num, "number", label);
        validateNumber(num);
      }
    }
  };

  const handleFocus = () => {
    isEditing.current = true;
    // When focused, show the raw value for editing
    setDisplayValue(rawValue);
  };

  const handleBlur = () => {
    isEditing.current = false; // User stopped editing

    if (
      rawValue === "" ||
      rawValue === "-" ||
      rawValue === "." ||
      rawValue === "-."
    ) {
      setDisplayValue("");
      setRawValue("");
      onChange(name, null, "number", label);
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    let num = parseFloat(rawValue);
    if (isNaN(num)) {
      setDisplayValue("");
      setRawValue("");
      onChange(name, null, "number", label);
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    // Apply decimal formatting only on blur
    let finalValue;
    let formattedDisplay;

    if (allowsDecimal && decimalPlaces > 0) {
      // Check if user already typed a decimal point
      const hasDecimal = rawValue.includes(".");

      if (hasDecimal) {
        // User typed a decimal, format with exact decimal places
        finalValue = parseFloat(num.toFixed(decimalPlaces));
        formattedDisplay = finalValue.toFixed(decimalPlaces);
      } else {
        // User didn't type decimal, add .00
        finalValue = parseFloat(num.toFixed(decimalPlaces));
        formattedDisplay = finalValue.toFixed(decimalPlaces);
      }
    } else if (allowsDecimal && decimalPlaces === 0) {
      // Integer only
      finalValue = Math.round(num);
      formattedDisplay = finalValue.toString();
    } else {
      // No decimal places specified
      finalValue = num;
      formattedDisplay = num.toString();
    }

    // Update display and raw value
    setDisplayValue(formattedDisplay);
    setRawValue(formattedDisplay);

    // Send the final formatted value
    onChange(name, finalValue, "number", label);

    // Validate after formatting
    validateNumber(finalValue);
  };

  const getTooltipText = () => {
    let tooltip = label || "";

    if (min !== null || max !== null) {
      tooltip += "\n\n";
      tooltip += "Validation Range:\n";
      if (min !== null) tooltip += `• Min: ${min}\n`;
      if (max !== null) tooltip += `• Max: ${max}\n`;
    }

    if (!isValid) {
      tooltip += "\n";
      if (validationStatus === "belowMin") {
        tooltip += `⚠️ Current value is below minimum (${min})`;
      } else if (validationStatus === "aboveMax") {
        tooltip += `⚠️ Current value is above maximum (${max})`;
      }
    }

    if (decimalPlaces !== undefined && decimalPlaces !== null) {
      tooltip += `\n\nDecimal Places: ${decimalPlaces}`;
      if (decimalPlaces === 0) {
        tooltip += " (Integer only)";
      } else {
        tooltip += ` (Will format to ${decimalPlaces} decimals on blur)`;
      }
    }

    return tooltip.trim();
  };

  const getInputTitle = () => {
    if (!isValid) {
      if (validationStatus === "belowMin") {
        return `Value is below minimum (${min})`;
      } else if (validationStatus === "aboveMax") {
        return `Value is above maximum (${max})`;
      }
    }
    return label || "";
  };

  const indicator = getValidationIndicator();

  return (
    <div className="number-field-container" style={{ position: "relative" }}>
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
          backgroundColor: getBackgroundColor(),
          border: `2px solid ${getBorderColor()}`,
          transition: "all 0.3s ease",
          outline: "none",
        }}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        title={getTooltipText()}
      />

      {indicator && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            backgroundColor: indicator.color,
            color: "white",
            fontSize: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            border: "1px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            cursor: "help",
            zIndex: 10,
          }}
          title={indicator.title}
        >
          {indicator.symbol}
        </div>
      )}
    </div>
  );
};

export default NumberField;
