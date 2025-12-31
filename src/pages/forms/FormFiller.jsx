// src/pages/forms/FormFiller.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import axios from "axios";
import "./FormFiller.css";

const FormFiller = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);

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
  // In FormFiller.jsx, update the useEffect cleanup
  useEffect(() => {
    return () => {
      // Clean up injected CSS
      const fillerStyles = document.querySelectorAll(
        'style[id^="excel-css"], style[id^="excel-css-"]'
      );
      fillerStyles.forEach((style) => style.remove());
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

  // In FormFiller.js, update the loadTemplate function:

  // src/pages/forms/FormFiller.jsx - Update the loadTemplate function

  const loadTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
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
          style.id = "excel-css-filler"; // Unique ID for filler
          style.innerHTML = templateData.css_content;
          document.head.appendChild(style);
          console.log(
            "CSS injected successfully:",
            templateData.css_content.length,
            "chars"
          );
        } else {
          console.warn("No CSS content found in template");

          // Try alternative: check if CSS is in field_configurations
          if (templateData.field_configurations?.css_content) {
            const style = document.createElement("style");
            style.id = "excel-css-filler";
            style.innerHTML = templateData.field_configurations.css_content;
            document.head.appendChild(style);
            console.log("CSS injected from field_configurations");
          }
        }

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
        navigate("/forms");
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

  // Pan & Zoom logic
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
      if (node.type !== "text") return;
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
      exact_match_text,
      exact_match_bg_color,
      min_length,
      min_length_warning_bg = "#ffebee",
      max_length,
      max_length_warning_bg = "#fff3cd",
      multiline,
      bg_color_in_range = "#ffffff",
      border_color_in_range = "#cccccc",
    } = fieldConfig;

    const getBackgroundColor = (val) => {
      if (exact_match_text && val.trim() === exact_match_text.trim())
        return exact_match_bg_color || "#d4edda";
      if (min_length && val.length < min_length) return min_length_warning_bg;
      if (max_length && val.length > max_length) return max_length_warning_bg;

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
        border: `1px solid ${border_color_in_range}`,
        width: "100%",
        padding: "8px 10px",
        boxSizing: "border-box",
      },
    };

    switch (type) {
      case "text":
        return multiline ? (
          <textarea {...commonProps} rows={3} />
        ) : (
          <input type="text" {...commonProps} />
        );
      case "number":
        return (
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
      case "date":
        return <input type="date" {...commonProps} />;
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
          />
        );
      case "dropdown":
        const optionList = options
          ? Array.isArray(options)
            ? options
            : JSON.parse(options)
          : [];
        return (
          <select {...commonProps}>
            <option value="">Select {label}</option>
            {optionList.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      default:
        return <input type="text" {...commonProps} />;
    }
  };

  const parsedContent = useMemo(() => {
    if (!template) return null;
    let htmlContent = "";
    if (template.sheets && template.sheets.length > 0) {
      htmlContent =
        template.sheets[currentSheetIndex]?.html ||
        template.sheets[0]?.html ||
        "";
    } else {
      htmlContent = template.html_content || "";
    }
    return parse(htmlContent, parseOptions);
  }, [template, formData, currentSheetIndex]);

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
        <button onClick={() => navigate("/forms")} className="back-btn">
          Back to Forms
        </button>
      </div>
    );

  if (!template)
    return (
      <div className="error-container">
        <h2>Form Not Found</h2>
        <button onClick={() => navigate("/forms")} className="back-btn">
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
          <button onClick={() => navigate("/forms")} className="back-btn">
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
