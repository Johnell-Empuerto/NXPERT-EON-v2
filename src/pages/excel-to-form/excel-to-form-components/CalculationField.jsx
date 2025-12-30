// CalculationField.js
import React, { useState, useEffect } from "react";

const CalculationField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
  formula = "",
  decimalPlaces = 2,
  formData = {},
  fieldConfigs = {},
  fieldPosition = "",
  fieldValueMap = {},
}) => {
  const [calculatedValue, setCalculatedValue] = useState("");
  const [error, setError] = useState("");

  // Parse and evaluate the formula
  const evaluateFormula = (formulaStr) => {
    if (!formulaStr) return "";

    try {
      // Replace field references with actual values from the mapping
      let expression = formulaStr;

      // Extract field references (like S1F1, S2F3, etc.)
      const fieldRefs = formulaStr.match(/S\d+F\d+/g) || [];

      fieldRefs.forEach((ref) => {
        // Get the value from our mapping
        const fieldValue = fieldValueMap[ref];

        if (
          fieldValue !== null &&
          fieldValue !== undefined &&
          !isNaN(fieldValue)
        ) {
          expression = expression.replace(new RegExp(ref, "g"), fieldValue);
        } else {
          expression = expression.replace(new RegExp(ref, "g"), "0");
        }
      });

      // Evaluate the expression safely
      const result = safeEval(expression);

      // Format with decimal places
      if (typeof result === "number") {
        // Always format to the specified decimal places
        return formatWithDecimals(result, decimalPlaces);
      }

      return result.toString();
    } catch (err) {
      console.error("Formula evaluation error:", err);
      setError(`Formula error: ${err.message}`);
      return "Error";
    }
  };

  // Format number with specified decimal places
  const formatWithDecimals = (number, decimals) => {
    if (decimals === undefined || decimals === null) {
      decimals = 2; // Default to 2 decimal places
    }

    // Convert to number if it's a string
    const num = typeof number === "string" ? parseFloat(number) : number;

    if (isNaN(num)) return "0.00";

    // Format with fixed decimal places
    return num.toFixed(decimals);
  };

  // Safe evaluation function
  const safeEval = (expression) => {
    // Remove any dangerous characters, allow basic math operations and parentheses
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");

    // Use Function constructor instead of eval for better security
    try {
      return new Function(`return ${sanitized}`)();
    } catch (err) {
      throw new Error(`Invalid expression: ${expression}`);
    }
  };

  useEffect(() => {
    if (formula) {
      const result = evaluateFormula(formula);
      setCalculatedValue(result);

      // Update parent form data
      if (onChange && result !== value) {
        // Store the formatted value for display, but also store the raw number
        // so calculations continue to work correctly
        onChange(name, result, "calculation", label);
      }
    } else {
      setCalculatedValue("");
    }
  }, [formula, formData, decimalPlaces, fieldValueMap]);

  return (
    <div className="calculation-field">
      <input
        type="text"
        value={calculatedValue}
        readOnly
        className="form-input calculation-input"
        placeholder={label}
        style={{
          height: `${height}px`,
          backgroundColor: "#f5f5f5",
          cursor: "not-allowed",
        }}
      />
      {error && (
        <div
          className="calculation-error"
          style={{
            fontSize: "11px",
            color: "#d32f2f",
            marginTop: "4px",
          }}
        >
          {error}
        </div>
      )}
      <div
        className="calculation-info"
        style={{
          fontSize: "10px",
          color: "#666",
          marginTop: "4px",
          fontStyle: "italic",
        }}
      >
        {formula ? `Formula: ${formula}` : "No formula set"}
        {fieldPosition && ` (${fieldPosition})`}
        {decimalPlaces !== undefined && ` | Decimals: ${decimalPlaces}`}
      </div>
    </div>
  );
};

export default CalculationField;
