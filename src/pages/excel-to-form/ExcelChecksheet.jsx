import React, { useState, useEffect, useRef, useMemo } from "react";
import parse from "html-react-parser";
import axios from "axios";
import JSZip from "jszip";

// --- Component: The Field we Inject ---
const FormField = ({ type, label, name, value, onChange, decimalPlaces }) => {
  const [height, setHeight] = useState(38); // default height in px
  const minHeight = 28;
  const maxHeight = 100;
  const step = 10;

  const inputStyle = {
    width: "100%",
    minWidth: "50px",
    border: "1px solid rgb(204, 204, 204)",
    padding: "8px 30px 8px 4px", // extra right padding for icons
    fontSize: "inherit",
    fontFamily: "inherit",
    background: "rgb(255, 255, 255)",
    height: `${height}px`,
    boxSizing: "border-box",
    position: "relative",
  };

  const containerStyle = {
    display: "inline-block",
    width: "100%",
    position: "relative",
  };

  const resizeHandleStyle = {
    position: "absolute",
    right: "4px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "10px",
    background: "#f0f0f0",
    borderRadius: "3px",
    padding: "2px",
    cursor: "pointer",
    userSelect: "none",
    zIndex: 10,
  };

  const handleHeightChange = (delta) => {
    setHeight((prev) => {
      const newHeight = prev + delta;
      return Math.max(minHeight, Math.min(maxHeight, newHeight));
    });
  };

  if (type === "text") {
    return (
      <div style={containerStyle}>
        <input
          type="text"
          placeholder={label}
          style={inputStyle}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value, type, label)}
        />
        <div style={resizeHandleStyle}>
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
      </div>
    );
  }

  if (type === "date") {
    return (
      <div style={containerStyle}>
        <input
          type="date"
          style={inputStyle}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value, type, label)}
        />
        <div style={resizeHandleStyle}>
          <span onClick={() => handleHeightChange(step)}>↑</span>
          <span onClick={() => handleHeightChange(-step)}>↓</span>
        </div>
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onChange(name, e.target.checked, "checkbox", label)}
          style={{ width: "16px", height: "16px", cursor: "pointer" }}
        />
      </div>
    );
  }

  if (type === "number") {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
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
    }, []); // only on mount

    const handleChange = (e) => {
      const val = e.target.value;
      if (val === "" || val === "." || /^\d*\.?\d*$/.test(val)) {
        setDisplayValue(val);
        const num = val === "" || val === "." ? null : parseFloat(val);
        onChange(name, isNaN(num) ? null : num, type, label);
      }
    };

    const handleBlur = () => {
      if (displayValue === "" || displayValue === ".") {
        setDisplayValue("");
        onChange(name, null, type, label);
        return;
      }

      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        let formatted =
          decimalPlaces !== undefined
            ? num.toFixed(decimalPlaces)
            : num.toString();

        // Optional: remove trailing .00 → show 5 instead of 5.00
        // formatted = Number(formatted).toString();

        setDisplayValue(formatted);
        onChange(name, num, type, label);
      }
    };

    return (
      <div style={containerStyle}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={label}
          style={inputStyle}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <div style={resizeHandleStyle}>
          <span onClick={() => handleHeightChange(step)}>↑</span>
          <span onClick={() => handleHeightChange(-step)}>↓</span>
        </div>
      </div>
    );
  }

  return <span style={{ color: "red" }}>Unknown: {type}</span>;
};

// --- Helper to process HTML: Remove \r, extract body, inject styles from head ---
const processHtml = (html, injectExcelCSS) => {
  // Remove carriage returns to prevent placeholder issues
  html = html.replace(/\r/g, "");

  // Parse as HTML document
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Extract and inject styles from <head> (for single HTML files)
  const styleElements = doc.querySelectorAll("head style");
  styleElements.forEach((style) => {
    injectExcelCSS(style.innerHTML);
  });

  // Return innerHTML of <body>, or full content if no body
  return doc.body ? doc.body.innerHTML : html;
};

// --- Main Component ---
const ExcelChecksheet = ({ initialHtml = "", onSubmit }) => {
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const [formData, setFormData] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});
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

  // Inject CSS into <head> (unchanged)
  const injectExcelCSS = (cssText) => {
    const old = document.getElementById("excel-css");
    if (old) old.remove();

    const style = document.createElement("style");
    style.id = "excel-css";
    style.innerHTML = cssText;
    document.head.appendChild(style);
  };

  // Extract images from ZIP and create blob URLs (unchanged)
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

  // Rewrite image URLs in HTML (unchanged)
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

      // CHECK: Did user upload the Main Frameset file?
      if (content.includes("<frameset") || content.includes("<frame src")) {
        setError(
          "⚠️ You uploaded the Main Workbook file. Please open the file folder, find the specific sheet file (e.g., 'sheet001.htm'), and upload that instead."
        );
        setIsUploading(false);
        return;
      }

      // Process HTML: remove \r, extract body, inject styles
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

      // Process HTML: remove \r, extract body, inject styles (CSS file takes priority)
      htmlContent = processHtml(htmlContent, injectExcelCSS);

      // Inject separate CSS if available (after embedded styles)
      if (cssFile) {
        const cssContent = await cssFile.async("text");
        injectExcelCSS(cssContent);
      } else {
        console.warn("No stylesheet.css found in ZIP");
      }

      // Extract and process images
      const imageMap = await extractImages(zipContent);
      setImages(imageMap);

      // Update image URLs in processed HTML
      const processedHtml = rewriteImageUrls(htmlContent, imageMap);

      setHtmlContent(processedHtml);
      return true;
    } catch (err) {
      console.error("Error processing ZIP:", err);
      throw err;
    }
  };

  // Main file upload handler (unchanged)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setHtmlContent("");
    setImages({});
    setFormData({});

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

  // Parser options
  const parseOptions = {
    replace: (node) => {
      if (node.type === "text") {
        const text = node.data;
        const regex = /\{\{(\w+):([^:]+)(?::(\d+))?\}\}/g;
        const matches = [...text.matchAll(regex)];

        if (matches.length > 0) {
          const parts = [];
          let lastIndex = 0;

          matches.forEach((match) => {
            const [fullMatch, type, label, decimals] = match;
            const index = match.index;

            if (index > lastIndex) {
              parts.push(text.substring(lastIndex, index));
            }

            const fieldType = type.toLowerCase();
            const fieldLabel = label.trim();
            const uniqueId = ++fieldCounter.current;
            const fieldName = `field_${fieldLabel.replace(
              /\s+/g,
              "_"
            )}_${uniqueId}`;
            const decimalPlaces = decimals ? parseInt(decimals, 10) : undefined;

            parts.push(
              <FormField
                key={fieldName}
                type={fieldType}
                label={fieldLabel}
                name={fieldName}
                value={formData[fieldName]?.value}
                onChange={handleFieldChange}
                decimalPlaces={decimalPlaces}
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
  }, [htmlContent, formData]);

  const handleSave = async () => {
    console.log("Saving Data:", formData);
    try {
      await axios.post("http://localhost:5000/api/checksheet/submit", {
        data: formData,
      });
      alert("✅ Checksheet Submitted!");
      if (onSubmit) onSubmit(formData);
    } catch (error) {
      alert("❌ Error submitting");
    }
  };

  // Return JSX (unchanged)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Excel Checksheet Builder</h3>
        <div style={styles.actions}>
          <input
            type="file"
            accept=".zip,.html,.htm"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            style={styles.uploadBtn}
          >
            📤 Upload File
          </button>
          <button onClick={handleSave} style={styles.primaryBtn}>
            💾 Save Data
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {isUploading && <div style={styles.loading}>Processing file...</div>}

      <div style={styles.previewArea}>
        {htmlContent ? (
          <div className="excel-scope" style={styles.excelScope}>
            {parsedContent}
          </div>
        ) : (
          <div style={styles.placeholder}>
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>📄</div>
            <h3>Upload Excel File</h3>
            <p>Supported file types:</p>
            <ul
              style={{
                textAlign: "left",
                display: "inline-block",
                marginBottom: "20px",
              }}
            >
              <li>
                <strong>.zip</strong> - Complete Excel export folder
                <div
                  style={{
                    fontSize: "0.9em",
                    color: "#666",
                    marginLeft: "20px",
                  }}
                >
                  Contains: sheet001.html, stylesheet.css, images, etc.
                </div>
              </li>
              <li>
                <strong>.html / .htm</strong> - Individual sheet file
                <div
                  style={{
                    fontSize: "0.9em",
                    color: "#666",
                    marginLeft: "20px",
                  }}
                >
                  Single HTML file (e.g., sheet001.html)
                </div>
              </li>
            </ul>

            <div style={styles.instructions}>
              <h4>How to export from Excel:</h4>
              <ol style={{ textAlign: "left", display: "inline-block" }}>
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

// styles (unchanged)
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "sans-serif",
    backgroundColor: "#f4f4f4",
  },
  header: {
    backgroundColor: "#fff",
    padding: "15px 20px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  primaryBtn: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  uploadBtn: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  errorBanner: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
    padding: "15px",
    textAlign: "center",
    borderBottom: "1px solid #f5c6cb",
  },
  loading: {
    textAlign: "center",
    padding: "20px",
    color: "#666",
    fontStyle: "italic",
  },
  previewArea: {
    flex: 1,
    padding: "20px",
    overflow: "auto",
    display: "flex",
    justifyContent: "center",
  },
  excelScope: {
    border: "1px solid #ddd",
    background: "white",
    padding: "20px",
    maxWidth: "100%",
    overflow: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  placeholder: {
    marginTop: "20px",
    color: "#555",
    textAlign: "center",
    border: "2px dashed #ccc",
    padding: "40px",
    borderRadius: "12px",
    background: "#fff",
    width: "80%",
    maxWidth: "800px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  },
  instructions: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    borderLeft: "4px solid #007bff",
  },
};

export default ExcelChecksheet;
