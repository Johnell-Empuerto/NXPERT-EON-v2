import React, { useState, useEffect, useRef, useMemo } from "react";
import parse from "html-react-parser";
import axios from "axios";
import JSZip from "jszip";
import FormField from "./FormField";
import FieldEditorModal from "./FieldEditorModal";
import { getFieldTypeInfo } from "./excel-to-form-utils/fieldRegistry";
import "./ExcelChecksheet.css";

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

  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      Object.values(images).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Extract field placeholders: {{type:label[:decimals][:option1,option2]}}
  const extractFieldConfigs = (html) => {
    const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
    const matches = [...html.matchAll(regex)];
    const configs = {};

    matches.forEach((match) => {
      const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
      const type = rawType.toLowerCase();
      const label = rawLabel.trim();
      const decimalPlaces = rawDecimals ? parseInt(rawDecimals, 10) : undefined;
      const options = rawOptions
        ? rawOptions.split(",").map((o) => o.trim())
        : null;

      const baseKey = `field_${label.replace(/\s+/g, "_")}`;

      configs[baseKey] = {
        originalType: type,
        type,
        label,
        options,
        decimalPlaces,
        originalHtml: fullMatch,
      };
    });

    return configs;
  };

  useEffect(() => {
    if (htmlContent) {
      const configs = extractFieldConfigs(htmlContent);
      setFieldConfigs(configs);
    }
  }, [htmlContent]);

  // Inject CSS from Excel export
  const injectExcelCSS = (cssText) => {
    const existing = document.getElementById("excel-css");
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = "excel-css";
    style.innerHTML = cssText;
    document.head.appendChild(style);
  };

  const processHtml = (html) => {
    html = html.replace(/\r/g, "");
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll("head style").forEach((style) => {
      injectExcelCSS(style.innerHTML);
    });

    return doc.body ? doc.body.innerHTML : html;
  };

  // Image handling (ZIP)
  const extractImages = async (zip) => {
    const imageMap = {};
    for (const filename in zip.files) {
      if (filename.match(/\.(png|jpg|jpeg|gif|bmp|svg)$/i)) {
        try {
          const blob = await zip.files[filename].async("blob");
          const name = filename.split("/").pop();
          imageMap[name] = URL.createObjectURL(blob);
        } catch (err) {
          console.warn(`Failed to load image: ${filename}`, err);
        }
      }
    }
    return imageMap;
  };

  const rewriteImageUrls = (html, imageMap) => {
    let result = html;
    Object.entries(imageMap).forEach(([name, url]) => {
      result = result.replace(
        new RegExp(`src=["']([^"']*${name})["']`, "g"),
        `src="${url}"`
      );
      result = result.replace(
        new RegExp(`src=["']${name}["']`, "g"),
        `src="${url}"`
      );
    });
    return result;
  };

  // File Upload Handlers
  const handleHtmlUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = e.target.result;
      if (content.includes("<frameset") || content.includes("<frame src")) {
        setError(
          "⚠️ Please upload the individual sheet file (e.g., sheet001.htm), not the main workbook."
        );
        setIsUploading(false);
        return;
      }
      content = processHtml(content);
      setHtmlContent(content);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleZipUpload = async (file) => {
    const zip = await JSZip.loadAsync(file);
    const files = Object.values(zip.files);

    const htmlFile = files.find(
      (f) => f.name.match(/sheet\d*\.htm(l)?$/i) && !f.dir
    );
    const cssFile = files.find((f) =>
      f.name.toLowerCase().includes("stylesheet.css")
    );

    if (!htmlFile) throw new Error("No sheet HTML found in ZIP.");

    let html = await htmlFile.async("text");
    html = processHtml(html);

    if (cssFile) {
      const css = await cssFile.async("text");
      injectExcelCSS(css);
    }

    const imageMap = await extractImages(zip);
    setImages(imageMap);

    const processedHtml = rewriteImageUrls(html, imageMap);
    setHtmlContent(processedHtml);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setHtmlContent("");
    setImages({});
    setFormData({});
    setFieldConfigs({});

    const ext = file.name.split(".").pop().toLowerCase();

    try {
      if (ext === "zip") {
        await handleZipUpload(file);
      } else if (["html", "htm"].includes(ext)) {
        await handleHtmlUpload(file);
      } else {
        throw new Error("Please upload .zip, .html, or .htm files.");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Field value change
  const handleFieldChange = (name, value, type, label) => {
    setFormData((prev) => ({
      ...prev,
      [name]: { value, type, label },
    }));
  };

  // Save edited field config
  const handleSaveFieldConfig = (updatedField) => {
    const baseKey = updatedField.name.split("_").slice(0, -1).join("_"); // remove unique ID

    setFieldConfigs((prev) => ({
      ...prev,
      [baseKey]: {
        ...prev[baseKey],
        type: updatedField.type,
        label: updatedField.label,
        options: updatedField.options,
        decimalPlaces: updatedField.decimalPlaces,
      },
    }));
  };

  // HTML Parser with dynamic field injection
  const parseOptions = {
    replace: (node) => {
      if (node.type !== "text") return;

      const text = node.data;
      const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) return;

      const parts = [];
      let lastIndex = 0;

      matches.forEach((match) => {
        const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
        const type = rawType.toLowerCase();
        const label = rawLabel.trim();
        const decimalPlaces = rawDecimals ? parseInt(rawDecimals) : undefined;
        const options = rawOptions
          ? rawOptions.split(",").map((o) => o.trim())
          : null;

        const index = match.index;
        if (index > lastIndex) {
          parts.push(text.substring(lastIndex, index));
        }

        const uniqueId = ++fieldCounter.current;
        const fieldName = `field_${label.replace(/\s+/g, "_")}_${uniqueId}`;
        const baseKey = `field_${label.replace(/\s+/g, "_")}`;
        const config = fieldConfigs[baseKey] || {};

        const fieldInfo = getFieldTypeInfo(config.type || type);

        parts.push(
          <FormField
            key={fieldName}
            type={config.type || type}
            label={config.label || label}
            name={fieldName}
            value={formData[fieldName]?.value ?? fieldInfo.defaultValue}
            onChange={handleFieldChange}
            decimalPlaces={config.decimalPlaces ?? decimalPlaces}
            options={config.options ?? options}
            onEditField={() =>
              setEditingField({
                name: fieldName,
                type: config.type || type,
                label: config.label || label,
                options: config.options ?? options,
                decimalPlaces: config.decimalPlaces ?? decimalPlaces,
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
    },
  };

  const parsedContent = useMemo(() => {
    fieldCounter.current = 0;
    return parse(htmlContent, parseOptions);
  }, [htmlContent, formData, fieldConfigs]);

  // Publish form
  const handlePublish = async () => {
    if (!formName.trim()) return alert("Please enter a form name");
    if (!htmlContent) return alert("No content to publish");

    const editedConfigs = Object.entries(fieldConfigs).reduce(
      (acc, [key, config]) => {
        if (
          config.type !== config.originalType ||
          config.label !==
            config.originalHtml.match(/\{\{(\w+):([^:]+)/)?.[2]?.trim()
        ) {
          acc[key] = {
            type: config.type,
            label: config.label,
            options: config.options,
            decimalPlaces: config.decimalPlaces,
          };
        }
        return acc;
      },
      {}
    );

    const filledValues = Object.entries(formData).reduce(
      (acc, [key, { value }]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    try {
      const response = await axios.post(
        "http://localhost:5000/api/checksheet/templates",
        {
          name: formName,
          html_content: htmlContent,
          field_configurations: editedConfigs,
          form_values: filledValues,
          last_updated: new Date().toISOString(),
        }
      );

      if (response.data.success) {
        alert(`Form "${formName}" published! ID: ${response.data.template_id}`);
        setFormName("");
      }
    } catch (err) {
      console.error(err);
      alert("Publish failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="container">
      {/* Modal */}
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
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
          >
            Upload File
          </button>

          {htmlContent && (
            <>
              <input
                type="text"
                placeholder="Form Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-name-input"
              />
              <button
                onClick={handlePublish}
                disabled={!formName.trim()}
                className="primary-btn"
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
              <small>💡 Click ⚙️ to edit field type, label, or options.</small>
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
