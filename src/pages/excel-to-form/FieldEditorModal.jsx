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

      // Initialize form data based on field type
      const initialData = {};
      const fieldInfo = getFieldTypeInfo(field.type);

      fieldInfo.editorFields.forEach((fieldConfig) => {
        if (fieldConfig.name === "options" && field.options) {
          initialData.options = field.options.join(",");
        } else if (fieldConfig.name === "decimalPlaces") {
          initialData.decimalPlaces =
            field.decimalPlaces || fieldConfig.defaultValue;
        }
      });

      setFormData(initialData);
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
      options: formData.options
        ? formData.options.split(",").map((opt) => opt.trim())
        : [],
      decimalPlaces:
        type === "number" ? parseInt(formData.decimalPlaces) : undefined,
    };
    onSave(updatedField);
    onClose();
  };

  const renderEditorField = (fieldConfig) => {
    switch (fieldConfig.type) {
      case "text":
        return (
          <input
            type="text"
            value={formData[fieldConfig.name] || ""}
            onChange={(e) => handleFormChange(fieldConfig.name, e.target.value)}
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
            value={formData[fieldConfig.name] || fieldConfig.defaultValue || ""}
            onChange={(e) => handleFormChange(fieldConfig.name, e.target.value)}
            className="form-input"
          />
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

        {fieldInfo.editorFields
          .filter((fieldConfig) => fieldConfig.name !== "label")
          .map((fieldConfig) => (
            <div key={fieldConfig.name} className="form-group">
              <label>{fieldConfig.label}:</label>
              {renderEditorField(fieldConfig)}
              {fieldConfig.name === "options" && (
                <small>Separate options with commas</small>
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
