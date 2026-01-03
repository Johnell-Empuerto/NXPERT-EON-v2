// FormField.js
import React, { useState } from "react";
import { getFieldTypeInfo } from "./excel-to-form-utils/fieldRegistry";
import Tooltip from "./tools/Tooltip";

const FormField = ({
  type,
  label,
  name,
  value,
  onChange,
  decimalPlaces,
  options,
  onEditField,
  multiline = false,
  autoShrinkFont = true,
  formula = "",
  fieldPosition = "",
  allFormData = {},
  fieldValueMap = {},
  allFields = [],
  min = null,
  max = null,
  bgColorInRange = "#ffffff",
  bgColorBelowMin = "#e3f2fd",
  bgColorAboveMax = "#ffebee",
  borderColorInRange = "#cccccc",
  borderColorBelowMin = "#2196f3",
  borderColorAboveMax = "#f44336",
  // ADD THESE NEW PROPS:
  bgColor = "#ffffff",
  textColor = "#000000",
  exactMatchText = "",
  exactMatchBgColor = "#d4edda",
  minLength = null,
  minLengthMode = "warning",
  minLengthWarningBg = "#ffebee",
  maxLength = null,
  maxLengthMode = "warning",
  maxLengthWarningBg = "#fff3cd",
  dateFormat = "yyyy-MMMM-dd",
  showTimeSelect = false,
  timeFormat = "HH:mm",
  minDate,
  maxDate,
  required = false,
  allowCamera = true,
  allowUpload = true,
  maxFileSize = 5,
}) => {
  const [height, setHeight] = useState(38);
  const minHeight = 28;
  const maxHeight = 100;
  const step = 10;

  const fieldInfo = getFieldTypeInfo(type);
  const FieldComponent = fieldInfo.component;

  // Generate tooltip content based on field type and properties
  // FormField.js - Update getTooltipContent function
  // FormField.js - Update getTooltipContent
  // FormField.js - Update getTooltipContent to include character count
  const getTooltipContent = () => {
    const tips = [];

    // Add field reference
    tips.push(`<strong>Reference:</strong> ${fieldPosition}`);

    if (type === "date") {
      if (dateFormat) {
        tips.push(`<strong>Format:</strong> ${dateFormat}`);
      }
      if (showTimeSelect && timeFormat) {
        tips.push(`<strong>Time Format:</strong> ${timeFormat}`);
      }
      if (minDate) {
        tips.push(`<strong>Earliest:</strong> ${minDate}`);
      }
      if (maxDate) {
        tips.push(`<strong>Latest:</strong> ${maxDate}`);
      }
    }

    // Add type-specific info
    if (type === "calculation" && formula) {
      tips.push(`<strong>Formula:</strong> ${formula}`);
    }

    if (min !== null || max !== null) {
      const range = [];
      if (min !== null) range.push(`Min: ${min}`);
      if (max !== null) range.push(`Max: ${max}`);
      tips.push(`<strong>Validation:</strong> ${range.join(", ")}`);
    }

    // Text field specific info
    if (type === "text") {
      const currentValue = value || "";
      const currentLength = currentValue.length;

      // Character count information
      if (minLength !== null || maxLength !== null) {
        tips.push("<hr style='margin: 8px 0; border-color: #ddd;'>");
        tips.push("<strong>Character Count:</strong>");
        tips.push(`Current: ${currentLength} characters`);

        if (minLength !== null) {
          tips.push(
            `Minimum: ${minLength} characters (${
              minLengthMode === "strict" ? "Strict" : "Warning"
            } mode)`
          );
        }

        if (maxLength !== null) {
          tips.push(
            `Maximum: ${maxLength} characters (${
              maxLengthMode === "strict" ? "Strict" : "Warning"
            } mode)`
          );
        }

        // Status indicator
        let status = "";
        let statusColor = "#28a745"; // Green

        if (maxLength !== null && currentLength > maxLength) {
          status =
            maxLengthMode === "strict"
              ? "❌ BLOCKED - Exceeds maximum"
              : "⚠️ WARNING - Exceeds maximum";
          statusColor = maxLengthMode === "strict" ? "#dc3545" : "#fd7e14";
        } else if (minLength !== null && currentLength < minLength) {
          status =
            minLengthMode === "strict"
              ? "❌ REQUIRED - Below minimum"
              : "⚠️ WARNING - Below minimum";
          statusColor = minLengthMode === "strict" ? "#dc3545" : "#fd7e14";
        } else if (maxLength !== null && currentLength >= maxLength * 0.9) {
          status = "⚠️ APPROACHING LIMIT";
          statusColor = "#ffc107";
        } else if (maxLength !== null && currentLength >= maxLength * 0.75) {
          status = "ℹ️ NEARING LIMIT";
          statusColor = "#17a2b8";
        } else if (minLength !== null && currentLength >= minLength) {
          status = "✓ MINIMUM MET";
          statusColor = "#28a745";
        } else {
          status = "✓ VALID";
          statusColor = "#28a745";
        }

        tips.push(`<strong style="color: ${statusColor};">${status}</strong>`);
      }

      // Exact match
      if (exactMatchText) {
        tips.push("<hr style='margin: 8px 0; border-color: #ddd;'>");
        tips.push(`<strong>Exact Match:</strong> "${exactMatchText}"`);
        if (currentValue.trim() === exactMatchText.trim()) {
          tips.push(`✅ Match found → Background: ${exactMatchBgColor}`);
        } else {
          tips.push(`❌ No match → Default background`);
        }
      }

      // Appearance
      if (textColor !== "#000000" || bgColor !== "#ffffff") {
        tips.push("<hr style='margin: 8px 0; border-color: #ddd;'>");
        tips.push("<strong>Appearance:</strong>");
        if (textColor !== "#000000") {
          tips.push(`Text Color: ${textColor}`);
        }
        if (bgColor !== "#ffffff") {
          tips.push(`Background: ${bgColor}`);
        }
      }
    }

    if (options && options.length > 0) {
      tips.push(`<strong>Options:</strong> ${options.join(", ")}`);
    }

    if (decimalPlaces !== undefined) {
      tips.push(`<strong>Decimals:</strong> ${decimalPlaces}`);
    }

    return tips.join("<br>");
  };

  const handleHeightChange = (delta) => {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));
    setHeight(newHeight);
  };

  const handleFieldChange = (fieldName, fieldValue) => {
    onChange(fieldName, fieldValue, type, label);
  };

  return (
    <div className="form-field-with-edit">
      <Tooltip
        content={getTooltipContent()}
        position="top"
        showOnFocus={true}
        showOnHover={false} // Disable hover for consistent behavior
      >
        <div className="input-container">
          <FieldComponent
            label={label}
            name={name}
            value={value}
            onChange={handleFieldChange}
            decimalPlaces={decimalPlaces}
            options={options}
            height={height}
            onHeightChange={handleHeightChange}
            multiline={multiline}
            autoShrinkFont={autoShrinkFont}
            formula={formula}
            fieldPosition={fieldPosition}
            formData={allFormData}
            fieldValueMap={fieldValueMap}
            allFields={allFields}
            min={min}
            max={max}
            bgColorInRange={bgColorInRange}
            bgColorBelowMin={bgColorBelowMin}
            bgColorAboveMax={bgColorAboveMax}
            borderColorInRange={borderColorInRange}
            borderColorBelowMin={borderColorBelowMin}
            borderColorAboveMax={borderColorAboveMax}
            // PASS THE NEW PROPS:
            bgColor={bgColor}
            textColor={textColor}
            exactMatchText={exactMatchText}
            exactMatchBgColor={exactMatchBgColor}
            minLength={minLength}
            minLengthMode={minLengthMode}
            minLengthWarningBg={minLengthWarningBg}
            maxLength={maxLength}
            maxLengthMode={maxLengthMode}
            maxLengthWarningBg={maxLengthWarningBg}
            dateFormat={dateFormat}
            showTimeSelect={showTimeSelect}
            timeFormat={timeFormat}
            minDate={minDate}
            maxDate={maxDate}
            required={required}
            allowCamera={allowCamera}
            allowUpload={allowUpload}
            maxFileSize={maxFileSize}
          />
          {fieldInfo.supportsHeight && (
            <div className="resize-handle">
              <span
                onClick={() => handleHeightChange(step)}
                title="Increase height"
              >
                ↑
              </span>
              <span
                onClick={() => handleHeightChange(-step)}
                title="Decrease height"
              >
                ↓
              </span>
            </div>
          )}
        </div>
      </Tooltip>

      {onEditField && (
        <button
          className="edit-field-btn"
          onClick={() =>
            onEditField({
              type,
              label,
              name,
              options,
              decimalPlaces,
              multiline,
              autoShrinkFont,
              formula,
              fieldPosition,
              min,
              max,
              bgColorInRange,
              bgColorBelowMin,
              bgColorAboveMax,
              borderColorInRange,
              borderColorBelowMin,
              borderColorAboveMax,
              // PASS THE NEW PROPS TO THE EDITOR:
              bgColor,
              textColor,
              exactMatchText,
              exactMatchBgColor,
              minLength,
              minLengthMode,
              minLengthWarningBg,
              maxLength,
              maxLengthMode,
              maxLengthWarningBg,
              required,
              allowCamera,
              allowUpload,
              maxFileSize,
            })
          }
          title="Edit field configuration"
        >
          ⚙️
        </button>
      )}
    </div>
  );
};

export default FormField;
