// FormField.js
import React, { useState } from "react";
import { getFieldTypeInfo } from "./excel-to-form-utils/fieldRegistry";

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

  const handleHeightChange = (delta) => {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));
    setHeight(newHeight);
  };

  const handleFieldChange = (fieldName, fieldValue) => {
    onChange(fieldName, fieldValue, type, label);
  };

  return (
    <div className="form-field-with-edit">
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
          // PASS THE NEW PROPS:
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
              // PASS CHECKBOX VALUES TO EDITOR:
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
