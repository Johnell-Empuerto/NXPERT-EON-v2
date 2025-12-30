// CalculationField.js - SIMPLIFIED VERSION
import React, { useState, useEffect } from "react";

const CalculationField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
  formula = "",
  decimalPlaces = 0,
  formData = {},
  fieldConfigs = {},
  fieldPosition = "",
  fieldValueMap = {},
  allFields = [],
}) => {
  const [calculatedValue, setCalculatedValue] = useState("");
  const [hasError, setHasError] = useState(false);

  // Parse Excel-style range notation (e.g., S1F4:S1F13)
  const parseRange = (rangeStr) => {
    const cleanRangeStr = rangeStr.replace(/\s/g, "");
    const match = cleanRangeStr.match(/^S(\d+)F(\d+):S(\d+)F(\d+)$/i);
    if (!match) return null;

    const [, sheet1, startField, sheet2, endField] = match.map(Number);
    if (sheet1 !== sheet2) return null;

    const fieldRefs = [];
    for (let i = startField; i <= endField; i++) {
      fieldRefs.push(`S${sheet1}F${i}`);
    }
    return fieldRefs;
  };

  // Parse Excel function (e.g., SUM(S1F4:S1F13))
  const parseExcelFunction = (formulaStr) => {
    const normalizedFormula = formulaStr.replace(/\s+/g, " ").trim();
    const functionMatch = normalizedFormula.match(
      /^(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(\s*(.+?)\s*\)$/i
    );

    if (!functionMatch) return null;

    const [, func, args] = functionMatch;
    const funcUpper = func.toUpperCase();
    const cleanArgs = args.replace(/\s/g, "");
    const argList = cleanArgs.split(",").filter((arg) => arg.length > 0);

    const allFieldRefs = [];
    argList.forEach((arg) => {
      if (arg.includes(":")) {
        const rangeFields = parseRange(arg);
        if (rangeFields) {
          allFieldRefs.push(...rangeFields);
        } else if (arg.match(/^S\d+F\d+$/i)) {
          allFieldRefs.push(arg.toUpperCase());
        }
      } else if (arg.match(/^S\d+F\d+$/i)) {
        allFieldRefs.push(arg.toUpperCase());
      }
    });

    return {
      function: funcUpper,
      fieldRefs: allFieldRefs,
    };
  };

  // Apply Excel function to values
  const applyExcelFunction = (func, values) => {
    const numericValues = values.filter(
      (v) => !isNaN(v) && v !== null && v !== undefined
    );

    switch (func) {
      case "SUM":
        return numericValues.reduce((sum, val) => sum + val, 0);
      case "AVERAGE":
        return numericValues.length > 0
          ? numericValues.reduce((sum, val) => sum + val, 0) /
              numericValues.length
          : 0;
      case "MIN":
        return numericValues.length > 0 ? Math.min(...numericValues) : 0;
      case "MAX":
        return numericValues.length > 0 ? Math.max(...numericValues) : 0;
      case "COUNT":
        return numericValues.length;
      default:
        return 0;
    }
  };

  // Evaluate the formula
  const evaluateFormula = (formulaStr) => {
    if (!formulaStr || formulaStr.trim() === "") return "";

    try {
      // Check for Excel functions
      const excelFunc = parseExcelFunction(formulaStr);
      if (excelFunc) {
        const values = excelFunc.fieldRefs.map((ref) => {
          const fieldValue =
            fieldValueMap[ref.toUpperCase()] ||
            fieldValueMap[ref.toLowerCase()] ||
            0;

          if (
            fieldValue === 0 ||
            fieldValue === null ||
            fieldValue === undefined
          ) {
            const fieldInfo = allFields.find(
              (f) => f.position.toUpperCase() === ref.toUpperCase()
            );
            if (fieldInfo && fieldInfo.value !== undefined) {
              return !isNaN(fieldInfo.value) ? parseFloat(fieldInfo.value) : 0;
            }
          }

          return fieldValue !== null &&
            fieldValue !== undefined &&
            !isNaN(fieldValue) &&
            fieldValue !== ""
            ? parseFloat(fieldValue)
            : 0;
        });

        const result = applyExcelFunction(excelFunc.function, values);
        return formatWithDecimals(result, decimalPlaces);
      }

      // Handle simple range notation
      let expression = formulaStr;
      const rangeMatches = formulaStr.match(/S\d+F\d+\s*:\s*S\d+F\d+/gi) || [];
      rangeMatches.forEach((range) => {
        const rangeFields = parseRange(range);
        if (rangeFields) {
          const sum = rangeFields.reduce((total, ref) => {
            const fieldValue =
              fieldValueMap[ref.toUpperCase()] ||
              fieldValueMap[ref.toLowerCase()] ||
              0;
            return (
              total +
              (fieldValue !== null &&
              fieldValue !== undefined &&
              !isNaN(fieldValue) &&
              fieldValue !== ""
                ? parseFloat(fieldValue)
                : 0)
            );
          }, 0);
          expression = expression.replace(
            new RegExp(range.replace(/\s/g, "\\s*"), "gi"),
            sum
          );
        }
      });

      // Replace individual field references
      const individualRefs = expression.match(/S\d+F\d+/gi) || [];
      individualRefs.forEach((ref) => {
        const fieldValue =
          fieldValueMap[ref.toUpperCase()] ||
          fieldValueMap[ref.toLowerCase()] ||
          0;

        let finalValue = fieldValue;
        if (
          fieldValue === 0 ||
          fieldValue === null ||
          fieldValue === undefined
        ) {
          const fieldInfo = allFields.find(
            (f) => f.position.toUpperCase() === ref.toUpperCase()
          );
          if (fieldInfo && fieldInfo.value !== undefined) {
            finalValue = fieldInfo.value;
          }
        }

        if (
          finalValue !== null &&
          finalValue !== undefined &&
          !isNaN(finalValue) &&
          finalValue !== ""
        ) {
          expression = expression.replace(new RegExp(ref, "gi"), finalValue);
        } else {
          expression = expression.replace(new RegExp(ref, "gi"), "0");
        }
      });

      expression = expression.replace(/\s/g, "");
      const result = safeEval(expression);

      if (typeof result === "number") {
        return formatWithDecimals(result, decimalPlaces);
      }

      return result.toString();
    } catch (err) {
      console.error("Formula error:", err);
      setHasError(true);
      return "Error";
    }
  };

  // Format number with decimal places
  const formatWithDecimals = (number, decimals) => {
    const num = typeof number === "string" ? parseFloat(number) : number;
    if (isNaN(num)) return "0";

    return decimals === 0 ? Math.round(num).toString() : num.toFixed(decimals);
  };

  // Safe evaluation
  const safeEval = (expression) => {
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
    try {
      return Function(`"use strict"; return (${sanitized})`)();
    } catch (err) {
      throw new Error(`Invalid expression`);
    }
  };

  useEffect(() => {
    if (formula) {
      const result = evaluateFormula(formula);
      setCalculatedValue(result);
      setHasError(result === "Error");

      if (onChange && result !== value) {
        onChange(name, result, "calculation", label);
      }
    } else {
      setCalculatedValue("");
      setHasError(false);
    }
  }, [formula, formData, decimalPlaces, fieldValueMap, allFields]);

  // Create a comprehensive tooltip
  const getTooltipText = () => {
    let tooltip = label || "";

    if (formula) {
      tooltip += `\n\nFormula: ${formula}`;
    }

    if (fieldPosition) {
      tooltip += `\nPosition: ${fieldPosition}`;
    }

    if (decimalPlaces !== undefined && decimalPlaces !== null) {
      tooltip += `\nDecimal Places: ${decimalPlaces}`;
    }

    if (hasError) {
      tooltip += "\n\n⚠️ Formula calculation error";
    }

    return tooltip.trim();
  };

  return (
    <div className="calculation-field" style={{ position: "relative" }}>
      <input
        type="text"
        value={calculatedValue}
        readOnly
        className="form-input calculation-input"
        placeholder={label}
        style={{
          height: `${height}px`,
          backgroundColor: hasError ? "#ffe6e6" : "#f5f5f5",
          cursor: "not-allowed",
          borderColor: hasError ? "#ff6b6b" : "#ccc",
          padding: "0 10px",
          boxSizing: "border-box",
          overflow: "hidden",
          textOverflow: "clip",
          whiteSpace: "nowrap",
          outline: "none",
        }}
        title={getTooltipText()} // Tooltip with all info
      />

      {/* Error indicator - small red dot */}
      {hasError && (
        <div
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#ff6b6b",
            border: "1px solid white",
            zIndex: 10,
          }}
          title="Formula calculation error"
        />
      )}
    </div>
  );
};

export default CalculationField;
