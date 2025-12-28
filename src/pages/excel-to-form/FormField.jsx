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
            onEditField({ type, label, name, options, decimalPlaces })
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
