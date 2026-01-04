// FieldEditorModal.js
import React, { useState, useEffect } from "react";
import {
  getFieldTypeInfo,
  getFieldTypeOptions,
} from "./excel-to-form-utils/fieldRegistry";

const FieldEditorModal = ({
  field,
  isOpen,
  onClose,
  onSave,
  allFields = [],
}) => {
  const [type, setType] = useState(field?.type || "text");
  const [label, setLabel] = useState(field?.label || "");
  const [formData, setFormData] = useState({});
  const [showFieldReferences, setShowFieldReferences] = useState(false);
  const [validationError, setValidationError] = useState(""); // NEW: validation error state

  // Range selection state
  const [selectedRangeStart, setSelectedRangeStart] = useState(null);
  const [selectedRangeEnd, setSelectedRangeEnd] = useState(null);
  const [showRangeSelector, setShowRangeSelector] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState("SUM"); // Default function

  // In FieldEditorModal.js - Update the useEffect
  // In FieldEditorModal.js - Update the useEffect initialization
  useEffect(() => {
    if (field) {
      console.log("Editing field:", field);
      setType(field.type || "text");
      setLabel(field.label || "");
      const initialData = {};
      const fieldInfo = getFieldTypeInfo(field.type);

      // Get all possible editor field names
      const editorFieldNames = fieldInfo.editorFields.map((f) => f.name);

      // Load ALL field properties, not just those in editorFields
      Object.keys(field).forEach((key) => {
        // Skip special keys
        if (
          [
            "type",
            "label",
            "instanceId",
            "fieldPosition",
            "originalLabel",
          ].includes(key)
        ) {
          return;
        }

        // Handle options specially
        if (key === "options" && Array.isArray(field[key])) {
          initialData[key] = field[key].join(",");
        }
        // Handle color fields
        else if (key.includes("Color") || key.includes("color")) {
          initialData[key] = field[key];
        }
        // Handle other fields
        else {
          initialData[key] = field[key];
        }
      });

      // Ensure all required editor fields have values
      fieldInfo.editorFields.forEach((fieldConfig) => {
        const fieldName = fieldConfig.name;
        if (
          initialData[fieldName] === undefined &&
          fieldConfig.defaultValue !== undefined
        ) {
          initialData[fieldName] = fieldConfig.defaultValue;
        }
      });

      console.log("Initial form data:", initialData);
      setFormData(initialData);
      setValidationError("");
    } else {
      setFormData({});
      setValidationError("");
    }
  }, [field]);

  const handleFormChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Validate min/max when either changes
    if (fieldName === "min" || fieldName === "max") {
      validateMinMax(fieldName, value);
    }
  };

  // NEW: Validate that min is not higher than max
  const validateMinMax = (changedField, value) => {
    const minValue =
      changedField === "min" ? parseFloat(value) : parseFloat(formData.min);
    const maxValue =
      changedField === "max" ? parseFloat(value) : parseFloat(formData.max);

    // Only validate if both values are numbers
    if (!isNaN(minValue) && !isNaN(maxValue)) {
      if (minValue > maxValue) {
        setValidationError(
          "Minimum value cannot be greater than maximum value"
        );
      } else {
        setValidationError("");
      }
    } else {
      setValidationError("");
    }
  };

  // Range selection handlers
  const handleRangeStartSelect = (field) => {
    setSelectedRangeStart(field);
    setSelectedRangeEnd(null); // Reset end when selecting new start
  };

  const handleRangeEndSelect = (field) => {
    if (selectedRangeStart) {
      setSelectedRangeEnd(field);
    }
  };

  const insertRangeFormula = () => {
    if (selectedRangeStart && selectedRangeEnd) {
      // Validate range order
      const startNum = parseInt(selectedRangeStart.position.match(/F(\d+)/)[1]);
      const endNum = parseInt(selectedRangeEnd.position.match(/F(\d+)/)[1]);

      let actualStart = selectedRangeStart;
      let actualEnd = selectedRangeEnd;

      // Ensure start comes before end
      if (startNum > endNum) {
        actualStart = selectedRangeEnd;
        actualEnd = selectedRangeStart;
      }

      const rangeFormula = `${selectedFunction}(${actualStart.position}:${actualEnd.position})`;
      const currentFormula = formData.formula || "";
      const newFormula = currentFormula
        ? `${currentFormula} + ${rangeFormula}`
        : rangeFormula;
      handleFormChange("formula", newFormula);

      // Reset selection
      setSelectedRangeStart(null);
      setSelectedRangeEnd(null);
      setShowRangeSelector(false);
    }
  };

  const insertIndividualField = (field) => {
    const currentFormula = formData.formula || "";
    const newFormula = currentFormula
      ? `${currentFormula} + ${field.position}`
      : field.position;
    handleFormChange("formula", newFormula);
  };

  // Updated handleSave function with validation
  // In FieldEditorModal.js - Update handleSave function
  // In FieldEditorModal.js - Update handleSave function
  const handleSave = () => {
    // Validate min/max before saving
    const minDate = formData.minDate;
    const maxDate = formData.maxDate;

    if (minDate && maxDate) {
      const minDateObj = new Date(minDate);
      const maxDateObj = new Date(maxDate);

      if (minDateObj > maxDateObj) {
        setValidationError("Minimum date cannot be after maximum date");
        return;
      }
    }

    const updatedField = {
      ...field,
      type,
      label,
      multiline: !!formData.multiline,
      autoShrinkFont: formData.autoShrinkFont !== false,

      // Time field specific settings
      timeFormat: formData.timeFormat || "HH:mm",
      allowSeconds: !!formData.allowSeconds,
      minTime: formData.minTime || "",
      maxTime: formData.maxTime || "",
      required: !!formData.required,

      // Date field specific settings
      dateFormat: formData.dateFormat || "yyyy-MMMM-dd",
      showTimeSelect: !!formData.showTimeSelect,
      DatetimeFormat: formData.DatetimeFormat || "HH:mm",
      minDate: formData.minDate || "",
      maxDate: formData.maxDate || "",

      // Image field specific settings
      required: !!formData.required,
      allowCamera: formData.allowCamera !== false,
      allowUpload: formData.allowUpload !== false,
      maxFileSize: formData.maxFileSize || 5,

      // FIX: Make sure decimalPlaces is ALWAYS included for number fields
      decimalPlaces:
        (type === "number" || type === "calculation") &&
        formData.decimalPlaces !== undefined
          ? parseInt(formData.decimalPlaces, 10)
          : type === "number" || type === "calculation"
          ? 0
          : undefined,

      // NEW TEXT FIELD SETTINGS
      bgColor: formData.bgColor || "#ffffff",
      textColor: formData.textColor || "#000000",
      exactMatchText: formData.exactMatchText || "",
      exactMatchBgColor: formData.exactMatchBgColor || "#d4edda",

      // Text field settings
      minLength:
        (type === "text" || type === "textarea") && formData.minLength
          ? parseInt(formData.minLength, 10)
          : null,
      maxLength:
        (type === "text" || type === "textarea") && formData.maxLength
          ? parseInt(formData.maxLength, 10)
          : null,

      // Number field settings
      min:
        (type === "number" || type === "calculation") && formData.min
          ? parseFloat(formData.min)
          : null,
      max:
        (type === "number" || type === "calculation") && formData.max
          ? parseFloat(formData.max)
          : null,

      minLengthMode: formData.minLengthMode || "warning",
      minLengthWarningBg: formData.minLengthWarningBg || "#ffebee",

      // Options for dropdown
      options: formData.options
        ? formData.options
            .split(",")
            .map((opt) => opt.trim())
            .filter(Boolean)
        : [],

      // FIX: Also include decimal_places for database compatibility
      decimal_places:
        (type === "number" || type === "calculation") &&
        formData.decimalPlaces !== undefined
          ? parseInt(formData.decimalPlaces, 10)
          : type === "number" || type === "calculation"
          ? 0
          : null,

      formula: type === "calculation" ? formData.formula || "" : undefined,
      bgColorInRange: formData.bgColorInRange || "#ffffff",
      bgColorBelowMin: formData.bgColorBelowMin || "#e3f2fd",
      bgColorAboveMax: formData.bgColorAboveMax || "#ffebee",
      borderColorInRange: formData.borderColorInRange || "#cccccc",
      borderColorBelowMin: formData.borderColorBelowMin || "#2196f3",
      borderColorAboveMax: formData.borderColorAboveMax || "#f44336",
      maxLengthMode: formData.maxLengthMode || "warning",
      maxLengthWarningBg: formData.maxLengthWarningBg || "#fff3cd",
    };

    console.log("Saving field with decimalPlaces:", updatedField.decimalPlaces); // DEBUG
    console.log("Field type:", type); // DEBUG

    onSave(updatedField);
    onClose();
  };

  // Helper function to parse aspect ratio
  const parseAspectRatio = (ratio) => {
    switch (ratio) {
      case "1:1":
        return { width: 1, height: 1 };
      case "4:3":
        return { width: 4, height: 3 };
      case "16:9":
        return { width: 16, height: 9 };
      case "3:2":
        return { width: 3, height: 2 };
      default:
        return null; // free
    }
  };
  // Updated renderEditorField function with real-time validation
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
          <div>
            <input
              type="number"
              min={fieldConfig.min}
              max={fieldConfig.max}
              value={value}
              onChange={(e) => handleFormChange(key, e.target.value)}
              className="form-input"
              style={{
                borderColor:
                  (key === "min" || key === "max") && validationError
                    ? "#f44336"
                    : undefined,
              }}
            />
            {/* Show validation error for min/max fields */}
            {(key === "min" || key === "max") && validationError && (
              <small
                style={{ color: "#f44336", display: "block", marginTop: "4px" }}
              >
                {validationError}
              </small>
            )}
          </div>
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
      case "color": // NEW: Color input type
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="color"
              value={value || "#ffffff"}
              onChange={(e) => handleFormChange(key, e.target.value)}
              style={{ width: "50px", height: "30px", cursor: "pointer" }}
              title="Click to choose color"
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <input
                type="text"
                value={value}
                onChange={(e) => handleFormChange(key, e.target.value)}
                className="form-input"
                placeholder={fieldConfig.placeholder}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  fontSize: "11px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>Preview:</span>
                <div
                  style={{
                    width: "20px",
                    height: "10px",
                    backgroundColor: value || fieldConfig.defaultValue,
                    border: "1px solid #ddd",
                    borderRadius: "2px",
                  }}
                />
                <span>{value || fieldConfig.defaultValue}</span>
              </div>
            </div>
          </div>
        );

      case "select": // NEW: Handle select type
        return (
          <select
            value={value}
            onChange={(e) => handleFormChange(key, e.target.value)}
            className="form-select"
            required={fieldConfig.required}
          >
            {fieldConfig.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const fieldInfo = getFieldTypeInfo(type);
  const fieldTypeOptions = getFieldTypeOptions();

  // Filter out the current field from the available references
  const availableReferences = allFields.filter(
    (f) => f.position !== field?.fieldPosition && f.type !== "calculation"
  );

  // Get current field position for display
  const currentFieldPosition =
    field?.fieldPosition ||
    (field?.instanceId &&
      allFields.find((f) => f.instanceId === field.instanceId)?.position) ||
    "S1F1";

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Edit Field Configuration</h3>

        {/* Field Reference Display */}
        <div className="form-group">
          <label>Field Reference:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="text"
              value={currentFieldPosition}
              className="form-input"
              readOnly
              style={{
                backgroundColor: "#f5f5f5",
                flex: 1,
                fontWeight: "bold",
                color: "#2c3e50",
              }}
            />
            <button
              type="button"
              onClick={() => setShowFieldReferences(!showFieldReferences)}
              className="btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              {showFieldReferences ? "Hide References" : "Show All References"}
            </button>
          </div>
          <small style={{ display: "block", marginTop: "4px" }}>
            Use this reference in calculation formulas (e.g.,{" "}
            {currentFieldPosition} + S1F2)
          </small>
        </div>

        {/* Available Field References Panel */}
        {showFieldReferences && availableReferences.length > 0 && (
          <div
            className="available-references-panel"
            style={{
              marginBottom: "15px",
              padding: "12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e9ecef",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <strong style={{ fontSize: "14px", color: "#495057" }}>
                Available Field References:
              </strong>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowRangeSelector(!showRangeSelector);
                    setSelectedRangeStart(null);
                    setSelectedRangeEnd(null);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                    backgroundColor: showRangeSelector ? "#0d6efd" : "#6c757d",
                    color: "white",
                    border: "none",
                  }}
                >
                  {showRangeSelector ? "Cancel Range" : "Select Range"}
                </button>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#6c757d",
                    backgroundColor: "#e9ecef",
                    padding: "2px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {availableReferences.length} fields
                </span>
              </div>
            </div>

            {showRangeSelector && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px",
                  backgroundColor: "#e7f3ff",
                  borderRadius: "4px",
                  border: "1px solid #cfe2ff",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#0d6efd",
                  }}
                >
                  📊 Select Range for Excel Function
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#495057" }}>
                    Function:
                  </span>
                  <select
                    value={selectedFunction}
                    onChange={(e) => setSelectedFunction(e.target.value)}
                    style={{
                      fontSize: "11px",
                      padding: "2px 4px",
                      borderRadius: "3px",
                      border: "1px solid #ced4da",
                    }}
                  >
                    <option value="SUM">SUM</option>
                    <option value="AVERAGE">AVERAGE</option>
                    <option value="MIN">MIN</option>
                    <option value="MAX">MAX</option>
                    <option value="COUNT">COUNT</option>
                  </select>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#495057",
                    marginBottom: "6px",
                  }}
                >
                  Click to select start and end fields:
                  {selectedRangeStart && (
                    <div style={{ marginTop: "4px" }}>
                      Start:{" "}
                      <code
                        style={{
                          backgroundColor: "#cfe2ff",
                          padding: "1px 4px",
                          borderRadius: "3px",
                        }}
                      >
                        {selectedRangeStart.position}
                      </code>{" "}
                      ({selectedRangeStart.label})
                    </div>
                  )}
                  {selectedRangeEnd && (
                    <div style={{ marginTop: "2px" }}>
                      End:{" "}
                      <code
                        style={{
                          backgroundColor: "#d1e7dd",
                          padding: "1px 4px",
                          borderRadius: "3px",
                        }}
                      >
                        {selectedRangeEnd.position}
                      </code>{" "}
                      ({selectedRangeEnd.label})
                    </div>
                  )}
                </div>
                {selectedRangeStart && selectedRangeEnd && (
                  <button
                    onClick={insertRangeFormula}
                    className="btn-primary"
                    style={{
                      padding: "4px 12px",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    Insert {selectedFunction}({selectedRangeStart.position}:
                    {selectedRangeEnd.position})
                  </button>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "8px",
              }}
            >
              {availableReferences.map((refField) => (
                <div
                  key={`${refField.position}-${refField.instanceId}`}
                  style={{
                    padding: "6px 8px",
                    backgroundColor:
                      showRangeSelector &&
                      selectedRangeStart?.position === refField.position
                        ? "#cfe2ff"
                        : showRangeSelector &&
                          selectedRangeEnd?.position === refField.position
                        ? "#d1e7dd"
                        : "white",
                    borderRadius: "4px",
                    border: "1px solid #dee2e6",
                    fontSize: "12px",
                    cursor: type === "calculation" ? "pointer" : "default",
                    transition: "all 0.2s",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onClick={() => {
                    if (type === "calculation") {
                      if (showRangeSelector) {
                        if (!selectedRangeStart) {
                          handleRangeStartSelect(refField);
                        } else if (!selectedRangeEnd) {
                          handleRangeEndSelect(refField);
                        }
                      } else {
                        insertIndividualField(refField);
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (type === "calculation") {
                      e.currentTarget.style.backgroundColor =
                        showRangeSelector &&
                        selectedRangeStart?.position === refField.position
                          ? "#b6d4fe"
                          : showRangeSelector &&
                            selectedRangeEnd?.position === refField.position
                          ? "#a3cfbb"
                          : "#e7f3ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (type === "calculation") {
                      e.currentTarget.style.backgroundColor =
                        showRangeSelector &&
                        selectedRangeStart?.position === refField.position
                          ? "#cfe2ff"
                          : showRangeSelector &&
                            selectedRangeEnd?.position === refField.position
                          ? "#d1e7dd"
                          : "white";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <code
                      style={{
                        fontWeight: "bold",
                        color: "#0d6efd",
                        fontSize: "11px",
                        backgroundColor: "#f0f7ff",
                        padding: "1px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      {refField.position}
                    </code>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#6c757d",
                        textTransform: "capitalize",
                      }}
                    >
                      {refField.type}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#495057",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {refField.label}
                  </div>

                  {/* Range selection indicators */}
                  {showRangeSelector && (
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#6c757d",
                        marginTop: "2px",
                      }}
                    >
                      {selectedRangeStart?.position === refField.position &&
                        "← Range Start"}
                      {selectedRangeEnd?.position === refField.position &&
                        "← Range End"}
                      {!selectedRangeStart && "Click to set as start"}
                      {selectedRangeStart &&
                        !selectedRangeEnd &&
                        selectedRangeStart.position !== refField.position &&
                        "Click to set as end"}
                    </div>
                  )}

                  {/* Individual field indicator */}
                  {type === "calculation" &&
                    !showRangeSelector &&
                    refField.position !== currentFieldPosition && (
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#6c757d",
                          marginTop: "2px",
                          fontStyle: "italic",
                        }}
                      >
                        Click to insert
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Field Configuration */}
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
              {fieldConfig.name === "formula" && (
                <div style={{ marginTop: "4px" }}>
                  <small style={{ display: "block", marginBottom: "4px" }}>
                    Use field references like S1F1, S1F2, etc.
                    <br />
                    Operators: + (add), - (subtract), * (multiply), / (divide)
                    <br />
                    <strong>Excel-style ranges:</strong> S1F4:S1F13 (for SUM,
                    AVERAGE, etc.)
                  </small>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#0d6efd",
                      padding: "6px",
                      backgroundColor: "#f0f7ff",
                      borderRadius: "4px",
                      border: "1px solid #cfe2ff",
                    }}
                  >
                    <strong>Quick Examples:</strong>
                    <div style={{ marginTop: "4px" }}>
                      • <code>S1F1 + S1F2</code> - Add two fields
                      <br />• <code>SUM(S1F4:S1F13)</code> - Sum of range F4 to
                      F13
                      <br />• <code>AVERAGE(S1F4:S1F13)</code> - Average of
                      range
                      <br />• <code>MIN(S1F4:S1F13)</code> - Minimum value in
                      range
                      <br />• <code>MAX(S1F4:S1F13)</code> - Maximum value in
                      range
                      <br />• <code>COUNT(S1F4:S1F13)</code> - Count numeric
                      values
                      <br />• <code>S1F3 * 0.1</code> - Multiply by 10%
                      <br />• <code>(S1F1 + S1F2) * S1F3</code> - Complex
                      calculation
                      <br />• <code>SUM(S1F4, S1F5, S1F6)</code> - Sum specific
                      fields
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        {/* Show validation error at the bottom */}
        {validationError && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "15px",
              border: "1px solid #ffcdd2",
            }}
          >
            ⚠️ {validationError}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={!!validationError} // Disable save button if there's validation error
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldEditorModal;
