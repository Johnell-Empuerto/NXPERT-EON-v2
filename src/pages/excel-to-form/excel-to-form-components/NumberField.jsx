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
  // VALIDATION SETTINGS - All optional
  min = null,
  max = null,
  // FULLY CUSTOMIZABLE COLORS - All with defaults
  bgColorInRange = "#ffffff",
  bgColorBelowMin = "#e3f2fd",
  bgColorAboveMax = "#ffebee",
  borderColorInRange = "#cccccc",
  borderColorBelowMin = "#2196f3",
  borderColorAboveMax = "#f44336",
}) => {
  const [displayValue, setDisplayValue] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationStatus, setValidationStatus] = useState("inRange"); // 'inRange', 'belowMin', 'aboveMax'
  const inputRef = useRef(null);

  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  const allowsDecimal = decimalPlaces !== undefined && decimalPlaces !== null;

  // Sync displayValue with incoming value and validate
  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setDisplayValue("");
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    const num = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(num)) {
      setDisplayValue("");
      setIsValid(false);
      setValidationStatus("inRange");
      return;
    }

    // Format display value
    let formatted;
    if (allowsDecimal) {
      formatted = num.toFixed(decimalPlaces);
    } else {
      formatted = Math.round(num).toString();
    }
    setDisplayValue(formatted);

    // Validate min/max
    validateNumber(num);
  }, [value, decimalPlaces, allowsDecimal, min, max]);

  // Validate number against min/max constraints
  const validateNumber = (num) => {
    let isValidValue = true;
    let status = "inRange";

    // Only validate if we have a valid number
    if (num === null || isNaN(num)) {
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    // Convert min/max to numbers if they're not null/undefined
    const minNum = min != null ? parseFloat(min) : null;
    const maxNum = max != null ? parseFloat(max) : null;

    // Only validate if the conversion was successful
    if (minNum !== null && !isNaN(minNum) && num < minNum) {
      isValidValue = false;
      status = "belowMin";
    } else if (maxNum !== null && !isNaN(maxNum) && num > maxNum) {
      isValidValue = false;
      status = "aboveMax";
    }

    console.log(
      `Validation: num=${num}, min=${minNum}, max=${maxNum}, isValid=${isValidValue}, status=${status}`
    ); // Debug log

    setIsValid(isValidValue);
    setValidationStatus(status);
  };

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

  // Determine background color based on validation status
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

  // Determine border color based on validation status
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

  // Get validation status text for indicator
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

    // Allow empty, minus sign, and digits
    let regex;
    if (allowsDecimal) {
      regex = /^-?\d*\.?\d*$/;
    } else {
      regex = /^-?\d*$/;
    }

    if (val === "" || val === "-" || regex.test(val)) {
      setDisplayValue(val);

      const num =
        val === "" || val === "-" || val === "." ? null : parseFloat(val);

      if (val === "" || val === "-" || val === "." || isNaN(num)) {
        onChange(name, null, "number", label);
        setIsValid(true);
        setValidationStatus("inRange");
      } else {
        onChange(name, num, "number", label);
        // Validate immediately as user types
        validateNumber(num);
      }
    }
  };

  const handleBlur = () => {
    if (displayValue === "" || displayValue === "-" || displayValue === ".") {
      setDisplayValue("");
      onChange(name, null, "number", label);
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    let num = parseFloat(displayValue);
    if (isNaN(num)) {
      setDisplayValue("");
      onChange(name, null, "number", label);
      setIsValid(true);
      setValidationStatus("inRange");
      return;
    }

    // Apply formatting
    let finalValue;
    if (allowsDecimal) {
      const formatted = num.toFixed(decimalPlaces);
      setDisplayValue(formatted);
      finalValue = parseFloat(formatted);
    } else {
      num = Math.round(num);
      setDisplayValue(num.toString());
      finalValue = num;
    }

    // Send the final value
    onChange(name, finalValue, "number", label);

    // Validate after formatting
    validateNumber(finalValue);
  };

  // Get comprehensive tooltip text
  const getTooltipText = () => {
    let tooltip = label || "";

    // Add validation info if min/max is set
    if (min !== null || max !== null) {
      tooltip += "\n\n";
      tooltip += "Validation Range:\n";
      if (min !== null) tooltip += `• Min: ${min}\n`;
      if (max !== null) tooltip += `• Max: ${max}\n`;
    }

    // Add current validation status if invalid
    if (!isValid) {
      tooltip += "\n";
      if (validationStatus === "belowMin") {
        tooltip += `⚠️ Current value is below minimum (${min})`;
      } else if (validationStatus === "aboveMax") {
        tooltip += `⚠️ Current value is above maximum (${max})`;
      }
    }

    // Add decimal places info
    if (decimalPlaces !== undefined && decimalPlaces !== null) {
      tooltip += `\n\nDecimal Places: ${decimalPlaces}`;
      if (decimalPlaces === 0) {
        tooltip += " (Integer only)";
      }
    }

    return tooltip.trim();
  };

  // Get input title for validation feedback
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
        onBlur={handleBlur}
        title={getTooltipText()} // Show comprehensive tooltip
      />

      {/* Validation indicator - shows only as small icon */}
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

      {/* REMOVED: min/max labels and validation status text */}
      {/* REMOVED: Color preview for current validation state */}
    </div>
  );
};

export default NumberField;
