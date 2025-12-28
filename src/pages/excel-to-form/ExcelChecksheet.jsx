import React, { useState, useEffect, useRef, useMemo } from "react";
import parse from "html-react-parser";
import axios from "axios";
import JSZip from "jszip";
import "./ExcelChecksheet.css";

// --- FIELD EDITOR MODAL COMPONENT ---
const FieldEditorModal = ({ field, isOpen, onClose, onSave }) => {
  const [type, setType] = useState(field?.type || "text");
  const [label, setLabel] = useState(field?.label || "");
  const [options, setOptions] = useState(field?.options?.join(",") || "");
  const [decimalPlaces, setDecimalPlaces] = useState(field?.decimalPlaces || 2);

  useEffect(() => {
    if (field) {
      setType(field.type || "text");
      setLabel(field.label || "");
      setOptions(field.options?.join(",") || "");
      setDecimalPlaces(field.decimalPlaces || 2);
    }
  }, [field]);

  const handleSave = () => {
    const updatedField = {
      ...field,
      type,
      label,
      options: options ? options.split(",").map((opt) => opt.trim()) : [],
      decimalPlaces: type === "number" ? parseInt(decimalPlaces) : undefined,
    };
    onSave(updatedField);
    onClose();
  };

  if (!isOpen) return null;

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
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="checkbox">Checkbox</option>
            <option value="dropdown">Dropdown</option>
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
          />
        </div>

        {type === "dropdown" && (
          <div className="form-group">
            <label>Options (comma-separated):</label>
            <input
              type="text"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              className="form-input"
              placeholder="Option1, Option2, Option3"
            />
            <small>Separate options with commas</small>
          </div>
        )}

        {type === "number" && (
          <div className="form-group">
            <label>Decimal Places:</label>
            <input
              type="number"
              min="0"
              max="10"
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(e.target.value)}
              className="form-input"
            />
          </div>
        )}

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

// --- Enhanced FormField Component with Edit Button ---
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

  const handleHeightChange = (delta) => {
    setHeight((prev) => {
      const newHeight = prev + delta;
      return Math.max(minHeight, Math.min(maxHeight, newHeight));
    });
  };

  const [displayValue, setDisplayValue] = useState("");

  // Handle number field initialization and updates
  useEffect(() => {
    if (type === "number") {
      if (value !== undefined && value !== null && value !== "") {
        const num = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(num)) {
          const formatted =
            decimalPlaces !== undefined
              ? num.toFixed(decimalPlaces)
              : num.toString();
          setDisplayValue(formatted);
        }
      } else {
        setDisplayValue("");
      }
    } else {
      setDisplayValue(value || "");
    }
  }, [value, decimalPlaces, type]);

  const handleNumberChange = (e) => {
    const val = e.target.value;
    if (val === "" || val === "." || /^\d*\.?\d*$/.test(val)) {
      setDisplayValue(val);
      const num = val === "" || val === "." ? null : parseFloat(val);
      onChange(name, isNaN(num) ? null : num, type, label);
    }
  };

  const handleNumberBlur = () => {
    if (displayValue === "" || displayValue === ".") {
      setDisplayValue("");
      onChange(name, null, type, label);
      return;
    }

    const num = parseFloat(displayValue);
    if (!isNaN(num)) {
      const formatted =
        decimalPlaces !== undefined
          ? num.toFixed(decimalPlaces)
          : num.toString();

      setDisplayValue(formatted);
      onChange(name, num, type, label);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setDisplayValue(val);
    onChange(name, val, type, label);
  };

  const renderField = () => {
    switch (type) {
      case "text":
        return (
          <input
            type="text"
            placeholder={label}
            className="form-input"
            style={{ height: `${height}px` }}
            value={displayValue}
            onChange={handleTextChange}
          />
        );

      case "dropdown":
        return (
          <select
            className="form-select"
            style={{ height: `${height}px` }}
            value={displayValue}
            onChange={(e) => onChange(name, e.target.value, type, label)}
          >
            <option value="" disabled>
              {label}
            </option>
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "date":
        return (
          <input
            type="date"
            className="form-input"
            style={{ height: `${height}px` }}
            value={displayValue}
            onChange={(e) => onChange(name, e.target.value, type, label)}
          />
        );

      case "checkbox":
        return (
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) =>
                onChange(name, e.target.checked, "checkbox", label)
              }
              className="form-checkbox"
            />
          </div>
        );

      case "number":
        return (
          <input
            type="text"
            inputMode="decimal"
            placeholder={label}
            className="form-input"
            style={{ height: `${height}px` }}
            value={displayValue}
            onChange={handleNumberChange}
            onBlur={handleNumberBlur}
          />
        );

      default:
        return <span className="unknown-type">Unknown: {type}</span>;
    }
  };

  return (
    <div className="form-field-with-edit">
      <div className="input-container">
        {renderField()}
        {type !== "checkbox" && (
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

      {/* EDIT BUTTON */}
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

// --- Helper to process HTML ---
const processHtml = (html, injectExcelCSS) => {
  html = html.replace(/\r/g, "");

  const doc = new DOMParser().parseFromString(html, "text/html");

  const styleElements = doc.querySelectorAll("head style");
  styleElements.forEach((style) => {
    injectExcelCSS(style.innerHTML);
  });

  return doc.body ? doc.body.innerHTML : html;
};

// --- Main Component ---
const ExcelChecksheet = ({ initialHtml = "", onSubmit }) => {
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const [formData, setFormData] = useState({});
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});
  const [formName, setFormName] = useState("");
  const [editingField, setEditingField] = useState(null);

  const fileInputRef = useRef(null);
  const fieldCounter = useRef(0);

  // Update local state if prop changes
  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  // Cleanup image URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(images).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [images]);

  // Extract field configurations from HTML
  const extractFieldConfigs = (html) => {
    const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
    const matches = [...html.matchAll(regex)];
    const configs = {};

    matches.forEach((match) => {
      const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
      const fieldType = rawType.toLowerCase();
      const fieldLabel = rawLabel.trim();
      const decimalPlaces = rawDecimals ? parseInt(rawDecimals, 10) : undefined;
      const options = rawOptions
        ? rawOptions.split(",").map((o) => o.trim())
        : null;

      const baseFieldKey = `field_${fieldLabel.replace(/\s+/g, "_")}`;

      configs[baseFieldKey] = {
        originalType: fieldType,
        type: fieldType,
        label: fieldLabel,
        options,
        decimalPlaces,
        originalHtml: fullMatch,
      };
    });

    return configs;
  };

  // Update fieldConfigs when HTML changes
  useEffect(() => {
    if (htmlContent) {
      const configs = extractFieldConfigs(htmlContent);
      setFieldConfigs(configs);
    }
  }, [htmlContent]);

  // Inject CSS into <head>
  const injectExcelCSS = (cssText) => {
    const old = document.getElementById("excel-css");
    if (old) old.remove();

    const style = document.createElement("style");
    style.id = "excel-css";
    style.innerHTML = cssText;
    document.head.appendChild(style);
  };

  // Extract images from ZIP
  const extractImages = async (zip) => {
    const imageMap = {};

    for (const filename in zip.files) {
      if (filename.match(/\.(png|jpg|jpeg|gif|bmp)$/i)) {
        try {
          const blob = await zip.files[filename].async("blob");
          const imageName = filename.split("/").pop();
          imageMap[imageName] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn(`Failed to extract image: ${filename}`, err);
        }
      }
    }

    return imageMap;
  };

  // Rewrite image URLs in HTML
  const rewriteImageUrls = (html, imageMap) => {
    let output = html;

    Object.entries(imageMap).forEach(([name, url]) => {
      const regex1 = new RegExp(`src=["']([^"']*${name})["']`, "g");
      const regex2 = new RegExp(`src=["']${name}["']`, "g");

      output = output.replace(regex1, `src="${url}"`);
      output = output.replace(regex2, `src="${url}"`);
    });

    return output;
  };

  // Handle individual HTML/HTM file upload
  const handleHtmlUpload = async (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      let content = event.target.result;

      if (content.includes("<frameset") || content.includes("<frame src")) {
        setError(
          "⚠️ You uploaded the Main Workbook file. Please open the file folder, find the specific sheet file (e.g., 'sheet001.htm'), and upload that instead."
        );
        setIsUploading(false);
        return;
      }

      content = processHtml(content, injectExcelCSS);
      setHtmlContent(content);
      setIsUploading(false);
    };

    reader.onerror = () => {
      setError("Error reading HTML file.");
      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  // Handle ZIP Upload
  const handleZipUpload = async (file) => {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const files = Object.values(zipContent.files);

      const htmlFile = files.find(
        (f) => f.name.match(/(sheet\d+\.html?|sheet001\.html?)/i) && !f.dir
      );

      const cssFile = files.find(
        (f) => f.name.toLowerCase().endsWith("stylesheet.css") && !f.dir
      );

      if (!htmlFile) {
        throw new Error(
          "No sheet HTML file found (looking for sheet001.html or similar)"
        );
      }

      let htmlContent = await htmlFile.async("text");
      htmlContent = processHtml(htmlContent, injectExcelCSS);

      if (cssFile) {
        const cssContent = await cssFile.async("text");
        injectExcelCSS(cssContent);
      } else {
        console.warn("No stylesheet.css found in ZIP");
      }

      const imageMap = await extractImages(zipContent);
      setImages(imageMap);

      const processedHtml = rewriteImageUrls(htmlContent, imageMap);
      setHtmlContent(processedHtml);
      return true;
    } catch (err) {
      console.error("Error processing ZIP:", err);
      throw err;
    }
  };

  // Main file upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setHtmlContent("");
    setImages({});
    setFormData({});
    setFieldConfigs({});

    const fileExtension = file.name.split(".").pop().toLowerCase();

    try {
      if (fileExtension === "zip") {
        await handleZipUpload(file);
      } else if (fileExtension === "html" || fileExtension === "htm") {
        await handleHtmlUpload(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload .zip, .html, or .htm files."
        );
      }
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle changes in the injected fields
  const handleFieldChange = (name, value, type, label) => {
    setFormData((prev) => ({
      ...prev,
      [name]: { value, type, label },
    }));
  };

  // Handle field configuration edits
  const handleEditField = (fieldInfo) => {
    setEditingField(fieldInfo);
  };

  const handleSaveFieldConfig = (updatedField) => {
    const baseName = updatedField.name.split("_").slice(0, -1).join("_");

    setFieldConfigs((prev) => ({
      ...prev,
      [baseName]: {
        ...prev[baseName],
        type: updatedField.type,
        label: updatedField.label,
        options: updatedField.options,
        decimalPlaces: updatedField.decimalPlaces,
      },
    }));
  };

  // Parser options
  const parseOptions = {
    replace: (node) => {
      if (node.type === "text") {
        const text = node.data;
        const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
        const matches = [...text.matchAll(regex)];

        if (matches.length > 0) {
          const parts = [];
          let lastIndex = 0;

          matches.forEach((match) => {
            const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] =
              match;
            const fieldType = rawType.toLowerCase();
            const fieldLabel = rawLabel.trim();
            const decimalPlaces = rawDecimals
              ? parseInt(rawDecimals, 10)
              : undefined;
            const options = rawOptions
              ? rawOptions.split(",").map((o) => o.trim())
              : null;

            const index = match.index;

            if (index > lastIndex) {
              parts.push(text.substring(lastIndex, index));
            }

            const uniqueId = ++fieldCounter.current;
            const fieldName = `field_${fieldLabel.replace(
              /\s+/g,
              "_"
            )}_${uniqueId}`;
            const baseFieldKey = `field_${fieldLabel.replace(/\s+/g, "_")}`;

            const config = fieldConfigs[baseFieldKey] || {};

            parts.push(
              <FormField
                key={fieldName}
                type={config.type || fieldType}
                label={config.label || fieldLabel}
                name={fieldName}
                value={formData[fieldName]?.value}
                onChange={handleFieldChange}
                decimalPlaces={config.decimalPlaces || decimalPlaces}
                options={config.options || options}
                onEditField={() =>
                  handleEditField({
                    type: config.type || fieldType,
                    label: config.label || fieldLabel,
                    name: fieldName,
                    options: config.options || options,
                    decimalPlaces: config.decimalPlaces || decimalPlaces,
                  })
                }
              />
            );

            lastIndex = index + fullMatch.length;
          });

          if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
          }

          return <>{parts}</>;
        }
      }
      return undefined;
    },
  };

  const parsedContent = useMemo(() => {
    fieldCounter.current = 0;
    return parse(htmlContent, parseOptions);
  }, [htmlContent, formData, fieldConfigs]);

  // Combined handlePublish that saves both form data and configurations
  const handlePublish = async () => {
    if (!formName.trim()) {
      alert("Please enter a form name");
      return;
    }

    if (!htmlContent) {
      alert("No form content to publish");
      return;
    }

    // Prepare compact data to send
    const fieldConfigurations = Object.keys(fieldConfigs).reduce((acc, key) => {
      const config = fieldConfigs[key];
      // Only include edited configurations (different from original)
      if (
        config.type !== config.originalType ||
        config.label !==
          config.originalHtml?.match(/\{\{(\w+):([^:]+)/)?.[2]?.trim()
      ) {
        acc[key] = {
          type: config.type,
          label: config.label,
          options: config.options,
          decimalPlaces: config.decimalPlaces,
        };
      }
      return acc;
    }, {});

    // Prepare form values (only the actual values)
    const formValues = Object.keys(formData).reduce((acc, key) => {
      const field = formData[key];
      // Only include fields with values
      if (
        field.value !== undefined &&
        field.value !== null &&
        field.value !== ""
      ) {
        acc[key] = field.value;
      }
      return acc;
    }, {});

    try {
      const response = await axios.post(
        "http://localhost:5000/api/checksheet/templates",
        {
          name: formName,
          html_content: htmlContent, // This might be large, consider storing separately
          field_configurations: fieldConfigurations, // Send only edited configs
          form_values: formValues, // Send only actual values
          last_updated: new Date().toISOString(),
          metadata: {
            total_fields: Object.keys(formData).length,
            edited_fields: Object.keys(fieldConfigurations).length,
          },
        }
      );

      if (response.data.success) {
        alert(
          `Form "${formName}" published successfully! ID: ${response.data.template_id}`
        );
        setFormName("");
        // Optional: reset or keep the form
      }
    } catch (error) {
      console.error("Publish error:", error);

      if (error.response?.status === 413) {
        alert(
          "Form is too large to publish. Please try with a smaller Excel file or contact support."
        );
      } else {
        alert(
          "Failed to publish form: " +
            (error.response?.data?.message || error.message)
        );
      }
    }
  };

  return (
    <div className="container">
      {/* Field Editor Modal */}
      <FieldEditorModal
        field={editingField}
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        onSave={handleSaveFieldConfig}
      />

      <div className="excel-header">
        <h3>Excel Checksheet Builder</h3>
        <div className="excel-actions">
          <input
            type="file"
            accept=".zip,.html,.htm"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="upload-btn"
          >
            Upload File
          </button>

          {/* Form Name Input + Publish Button */}
          {htmlContent && (
            <>
              <input
                type="text"
                placeholder="Enter Form Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-name-input"
              />
              <button
                onClick={handlePublish}
                disabled={!formName.trim()}
                className="primary-btn"
                title="Publish form with current data and field configurations"
              >
                Publish Form
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isUploading && <div className="loading">Processing file...</div>}

      <div className="preview-area">
        {htmlContent ? (
          <div className="excel-scope">
            {parsedContent}
            <div className="edit-note">
              <small>
                💡 Click the gear icon (⚙️) next to any field to edit its type,
                label, or options.
              </small>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <div className="placeholder-icon">📄</div>
            <h3>Upload Excel File</h3>
            <p>Supported file types:</p>
            <ul className="placeholder-list">
              <li>
                <strong>.zip</strong> - Complete Excel export folder
                <div className="placeholder-note">
                  Contains: sheet001.html, stylesheet.css, images, etc.
                </div>
              </li>
              <li>
                <strong>.html / .htm</strong> - Individual sheet file
                <div className="placeholder-note">
                  Single HTML file (e.g., sheet001.html)
                </div>
              </li>
            </ul>

            <div className="instructions">
              <h4>How to export from Excel:</h4>
              <ol className="instructions-list">
                <li>Open your Excel file</li>
                <li>
                  Go to <strong>File → Save As</strong>
                </li>
                <li>
                  Choose <strong>Web Page (*.htm, *.html)</strong>
                </li>
                <li>
                  <strong>Option A:</strong> Save as "Single File Web Page" →
                  upload the .html file
                  <br />
                  <strong>Option B:</strong> Save as "Web Page" → creates folder
                  → compress to ZIP → upload .zip
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelChecksheet;
