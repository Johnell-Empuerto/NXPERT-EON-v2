// CalculationField.js - COMPLETE FIXED VERSION
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
  allFields = [],
}) => {
  const [calculatedValue, setCalculatedValue] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  // Parse Excel-style range notation (e.g., S1F4:S1F13)
  const parseRange = (rangeStr) => {
    // Remove all spaces from range string
    const cleanRangeStr = rangeStr.replace(/\s/g, "");
    const match = cleanRangeStr.match(/^S(\d+)F(\d+):S(\d+)F(\d+)$/i);
    if (!match) return null;

    const [, sheet1, startField, sheet2, endField] = match.map(Number);

    // Only support single sheet for now
    if (sheet1 !== sheet2) return null;

    const fieldRefs = [];
    for (let i = startField; i <= endField; i++) {
      fieldRefs.push(`S${sheet1}F${i}`);
    }
    return fieldRefs;
  };

  // Parse Excel function (e.g., SUM(S1F4:S1F13) or SUM (S1F4, S1F5, S1F6))
  const parseExcelFunction = (formulaStr) => {
    // Normalize the formula - replace multiple spaces with single space
    const normalizedFormula = formulaStr.replace(/\s+/g, " ").trim();

    // Match function with optional spaces before/after parentheses
    // Supports: SUM(S1F6:S1F11), SUM (S1F6:S1F11), SUM( S1F6:S1F11 ), etc.
    const functionMatch = normalizedFormula.match(
      /^(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(\s*(.+?)\s*\)$/i
    );

    if (!functionMatch) return null;

    const [, func, args] = functionMatch;
    const funcUpper = func.toUpperCase();

    // Parse arguments - clean up spaces but keep colons for ranges
    const cleanArgs = args.replace(/\s/g, "");
    const argList = cleanArgs.split(",").filter((arg) => arg.length > 0);

    const allFieldRefs = [];
    argList.forEach((arg) => {
      // Check if it's a range
      if (arg.includes(":")) {
        const rangeFields = parseRange(arg);
        if (rangeFields) {
          allFieldRefs.push(...rangeFields);
        } else {
          // Try to parse as individual field
          if (arg.match(/^S\d+F\d+$/i)) {
            allFieldRefs.push(arg.toUpperCase());
          }
        }
      } else if (arg.match(/^S\d+F\d+$/i)) {
        // Individual field
        allFieldRefs.push(arg.toUpperCase());
      }
    });

    return {
      function: funcUpper,
      fieldRefs: allFieldRefs,
      originalArgs: args,
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

  // Validate formula before calculation
  const validateFormula = (formulaStr) => {
    const errors = [];

    if (!formulaStr || formulaStr.trim() === "") {
      errors.push("Formula is empty");
      return errors;
    }

    // Extract all field references (individual and ranges)
    const individualRefs = (formulaStr.match(/S\d+F\d+/gi) || []).map((ref) =>
      ref.toUpperCase()
    );
    const rangeMatches = (
      formulaStr.match(/S\d+F\d+\s*:\s*S\d+F\d+/gi) || []
    ).map((ref) => ref.toUpperCase());

    let allFieldRefs = [...individualRefs];

    // Parse ranges
    rangeMatches.forEach((range) => {
      const rangeFields = parseRange(range);
      if (rangeFields) {
        allFieldRefs.push(...rangeFields);
      } else {
        errors.push(`Invalid range format: ${range}. Use S1F4:S1F13 format.`);
      }
    });

    // Parse Excel functions
    const excelFunc = parseExcelFunction(formulaStr);
    if (excelFunc) {
      allFieldRefs.push(...excelFunc.fieldRefs);
    }

    // Remove duplicates
    allFieldRefs = [...new Set(allFieldRefs)];

    // Check each field reference
    allFieldRefs.forEach((ref) => {
      // Find the field in allFields to get its type
      const fieldInfo = allFields.find(
        (f) => f.position.toUpperCase() === ref.toUpperCase()
      );

      if (!fieldInfo) {
        errors.push(`Field ${ref} not found`);
        return;
      }

      // Check if field type is compatible with calculations
      const incompatibleTypes = ["text", "date", "checkbox", "dropdown"];
      if (incompatibleTypes.includes(fieldInfo.type)) {
        errors.push(
          `Field ${ref} (${fieldInfo.label}) is type "${fieldInfo.type}" - cannot be used in calculations`
        );
      }

      // Get the value to check if it's numeric
      const fieldValue =
        fieldValueMap[ref.toUpperCase()] ||
        fieldValueMap[ref.toLowerCase()] ||
        (fieldInfo.value !== undefined ? fieldInfo.value : null);

      if (
        fieldValue !== null &&
        fieldValue !== undefined &&
        fieldValue !== ""
      ) {
        const numValue = parseFloat(fieldValue);
        if (isNaN(numValue) && fieldInfo.type === "number") {
          errors.push(
            `Field ${ref} (${fieldInfo.label}) has non-numeric value: "${fieldValue}"`
          );
        }
      }
    });

    // Check for invalid operators or syntax - more permissive regex
    // Allow spaces, field references, numbers, and common operators
    let cleanedFormula = formulaStr.replace(/S\d+F\d+/gi, "1"); // Replace field refs with test value
    if (excelFunc) {
      cleanedFormula = cleanedFormula.replace(
        new RegExp(`^${excelFunc.function}\\s*\\(`, "i"),
        "("
      );
    }
    const cleanedFormulaNoSpaces = cleanedFormula.replace(/\s/g, "");
    const validOperators = /^[0-9+\-*/().,:]+$/;
    if (
      cleanedFormulaNoSpaces.length > 0 &&
      !validOperators.test(cleanedFormulaNoSpaces)
    ) {
      errors.push("Formula contains invalid characters or operators");
    }

    // Check for division by zero
    if (formulaStr.includes("/0")) {
      errors.push("Formula may cause division by zero");
    }

    // Check for unbalanced parentheses
    const openParens = (formulaStr.match(/\(/g) || []).length;
    const closeParens = (formulaStr.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push("Unbalanced parentheses in formula");
    }

    return errors;
  };

  // Parse and evaluate the formula
  const evaluateFormula = (formulaStr) => {
    if (!formulaStr || formulaStr.trim() === "") return "";

    try {
      // Validate formula first
      const validationErrors = validateFormula(formulaStr);
      if (validationErrors.length > 0) {
        setValidationErrors(validationErrors);
        return "Validation Error";
      } else {
        setValidationErrors([]);
      }

      // Check for Excel functions
      const excelFunc = parseExcelFunction(formulaStr);
      if (excelFunc) {
        // Handle Excel function
        const values = excelFunc.fieldRefs.map((ref) => {
          const fieldValue =
            fieldValueMap[ref.toUpperCase()] ||
            fieldValueMap[ref.toLowerCase()] ||
            0;

          // Try to get from allFields if not in fieldValueMap
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

      // Handle simple range notation without function (e.g., S1F4:S1F13)
      let expression = formulaStr;

      // Replace ranges with sum (if no function specified)
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

      // Replace individual field references with actual values
      const individualRefs = expression.match(/S\d+F\d+/gi) || [];
      individualRefs.forEach((ref) => {
        const fieldValue =
          fieldValueMap[ref.toUpperCase()] ||
          fieldValueMap[ref.toLowerCase()] ||
          0;

        // Try to get from allFields if not in fieldValueMap
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

      // Remove any remaining spaces
      expression = expression.replace(/\s/g, "");

      // Evaluate the expression safely
      const result = safeEval(expression);

      // Format with decimal places
      if (typeof result === "number") {
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
      decimals = 2;
    }

    const num = typeof number === "string" ? parseFloat(number) : number;
    if (isNaN(num)) return "0.00";

    return num.toFixed(decimals);
  };

  // Safe evaluation function
  const safeEval = (expression) => {
    // Allow numbers, decimal points, and basic operators
    const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
    try {
      // Use Function constructor for safe evaluation
      return Function(`"use strict"; return (${sanitized})`)();
    } catch (err) {
      console.error("Safe eval error:", err, "for expression:", expression);
      throw new Error(`Invalid expression: ${expression}`);
    }
  };

  useEffect(() => {
    if (formula) {
      const result = evaluateFormula(formula);
      setCalculatedValue(result);

      if (onChange && result !== value) {
        onChange(name, result, "calculation", label);
      }
    } else {
      setCalculatedValue("");
      setValidationErrors([]);
      setError("");
    }
  }, [formula, formData, decimalPlaces, fieldValueMap, allFields]);

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
          backgroundColor:
            validationErrors.length > 0 || error ? "#ffe6e6" : "#f5f5f5",
          cursor: "not-allowed",
          borderColor:
            validationErrors.length > 0 || error ? "#ff6b6b" : "#ccc",
        }}
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <strong>Formula Validation Errors:</strong>
          {validationErrors.map((err, index) => (
            <div key={index}>• {err}</div>
          ))}
        </div>
      )}

      {/* Evaluation Error */}
      {error && !validationErrors.length && (
        <div className="calculation-error">
          <strong>Calculation Error:</strong> {error}
        </div>
      )}

      <div className="calculation-info">
        {formula ? `Formula: ${formula}` : "No formula set"}
        {fieldPosition && ` (${fieldPosition})`}
        {decimalPlaces !== undefined && ` | Decimals: ${decimalPlaces}`}
      </div>

      {/* Excel Functions Info */}
      {formula && (
        <div className="excel-functions-info">
          <strong>Supported Functions:</strong>
          <div>
            • <code>SUM(range)</code> - Sum of values (e.g.,{" "}
            <code>SUM(S1F2:S1F16)</code> or <code>SUM (S1F2:S1F16)</code>)
          </div>
          <div>
            • <code>AVERAGE(range)</code> - Average of values
          </div>
          <div>
            • <code>MIN(range)</code> - Minimum value
          </div>
          <div>
            • <code>MAX(range)</code> - Maximum value
          </div>
          <div>
            • <code>COUNT(range)</code> - Count of numeric values
          </div>
          <div style={{ marginTop: "4px", fontStyle: "italic" }}>
            Note: Supports spaces in formulas: <code>SUM (S1F6:S1F11)</code>
          </div>
          <div style={{ marginTop: "4px", fontStyle: "italic" }}>
            Also supports: <code>S1F2:S1F16</code> without function to sum the
            range
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculationField;
