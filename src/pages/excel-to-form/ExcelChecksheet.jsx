import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  const [fieldPositions, setFieldPositions] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});
  const [formName, setFormName] = useState("");
  const [editingField, setEditingField] = useState(null);
  const [fieldInstances, setFieldInstances] = useState([]);

  // Pan & Zoom state
  const [scale, setScale] = useState(1);
  const translate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isOverForm = useRef(false);

  const fileInputRef = useRef(null);
  const scalerRef = useRef(null);
  const containerRef = useRef(null);

  // Store scale in ref to access latest value in event handlers
  const scaleRef = useRef(scale);

  // Update ref when scale changes
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      Object.values(images).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Update transform function that uses current scale
  const updateTransform = useCallback(() => {
    const scaler = scalerRef.current;
    if (!scaler) return;

    scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // === PAN & ZOOM LOGIC ===
  useEffect(() => {
    const scaler = scalerRef.current;
    const container = containerRef.current;
    if (!scaler || !htmlContent || !container) return;

    // Initial fit-to-width
    const tableWidth = scaler.scrollWidth;
    const availableWidth = container.clientWidth - 40;
    let initialScale = 1;
    if (tableWidth > availableWidth) {
      initialScale = Math.max(availableWidth / tableWidth, 0.35);
    }
    setScale(initialScale);
    scaleRef.current = initialScale;
    translate.current = { x: 0, y: 0 };
    updateTransform();

    // Mouse enter/leave to track if we're over the form
    const handleMouseEnter = () => {
      isOverForm.current = true;
      scaler.style.cursor = "grab";
    };

    const handleMouseLeave = () => {
      isOverForm.current = false;
      isDragging.current = false;
      scaler.style.cursor = "default";
    };

    // Wheel zoom (toward mouse pointer)
    const handleWheel = (e) => {
      if (!isOverForm.current) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const currentScale = scaleRef.current;
      const newScale = Math.max(0.35, Math.min(3, currentScale * delta));

      const rect = scaler.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const dx = (mouseX - translate.current.x) * (1 - newScale / currentScale);
      const dy = (mouseY - translate.current.y) * (1 - newScale / currentScale);

      translate.current.x += dx;
      translate.current.y += dy;

      // Update both state and ref
      setScale(newScale);
      scaleRef.current = newScale;

      // Apply transform immediately
      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${newScale})`;
    };

    // Mouse drag - ignore clicks on form controls
    const handleMouseDown = (e) => {
      if (!isOverForm.current) return;

      const target = e.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.closest(".edit-field-btn") ||
        target.closest(".resize-handle")
      ) {
        return; // Do not start dragging
      }

      if (e.button === 0) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        scaler.style.cursor = "grabbing";
        e.preventDefault(); // Prevent text selection
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current || !isOverForm.current) return;
      translate.current.x += e.clientX - dragStart.current.x;
      translate.current.y += e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        scaler.style.cursor = isOverForm.current ? "grab" : "default";
      }
    };

    // Touch support
    let touchStartPos = { x: 0, y: 0 };
    let isTouchingForm = false;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isTouchingForm = true;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e) => {
      if (!isTouchingForm || e.touches.length !== 1) return;
      e.preventDefault();
      translate.current.x += e.touches[0].clientX - touchStartPos.x;
      translate.current.y += e.touches[0].clientY - touchStartPos.y;
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;
    };

    const handleTouchEnd = () => {
      isTouchingForm = false;
    };

    // Add event listeners
    scaler.addEventListener("mouseenter", handleMouseEnter);
    scaler.addEventListener("mouseleave", handleMouseLeave);
    scaler.addEventListener("wheel", handleWheel, { passive: false });
    scaler.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    scaler.addEventListener("touchstart", handleTouchStart);
    scaler.addEventListener("touchmove", handleTouchMove, { passive: false });
    scaler.addEventListener("touchend", handleTouchEnd);

    return () => {
      scaler.removeEventListener("mouseenter", handleMouseEnter);
      scaler.removeEventListener("mouseleave", handleMouseLeave);
      scaler.removeEventListener("wheel", handleWheel);
      scaler.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      scaler.removeEventListener("touchstart", handleTouchStart);
      scaler.removeEventListener("touchmove", handleTouchMove);
      scaler.removeEventListener("touchend", handleTouchEnd);
    };
  }, [htmlContent, updateTransform]);

  // === FIELD CONFIG EXTRACTION ===
  // === FIELD CONFIG EXTRACTION ===
  const extractFieldConfigs = (html) => {
    // Improved regex to capture field patterns more precisely
    const regex = /\{\{(\w+):([^:}]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
    const matches = [...html.matchAll(regex)];
    const configs = {};
    const instances = [];

    matches.forEach((match, index) => {
      const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
      const type = rawType.toLowerCase();

      // Clean up the label - remove any HTML tags or extra text
      let label = rawLabel.trim();

      // Remove any HTML tags that might be attached
      label = label.replace(/<\/?[^>]+(>|$)/g, "").trim();

      // Remove any trailing text after HTML tags
      const bracketIndex = label.indexOf("<");
      if (bracketIndex > -1) {
        label = label.substring(0, bracketIndex).trim();
      }

      // Also check for common HTML entities or fragments
      label = label.replace(/&[a-z]+;/g, "").trim();

      const decimalPlaces = rawDecimals ? parseInt(rawDecimals, 10) : undefined;
      const options = rawOptions
        ? rawOptions.split(",").map((o) => o.trim())
        : null;

      // Create unique instance ID with position
      const position = `S1F${index + 1}`;
      const instanceId = `field_${label.replace(/\s+/g, "_")}_${index}`;

      // Store config for each instance (not shared)
      configs[instanceId] = {
        originalType: type,
        type,
        label,
        options,
        decimalPlaces,
        originalHtml: fullMatch,
        instanceId,
        position,
      };

      instances.push({
        instanceId,
        type,
        label,
        position,
        matchIndex: index,
      });
    });

    return { configs, instances };
  };

  // Function to assign position references to fields
  const assignFieldPositions = (instances) => {
    const positions = {};

    instances.forEach((inst) => {
      positions[inst.instanceId] = inst.position;
    });

    return positions;
  };

  useEffect(() => {
    if (htmlContent) {
      const { configs, instances } = extractFieldConfigs(htmlContent);
      setFieldConfigs(configs);
      setFieldInstances(instances);

      // Use the assignFieldPositions function
      const positions = assignFieldPositions(instances);
      setFieldPositions(positions);
    }
  }, [htmlContent]);

  const getAllFieldsInfo = useMemo(() => {
    return fieldInstances.map((inst) => ({
      position: inst.position,
      type: fieldConfigs[inst.instanceId]?.type || inst.type,
      label: inst.label,
      instanceId: inst.instanceId,
    }));
  }, [fieldInstances, fieldConfigs]);

  // Create position-to-value mapping (INSTANCE-BASED)
  const createFieldValueMap = useMemo(() => {
    const map = {};

    fieldInstances.forEach((inst) => {
      const position = inst.position;
      if (!position) return;

      // Get value for this specific instance
      const fieldData = formData[inst.instanceId];
      if (fieldData) {
        const value = fieldData.value;
        const numValue = parseFloat(value);
        map[position] = isNaN(numValue) ? 0 : numValue;
      } else {
        map[position] = 0;
      }
    });

    return map;
  }, [formData, fieldInstances]);

  // === HTML & IMAGE PROCESSING ===
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
    setFieldPositions({});

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

  const handleFieldChange = (name, value, type, label) => {
    setFormData((prev) => ({
      ...prev,
      [name]: { value, type, label },
    }));
  };

  const handleSaveFieldConfig = (updatedField) => {
    const { instanceId } = updatedField;

    setFieldConfigs((prev) => ({
      ...prev,
      [instanceId]: {
        ...prev[instanceId],
        type: updatedField.type,
        label: updatedField.label,
        options: updatedField.options,
        decimalPlaces: updatedField.decimalPlaces,
        multiline: updatedField.multiline,
        autoShrinkFont: updatedField.autoShrinkFont,
        formula: updatedField.formula,
      },
    }));
  };

  // Enhanced parseOptions with field positions and formData
  const parseOptions = {
    replace: (node) => {
      if (node.type !== "text") return;

      const text = node.data;
      const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;

      // Skip if the text contains HTML tags (it's likely part of the table structure)
      if (text.includes("<") || text.includes(">") || text.includes("</")) {
        return;
      }

      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) return;

      const parts = [];
      let lastIndex = 0;

      matches.forEach((match) => {
        const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
        const type = rawType.toLowerCase();
        const label = rawLabel.trim();
        const decimalPlaces = rawDecimals
          ? parseInt(rawDecimals, 10)
          : undefined;
        const options = rawOptions
          ? rawOptions.split(",").map((o) => o.trim())
          : null;

        // We need to find the correct instance - look in fieldInstances
        // Find the instance that matches this label and hasn't been used yet
        const possibleInstances = fieldInstances.filter(
          (inst) => inst.label === label
        );

        // Find an instance that hasn't been rendered yet
        let instance = possibleInstances.find((inst) => {
          // Check if this instance hasn't been rendered yet by looking at already rendered parts
          const alreadyRendered = parts.some(
            (part) => React.isValidElement(part) && part.key === inst.instanceId
          );
          return !alreadyRendered;
        });

        // If no unused instance found, use the first one
        if (!instance && possibleInstances.length > 0) {
          instance = possibleInstances[0];
        }

        const instanceId =
          instance?.instanceId || `field_${label.replace(/\s+/g, "_")}_0`;
        const position =
          instance?.position || fieldPositions[instanceId] || "S1F1";
        const fieldName = instanceId;

        const index = match.index;
        if (index > lastIndex) {
          parts.push(text.substring(lastIndex, index));
        }

        const config = fieldConfigs[instanceId] || {};

        const fieldInfo = getFieldTypeInfo(config.type || type);

        parts.push(
          <FormField
            key={instanceId}
            type={config.type || type}
            label={config.label || label}
            name={fieldName}
            value={formData[fieldName]?.value ?? fieldInfo.defaultValue}
            onChange={handleFieldChange}
            decimalPlaces={config.decimalPlaces ?? decimalPlaces}
            options={config.options ?? options}
            multiline={config.multiline ?? false}
            autoShrinkFont={config.autoShrinkFont ?? true}
            formula={config.formula}
            fieldPosition={position}
            allFormData={formData}
            fieldValueMap={createFieldValueMap}
            allFields={getAllFieldsInfo} // NEW: Pass all fields info
            onEditField={() => {
              console.log("Opening editor for field:", {
                name: fieldName,
                fieldPosition: position,
                instanceId,
                label: config.label || label,
              });
              setEditingField({
                name: fieldName,
                type: config.type || type,
                label: config.label || label,
                options: config.options ?? options,
                decimalPlaces: config.decimalPlaces ?? decimalPlaces,
                multiline: config.multiline ?? false,
                autoShrinkFont: config.autoShrinkFont ?? true,
                formula: config.formula,
                fieldPosition: position,
                instanceId,
              });
            }}
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
    return parse(htmlContent, parseOptions);
  }, [
    htmlContent,
    formData,
    fieldConfigs,
    fieldPositions,
    createFieldValueMap,
  ]);

  const handlePublish = async () => {
    if (!formName.trim()) return alert("Please enter a form name");
    if (!htmlContent) return alert("No content to publish");

    const editedConfigs = Object.entries(fieldConfigs).reduce(
      (acc, [key, config]) => {
        if (
          config.type !== config.originalType ||
          config.label !==
            config.originalHtml.match(/\{\{(\w+):([^:]+)/)?.[2]?.trim() ||
          config.multiline !== false ||
          config.autoShrinkFont !== true ||
          config.formula
        ) {
          acc[key] = {
            type: config.type,
            label: config.label,
            options: config.options,
            decimalPlaces: config.decimalPlaces,
            multiline: config.multiline,
            autoShrinkFont: config.autoShrinkFont,
            formula: config.formula,
            fieldPosition: fieldPositions[key],
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
          field_positions: fieldPositions,
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
      <FieldEditorModal
        field={editingField}
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        onSave={handleSaveFieldConfig}
        allFields={getAllFieldsInfo}
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
          <div className="excel-preview-container" ref={containerRef}>
            <div className="excel-preview-scaler" ref={scalerRef}>
              <div className="excel-scope">{parsedContent}</div>
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
