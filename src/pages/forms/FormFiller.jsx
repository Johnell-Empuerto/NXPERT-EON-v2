// src/pages/forms/FormFiller.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import axios from "axios";
import "./FormFiller.css";
import Tooltip from "../excel-to-form/tools/Tooltip";

const FormFiller = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [images, setImages] = useState({}); // Add images state
  const [processedHtml, setProcessedHtml] = useState(""); // Add processed HTML state

  // Pan & Zoom state
  const translate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isOverForm = useRef(false);
  const scaleRef = useRef(1);
  const scalerRef = useRef(null);
  const containerRef = useRef(null);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // === NEW: Inject Excel CSS into the page ===
  const injectExcelCSS = (cssText) => {
    // Remove any previously injected CSS for this filler
    const existing = document.getElementById("excel-css-filler");
    if (existing) existing.remove();

    if (!cssText.trim()) return; // Don't inject empty

    const style = document.createElement("style");
    style.id = "excel-css-filler";
    style.innerHTML = cssText;
    document.head.appendChild(style);
  };

  // Cleanup injected CSS when component unmounts
  useEffect(() => {
    return () => {
      // Clean up injected CSS
      const fillerStyles = document.querySelectorAll(
        'style[id^="excel-css"], style[id^="excel-css-"]'
      );
      fillerStyles.forEach((style) => style.remove());
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Close all tooltips when clicking outside
      const tooltips = document.querySelectorAll(".input-tooltip.visible");
      if (tooltips.length > 0) {
        const isClickInsideTooltip = Array.from(tooltips).some((tooltip) =>
          tooltip.contains(e.target)
        );
        const isClickOnInput =
          e.target.tagName === "INPUT" ||
          e.target.tagName === "SELECT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "BUTTON";

        if (!isClickInsideTooltip && !isClickOnInput) {
          tooltips.forEach((tooltip) => {
            tooltip.classList.remove("visible");
          });
        }
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // Check authentication and load template
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to access forms");
        navigate("/login");
        return;
      }
      await loadTemplate();
    };
    checkAuthAndLoad();
  }, [templateId, navigate]);

  // Function to load template images
  const loadTemplateImages = async () => {
    try {
      // First, check if there are images in the template
      const imagesResponse = await axios.get(
        `http://localhost:5000/api/checksheet/templates/${templateId}/images`,
        { headers: getAuthHeaders() }
      );

      if (
        imagesResponse.data.success &&
        imagesResponse.data.images.length > 0
      ) {
        const imageMap = {};

        // Process each image
        for (const image of imagesResponse.data.images) {
          // Load the image from the API endpoint
          const imageUrl = `/api/checksheet/templates/${templateId}/images/${image.id}`;

          // Create a full URL
          const fullImageUrl = `http://localhost:5000${imageUrl}`;

          imageMap[image.original_path] = {
            id: image.id,
            url: fullImageUrl,
            filename: image.filename,
            originalPath: image.original_path,
          };
        }

        setImages(imageMap);
        return imageMap;
      }
    } catch (err) {
      console.warn("Failed to load template images:", err);
      // Don't fail the whole template load if images fail
    }
    return {};
  };

  // Function to process HTML and replace image placeholders
  const processHtmlWithImages = (html, imageMap) => {
    if (!html || !imageMap || Object.keys(imageMap).length === 0) {
      return html;
    }

    let processedHtml = html;

    // Replace image URLs with actual image endpoints
    Object.entries(imageMap).forEach(([originalPath, imageData]) => {
      // Create a regex to match the image placeholder
      // Handle both blob URLs and placeholder formats
      const placeholderPatterns = [
        `src=["'][^"']*${originalPath.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}["']`,
        `src=["']blob:[^"']*${imageData.filename.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}["']`,
        `src=["'][^"']*${imageData.filename.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}["']`,
      ];

      placeholderPatterns.forEach((pattern) => {
        const regex = new RegExp(pattern, "gi");
        processedHtml = processedHtml.replace(regex, `src="${imageData.url}"`);
      });
    });

    return processedHtml;
  };

  const loadTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load template data
      const response = await axios.get(
        `http://localhost:5000/api/checksheet/templates/${templateId}`,
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const templateData = response.data.template;
        setTemplate(templateData);

        // === IMPORTANT: Remove all existing injected styles ===
        const existingStyles = document.querySelectorAll(
          'style[id^="excel-css"], style[id^="excel-css-"]'
        );
        existingStyles.forEach((style) => style.remove());

        // === Inject the saved CSS ===
        if (templateData.css_content && templateData.css_content.trim()) {
          const style = document.createElement("style");
          style.id = "excel-css-filler";
          style.innerHTML = templateData.css_content;
          document.head.appendChild(style);
        } else {
          console.warn("No CSS content found in template");
        }

        // === LOAD AND PROCESS IMAGES ===
        const imageMap = await loadTemplateImages();

        // Get HTML content
        let htmlContent = "";
        if (templateData.sheets && templateData.sheets.length > 0) {
          htmlContent =
            templateData.sheets[0]?.html || templateData.html_content || "";
        } else {
          htmlContent = templateData.html_content || "";
        }

        // Process HTML to replace image placeholders
        const processedHtmlContent = processHtmlWithImages(
          htmlContent,
          imageMap
        );
        setProcessedHtml(processedHtmlContent);

        // Initialize form data
        const initialData = {};
        if (templateData.fields) {
          templateData.fields.forEach((field) => {
            initialData[field.instance_id || field.field_name] = "";
          });
        }
        setFormData(initialData);
      } else {
        setError("Failed to load template");
      }
    } catch (err) {
      console.error("Load template error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load form");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!template) return;

    const requiredFields = template.fields?.filter((f) => f.required) || [];
    const missing = requiredFields.filter(
      (f) => !formData[f.instance_id || f.field_name]?.trim()
    );

    if (missing.length > 0) {
      alert(
        `Please fill in the following required fields:\n${missing
          .map((f) => f.label)
          .join("\n")}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("userId") || 1;
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to submit forms");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/checksheet/submissions",
        {
          template_id: templateId,
          user_id: userId,
          data: formData,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        alert("Form submitted successfully!");
        navigate("/dashboard/forms");
      }
    } catch (err) {
      console.error("Submit error:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
      } else {
        alert(
          "Submission failed: " + (err.response?.data?.message || err.message)
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Pan & Zoom logic (keep as is)
  useEffect(() => {
    const scaler = scalerRef.current;
    const container = containerRef.current;
    if (!scaler || !container || !template) return;

    const handleMouseEnter = () => {
      isOverForm.current = true;
      scaler.style.cursor = "grab";
    };
    const handleMouseLeave = () => {
      isOverForm.current = false;
      isDragging.current = false;
      scaler.style.cursor = "default";
    };
    const handleWheel = (e) => {
      if (!isOverForm.current) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.35, Math.min(3, scaleRef.current * delta));

      const rect = scaler.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const dx =
        (mouseX - translate.current.x) * (1 - newScale / scaleRef.current);
      const dy =
        (mouseY - translate.current.y) * (1 - newScale / scaleRef.current);

      translate.current.x += dx;
      translate.current.y += dy;
      scaleRef.current = newScale;

      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${newScale})`;
    };
    const handleMouseDown = (e) => {
      if (!isOverForm.current) return;
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName))
        return;
      if (e.button === 0) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        scaler.style.cursor = "grabbing";
        e.preventDefault();
      }
    };
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      translate.current.x += e.clientX - dragStart.current.x;
      translate.current.y += e.clientY - dragStart.current.y;
      dragStart.current = { x: e.clientX, y: e.clientY };
      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      scaler.style.cursor = isOverForm.current ? "grab" : "default";
    };

    scaler.addEventListener("mouseenter", handleMouseEnter);
    scaler.addEventListener("mouseleave", handleMouseLeave);
    scaler.addEventListener("wheel", handleWheel, { passive: false });
    scaler.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      scaler.removeEventListener("mouseenter", handleMouseEnter);
      scaler.removeEventListener("mouseleave", handleMouseLeave);
      scaler.removeEventListener("wheel", handleWheel);
      scaler.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [template]);

  // Parse HTML with field replacement
  const parseOptions = {
    replace: (node) => {
      // Handle form fields
      if (node.type === "text") {
        const text = node.data;
        const regex = /\{\{(\w+):([^:}]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
        if (!text.match(regex)) return;

        const matches = [...text.matchAll(regex)];
        if (matches.length === 0) return;

        const parts = [];
        let lastIndex = 0;

        matches.forEach((match) => {
          const [fullMatch, rawType, rawLabel] = match;
          let cleanLabel = rawLabel
            .trim()
            .replace(/<\/?[^>]+(>|$)/g, "")
            .replace(/&[a-z]+;/g, "")
            .trim();

          const fieldConfig = template?.fields?.find(
            (f) =>
              f.label === cleanLabel ||
              f.field_name === cleanLabel.replace(/\s+/g, "_").toLowerCase()
          );

          if (!fieldConfig) return;

          const fieldName = fieldConfig.instance_id || fieldConfig.field_name;
          const value = formData[fieldName] || "";

          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }

          parts.push(
            <div key={fieldName} className="form-field-wrapper">
              {renderField(fieldConfig, fieldName, value)}
            </div>
          );

          lastIndex = match.index + fullMatch.length;
        });

        if (lastIndex < text.length) parts.push(text.substring(lastIndex));
        return <>{parts}</>;
      }

      // Handle image tags - replace src with actual image URLs
      if (node.type === "tag" && node.name === "img") {
        const src = node.attribs?.src || "";

        // If it's already a proper URL, keep it
        if (
          src.startsWith("http") ||
          src.startsWith("/api/checksheet/templates/")
        ) {
          return React.createElement("img", {
            ...node.attribs,
            key: `img-${src}`,
          });
        }

        // Try to find matching image in our image map
        for (const [originalPath, imageData] of Object.entries(images)) {
          if (src.includes(imageData.filename) || src.includes(originalPath)) {
            return React.createElement("img", {
              ...node.attribs,
              key: `img-${imageData.id}`,
              src: imageData.url,
              alt: imageData.filename,
            });
          }
        }

        // Return original if no match found
        return React.createElement("img", {
          ...node.attribs,
          key: `img-${src}`,
        });
      }

      return undefined;
    },
  };

  const renderField = (fieldConfig, fieldName, value) => {
    const {
      field_type: type,
      label,
      decimal_places: decimalPlaces,
      options,
      min_value: min,
      max_value: max,
      bg_color = "#ffffff",
      text_color = "#000000",
      exact_match_text: exactMatchText,
      exact_match_bg_color: exactMatchBgColor = "#d4edda",
      min_length: minLength,
      min_length_warning_bg: minLengthWarningBg = "#ffebee",
      max_length: maxLength,
      max_length_warning_bg: maxLengthWarningBg = "#fff3cd",
      multiline,
      bg_color_in_range: bgColorInRange = "#ffffff",
      border_color_in_range: borderColorInRange = "#cccccc",
      position: fieldPosition = "",
    } = fieldConfig;

    const getBackgroundColor = (val) => {
      if (exactMatchText && val.trim() === exactMatchText.trim())
        return exactMatchBgColor || "#d4edda";
      if (minLength && val.length < minLength) return minLengthWarningBg;
      if (maxLength && val.length > maxLength) return maxLengthWarningBg;

      if (type === "number" && val) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (min !== null && num < min) return "#e3f2fd";
          if (max !== null && num > max) return "#ffebee";
        }
      }
      return bg_color;
    };

    const commonProps = {
      value: value || "",
      onChange: (e) => handleFieldChange(fieldName, e.target.value),
      placeholder: label,
      style: {
        backgroundColor: getBackgroundColor(value),
        color: text_color,
        border: `1px solid ${borderColorInRange}`,
        width: "100%",
        padding: "8px 10px",
        boxSizing: "border-box",
      },
    };

    // Create enhanced tooltip content based on field configuration
    const createTooltipContent = () => {
      const parts = [];

      // Add field reference
      if (fieldPosition) {
        parts.push(`<strong>Reference:</strong> ${fieldPosition}`);
      }

      // Add field type
      parts.push(`<strong>Type:</strong> ${type}`);

      // Add validation info
      if (min !== null || max !== null) {
        const range = [];
        if (min !== null) range.push(`Min: ${min}`);
        if (max !== null) range.push(`Max: ${max}`);
        parts.push(`<strong>Validation:</strong> ${range.join(", ")}`);
      }

      // Add length validation
      if (minLength !== null) {
        parts.push(`<strong>Min Length:</strong> ${minLength} characters`);
      }

      if (maxLength !== null) {
        parts.push(`<strong>Max Length:</strong> ${maxLength} characters`);
      }

      // Add exact match
      if (exactMatchText) {
        parts.push(`<strong>Exact Match:</strong> "${exactMatchText}"`);
      }

      // Add decimal places
      if (decimalPlaces !== null && type === "number") {
        parts.push(`<strong>Decimal Places:</strong> ${decimalPlaces}`);
      }

      // Add options for dropdown
      if (options && type === "dropdown") {
        let optionList = [];
        try {
          optionList =
            typeof options === "string" ? JSON.parse(options) : options;
        } catch (e) {
          optionList = Array.isArray(options) ? options : [];
        }
        if (optionList.length > 0) {
          parts.push(`<strong>Options:</strong> ${optionList.join(", ")}`);
        }
      }

      // Current value info
      const currentValue = value || "";
      if (type === "text" || type === "textarea") {
        parts.push(`<hr style='margin: 8px 0; border-color: #ddd;'>`);
        parts.push(`<strong>Character Count:</strong> ${currentValue.length}`);
      }

      return parts.length > 0
        ? parts.join("<br>")
        : "No additional information";
    };

    const tooltipContent = createTooltipContent();

    // Wrap the field with Tooltip
    const renderFieldWithTooltip = (fieldElement) => {
      return (
        <Tooltip
          content={tooltipContent}
          position="top"
          showOnFocus={true}
          showOnHover={true}
        >
          {fieldElement}
        </Tooltip>
      );
    };

    switch (type) {
      case "text":
        const textField = multiline ? (
          <textarea {...commonProps} rows={3} />
        ) : (
          <input type="text" {...commonProps} />
        );
        return renderFieldWithTooltip(textField);

      case "number":
        const numberField = (
          <input
            type="number"
            {...commonProps}
            step={
              decimalPlaces > 0 ? `0.${"1".padStart(decimalPlaces, "0")}` : "1"
            }
            min={min}
            max={max}
          />
        );
        return renderFieldWithTooltip(numberField);

      case "date":
        const dateField = <input type="date" {...commonProps} />;
        return renderFieldWithTooltip(dateField);

      case "checkbox":
        const checkboxField = (
          <div style={{ display: "inline-block" }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              style={{ margin: 0, width: "auto" }}
            />
          </div>
        );
        return renderFieldWithTooltip(checkboxField);

      case "dropdown":
        const optionList = options
          ? (() => {
              try {
                return typeof options === "string"
                  ? JSON.parse(options)
                  : options;
              } catch (e) {
                return Array.isArray(options) ? options : [];
              }
            })()
          : [];
        const selectField = (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {optionList.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
        return renderFieldWithTooltip(selectField);

      default:
        const defaultField = <input type="text" {...commonProps} />;
        return renderFieldWithTooltip(defaultField);
    }
  };

  const parsedContent = useMemo(() => {
    if (!template) return null;

    let htmlContent = processedHtml;
    if (!htmlContent) {
      // Fallback to template HTML if processed HTML is not available
      if (template.sheets && template.sheets.length > 0) {
        htmlContent =
          template.sheets[currentSheetIndex]?.html ||
          template.sheets[0]?.html ||
          template.html_content ||
          "";
      } else {
        htmlContent = template.html_content || "";
      }
    }

    return parse(htmlContent, parseOptions);
  }, [template, formData, currentSheetIndex, processedHtml, images]);

  if (loading)
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading form...</p>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button
          onClick={() => navigate("/dashboard/forms")}
          className="back-btn"
        >
          Back to Forms
        </button>
      </div>
    );

  if (!template)
    return (
      <div className="error-container">
        <h2>Form Not Found</h2>
        <button
          onClick={() => navigate("/dashboard/forms")}
          className="back-btn"
        >
          Back to Forms
        </button>
      </div>
    );

  return (
    <div className="form-filler-container">
      <div className="form-filler-header">
        <div>
          <h1>{template.name}</h1>
          <p className="form-description">Fill out the form below</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate("/dashboard/forms")}
            className="back-btn"
          >
            ← Back to Forms
          </button>
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      </div>

      {template.sheets && template.sheets.length > 1 && (
        <div className="sheet-tabs">
          {template.sheets.map((sheet, index) => (
            <button
              key={sheet.id || index}
              className={`sheet-tab ${
                currentSheetIndex === index ? "active" : ""
              }`}
              onClick={() => setCurrentSheetIndex(index)}
            >
              {sheet.name || `Sheet ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="form-content-area">
        <div className="form-preview-container" ref={containerRef}>
          <div className="form-preview-scaler" ref={scalerRef}>
            <div className="form-scope">{parsedContent}</div>
          </div>
        </div>
      </div>

      <div className="form-summary">
        <div className="summary-info">
          <span className="info-item">
            <strong>Fields:</strong> {template.fields?.length || 0}
          </span>
          <span className="info-item">
            <strong>Sheets:</strong> {template.sheets?.length || 1}
          </span>
          {images && Object.keys(images).length > 0 && (
            <span className="info-item">
              <strong>Images:</strong> {Object.keys(images).length}
            </span>
          )}
        </div>
        <div className="summary-actions">
          <button
            onClick={() => {
              const reset = {};
              template.fields?.forEach((f) => {
                reset[f.instance_id || f.field_name] = "";
              });
              setFormData(reset);
            }}
            className="reset-btn"
          >
            Reset Form
          </button>
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormFiller;
