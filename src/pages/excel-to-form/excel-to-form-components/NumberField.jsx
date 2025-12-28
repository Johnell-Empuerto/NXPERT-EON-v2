// fields/NumberField.js
import React, { useState, useEffect } from "react";

const NumberField = ({
  label,
  name,
  value = null,
  onChange,
  decimalPlaces = 2,
  height = 38,
  onHeightChange,
}) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const num = typeof value === "number" ? value : parseFloat(value);
      if (!isNaN(num)) {
        const formatted =
          decimalPlaces !== undefined
            ? num.toFixed(decimalPlaces)
            : num.toString();
        setDisplayValue(formatted);
      }
    } else {
      setDisplayValue("");
    }
  }, [value, decimalPlaces]);

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "" || val === "." || /^\d*\.?\d*$/.test(val)) {
      setDisplayValue(val);
      const num = val === "" || val === "." ? null : parseFloat(val);
      onChange(name, isNaN(num) ? null : num, "number", label);
    }
  };

  const handleBlur = () => {
    if (displayValue === "" || displayValue === ".") {
      setDisplayValue("");
      onChange(name, null, "number", label);
      return;
    }

    const num = parseFloat(displayValue);
    if (!isNaN(num)) {
      const formatted =
        decimalPlaces !== undefined
          ? num.toFixed(decimalPlaces)
          : num.toString();
      setDisplayValue(formatted);
      onChange(name, num, "number", label);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={label}
      className="form-input"
      style={{ height: `${height}px` }}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default NumberField;
