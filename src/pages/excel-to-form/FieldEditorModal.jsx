// FieldEditorModal.js
import React, { useState, useEffect } from "react";
import {
  getFieldTypeInfo,
  getFieldTypeOptions,
} from "./excel-to-form-utils/fieldRegistry";

const FieldEditorModal = ({ field, isOpen, onClose, onSave }) => {
  const [type, setType] = useState(field?.type || "text");
  const [label, setLabel] = useState(field?.label || "");
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (field) {
      setType(field.type || "text");
      setLabel(field.label || "");

      const initialData = {};
      const fieldInfo = getFieldTypeInfo(field.type);

      fieldInfo.editorFields.forEach((fieldConfig) => {
        const fieldName = fieldConfig.name;

        if (fieldName === "options" && field.options) {
          initialData.options = field.options.join(",");
        } else if (
          fieldName === "decimalPlaces" &&
          field.decimalPlaces !== undefined
        ) {
          initialData.decimalPlaces = field.decimalPlaces;
        }
        // NEW: Handle checkbox fields
        else if (fieldConfig.type === "checkbox") {
          initialData[fieldName] =
            field[fieldName] ?? fieldConfig.defaultValue ?? false;
        }
        // Handle text/number defaults if needed
        else if (field[fieldName] !== undefined) {
          initialData[fieldName] = field[fieldName];
        }
      });

      setFormData(initialData);
    } else {
      // Reset when no field (new field?)
      setFormData({});
    }
  }, [field]);

  const handleFormChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSave = () => {
    const updatedField = {
      ...field,
      type,
      label,
      // Save checkbox values properly
      multiline: !!formData.multiline,
      autoShrinkFont: formData.autoShrinkFont !== false, // default true
      options: formData.options
        ? formData.options
            .split(",")
            .map((opt) => opt.trim())
            .filter(Boolean)
        : [],
      decimalPlaces:
        type === "number"
          ? parseInt(formData.decimalPlaces, 10) || 2
          : undefined,
    };

    onSave(updatedField);
    onClose();
  };

  const renderEditorField = (fieldConfig) => {
    const key = fieldConfig.name;
    const value =
      formData[key] ??
      fieldConfig.defaultValue ??
      (fieldConfig.type === "checkbox" ? false : "");

    switch (fieldConfig.type) {
      case "text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFormChange(key, e.target.value)}
            className="form-input"
            placeholder={fieldConfig.placeholder}
            required={fieldConfig.required}
          />
        );
      case "number":
        return (
          <input
            type="number"
            min={fieldConfig.min}
            max={fieldConfig.max}
            value={value}
            onChange={(e) => handleFormChange(key, e.target.value)}
            className="form-input"
          />
        );
      case "checkbox":
        return (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFormChange(key, e.target.checked)}
            />
            <span>{fieldConfig.label}</span>
          </label>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const fieldInfo = getFieldTypeInfo(type);
  const fieldTypeOptions = getFieldTypeOptions();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Field Configuration</h3>

        <div className="form-group">
          <label>Field Type:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="form-select"
          >
            {fieldTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Field Label:</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="form-input"
            placeholder="Enter field label"
            required
          />
        </div>

        {/* FIXED: Only one map, and exclude label field */}
        {fieldInfo.editorFields
          .filter((fc) => fc.name !== "label")
          .map((fieldConfig) => (
            <div key={fieldConfig.name} className="form-group">
              <label>{fieldConfig.label}:</label>
              {renderEditorField(fieldConfig)}
              {fieldConfig.name === "options" && (
                <small style={{ display: "block", marginTop: "4px" }}>
                  Separate options with commas
                </small>
              )}
            </div>
          ))}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldEditorModal;
