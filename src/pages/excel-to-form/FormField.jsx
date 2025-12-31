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
}) => {
  const [height, setHeight] = useState(38);
  const minHeight = 28;
  const maxHeight = 100;
  const step = 10;

  const fieldInfo = getFieldTypeInfo(type);
  const FieldComponent = fieldInfo.component;

  // Generate tooltip content based on field type and properties
  const getTooltipContent = () => {
    const tips = [];

    // Add field reference
    tips.push(`<strong>Reference:</strong> ${fieldPosition}`);

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
