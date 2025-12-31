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
import swal from "sweetalert";

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

  // Multi-sheet support
  const [sheets, setSheets] = useState([]); // [{ id: "sheet001", name: "Sheet 1", html: "..." }, ...]
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [sheetStates, setSheetStates] = useState([]); // [{scale: number, translate: {x: number, y: number}}, ...] or null for uninitialized

  // Pan & Zoom state
  const translate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isOverForm = useRef(false);

  const fileInputRef = useRef(null);
  const scalerRef = useRef(null);
  const containerRef = useRef(null);
  const prevSheetIndexRef = useRef(null);

  const scaleRef = useRef(1);

  // Add this to your main component (ExcelChecksheet.js)
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
          e.target.tagName === "TEXTAREA";

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

  useEffect(() => {
    if (
      prevSheetIndexRef.current !== null &&
      prevSheetIndexRef.current !== currentSheetIndex
    ) {
      const prevIndex = prevSheetIndexRef.current;
      setSheetStates((prev) => {
        const newStates = [...prev];
        newStates[prevIndex] = {
          scale: scaleRef.current,
          translate: { ...translate.current },
        };
        return newStates;
      });
    }
    prevSheetIndexRef.current = currentSheetIndex;
  }, [currentSheetIndex]);

  useEffect(() => {
    setHtmlContent(initialHtml);
  }, [initialHtml]);

  useEffect(() => {
    return () => {
      Object.values(images).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const updateTransform = useCallback(() => {
    const scaler = scalerRef.current;
    if (!scaler) return;
    scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // === PAN & ZOOM LOGIC (updated for per-sheet state) ===
  useEffect(() => {
    const scaler = scalerRef.current;
    const container = containerRef.current;
    if (!scaler || !htmlContent || !container) return;

    // Load saved state or compute initial
    let savedState = sheetStates[currentSheetIndex];
    let initialScale = 1;
    const tableWidth = scaler.scrollWidth;
    const availableWidth = container.clientWidth - 40;
    if (tableWidth > availableWidth) {
      initialScale = Math.max(availableWidth / tableWidth, 0.35);
    }

    if (savedState) {
      scaleRef.current = savedState.scale;
      translate.current = { ...savedState.translate };
    } else {
      scaleRef.current = initialScale;
      translate.current = { x: 0, y: 0 };
      // Save initial state
      setSheetStates((prev) => {
        const newStates = [...prev];
        newStates[currentSheetIndex] = {
          scale: initialScale,
          translate: { x: 0, y: 0 },
        };
        return newStates;
      });
    }

    updateTransform();

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

      scaleRef.current = newScale;
      scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${newScale})`;
    };

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
        return;
      }

      if (e.button === 0) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        scaler.style.cursor = "grabbing";
        e.preventDefault();
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
  }, [htmlContent, currentSheetIndex, sheetStates, updateTransform]);

  // === FIELD CONFIG EXTRACTION (FIXED) ===
  const extractFieldConfigs = (html, sheetIndex = 0) => {
    const regex = /\{\{(\w+):([^:}]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
    const matches = [...html.matchAll(regex)];
    const configs = {};
    const instances = [];
    const labelCount = {};

    // First pass: count occurrences of each label
    matches.forEach((match) => {
      const [, , rawLabel] = match;
      let label = rawLabel.trim();
      label = label.replace(/<\/?[^>]+(>|$)/g, "").trim();
      const bracketIndex = label.indexOf("<");
      if (bracketIndex > -1) label = label.substring(0, bracketIndex).trim();
      label = label.replace(/&[a-z]+;/g, "").trim();

      labelCount[label] = (labelCount[label] || 0) + 1;
    });

    const duplicates = Object.entries(labelCount)
      .filter(([_, count]) => count > 1)
      .map(([label]) => label);

    if (duplicates.length > 0) {
      // Show sweetalert and throw error
      swal({
        title: "⚠️ Duplicate Field Labels Detected",
        html: `<div style="text-align: left; font-size: 14px;">
          <p>The following field labels appear multiple times:</p>
          <ul style="margin-left: 20px;">${duplicates
            .map((l) => `<li><strong>"${l}"</strong></li>`)
            .join("")}</ul>
          <p style="color: #d35400;">Please make each field label unique.</p>
        </div>`,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#dc3545",
      });

      // Return error object instead of throwing
      return {
        configs: {},
        instances: [],
        error: `Duplicate labels: ${duplicates.join(", ")}`,
      };
    }

    // Process matches if no duplicates
    matches.forEach((match, index) => {
      const [fullMatch, rawType, rawLabel, rawDecimals, rawOptions] = match;
      const type = rawType.toLowerCase();
      let label = rawLabel.trim();
      label = label.replace(/<\/?[^>]+(>|$)/g, "").trim();
      const bracketIndex = label.indexOf("<");
      if (bracketIndex > -1) label = label.substring(0, bracketIndex).trim();
      label = label.replace(/&[a-z]+;/g, "").trim();

      const decimalPlaces = rawDecimals ? parseInt(rawDecimals, 10) : undefined;
      const options = rawOptions
        ? rawOptions.split(",").map((o) => o.trim())
        : null;

      const position = `S${sheetIndex + 1}F${index + 1}`;
      const instanceId = `field_${label.replace(/\s+/g, "_")}_${index}_sheet${
        sheetIndex + 1
      }`;

      configs[instanceId] = {
        originalType: type,
        type,
        label,
        originalLabel: label,
        options,
        decimalPlaces,
        originalHtml: fullMatch,
        instanceId,
        position,
        isDuplicate: false,
        sheetIndex,
      };

      instances.push({
        instanceId,
        type,
        label,
        originalLabel: label,
        position,
        matchIndex: index,
        sheetIndex,
      });
    });

    return { configs, instances, error: null };
  };

  const assignFieldPositions = (instances) => {
    const positions = {};
    if (!instances || !Array.isArray(instances)) return positions;

    instances.forEach((inst) => {
      if (inst && inst.instanceId) {
        positions[inst.instanceId] = inst.position;
      }
    });
    return positions;
  };

  useEffect(() => {
    if (htmlContent && sheets.length > 0) {
      const currentSheet = sheets[currentSheetIndex];
      if (!currentSheet?.html) return;

      const result = extractFieldConfigs(currentSheet.html, currentSheetIndex);

      if (result.error) {
        // Handle duplicate error
        setError(result.error);
        return;
      }

      setFieldConfigs(result.configs);
      setFieldInstances(result.instances);
      const positions = assignFieldPositions(result.instances);
      setFieldPositions(positions);
    }
  }, [htmlContent, currentSheetIndex, sheets]);

  const getAllFieldsInfo = useMemo(() => {
    if (!Array.isArray(fieldInstances)) return [];
    return fieldInstances.map((inst) => ({
      position: inst.position,
      type: fieldConfigs[inst.instanceId]?.type || inst.type,
      label: inst.label,
      instanceId: inst.instanceId,
    }));
  }, [fieldInstances, fieldConfigs]);

  const createFieldValueMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(fieldInstances)) return map;

    fieldInstances.forEach((inst) => {
      const position = inst.position;
      const fieldData = formData[inst.instanceId];
      const value = fieldData?.value;
      const numValue = parseFloat(value);
      map[position] = isNaN(numValue) ? 0 : numValue;
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

  // === NEW: Multi-sheet ZIP handling ===
  const handleZipUpload = async (file) => {
    const zip = await JSZip.loadAsync(file);
    const files = Object.values(zip.files).filter((f) => !f.dir);

    // Find all sheet files
    const sheetFiles = files.filter((f) => f.name.match(/sheet\d+\.htm(l)?$/i));
    if (sheetFiles.length === 0)
      throw new Error("No sheet files found in ZIP.");

    // Sort sheets by name
    sheetFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Extract real sheet names from tabstrip.html
    let sheetNames = [];
    const tabstripFile = files.find(
      (f) => f.name.toLowerCase() === "tabstrip.html"
    );
    if (tabstripFile) {
      const tabstripHtml = await tabstripFile.async("text");
      const parser = new DOMParser();
      const doc = parser.parseFromString(tabstripHtml, "text/html");
      const links = doc.querySelectorAll("a[target='frSheet']");
      links.forEach((link) => {
        const text = link.textContent.trim();
        sheetNames.push(text || "Sheet");
      });
    }

    // Fallback names
    if (sheetNames.length !== sheetFiles.length) {
      sheetNames = sheetFiles.map((_, i) => `Sheet ${i + 1}`);
    }

    // === COLLECT ALL CSS FROM ALL SOURCES ===
    let allCss = "";

    // 1. Main stylesheet.css
    const cssFile = files.find((f) =>
      f.name.toLowerCase().includes("stylesheet.css")
    );
    if (cssFile) {
      allCss += await cssFile.async("text");
      allCss += "\n\n";
    }

    // 2. Collect <style> from EVERY sheet
    const loadedSheets = [];
    for (let i = 0; i < sheetFiles.length; i++) {
      const sheetFile = sheetFiles[i];
      let html = await sheetFile.async("text");

      // === NEW: TRIM HTML AT {{END}} ===
      const endMarkerIndex = html.indexOf("{{END}}");
      if (endMarkerIndex !== -1) {
        // Find the end of the current table row containing {{END}}
        const htmlBeforeEnd = html.substring(0, endMarkerIndex);

        // Find the closing </tr> tag after {{END}}
        const afterEnd = html.substring(endMarkerIndex);
        const trCloseIndex = afterEnd.indexOf("</tr>");

        if (trCloseIndex !== -1) {
          // Remove everything from the start of the row containing {{END}}
          // We need to find the opening <tr> for this row
          const lastTrOpenIndex = htmlBeforeEnd.lastIndexOf("<tr");
          if (lastTrOpenIndex !== -1) {
            // Keep everything up to this <tr> opening tag
            html = html.substring(0, lastTrOpenIndex);
          }
        }
      }

      // Extract and collect inline <style> tags
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("head style").forEach((styleTag) => {
        allCss += styleTag.innerHTML + "\n\n";
      });

      // Clean body HTML
      html = doc.body ? doc.body.innerHTML : html;

      loadedSheets.push({
        id: sheetFile.name,
        name: sheetNames[i] || `Sheet ${i + 1}`,
        html,
        index: i,
      });
    }

    // === INJECT ALL COLLECTED CSS ONCE ===
    injectExcelCSS(allCss);

    // === PROCESS IMAGES ===
    const imageMap = await extractImages(zip);
    setImages(imageMap);

    const processedSheets = loadedSheets.map((sheet) => ({
      ...sheet,
      html: rewriteImageUrls(sheet.html, imageMap),
    }));

    setSheets(processedSheets);
    setSheetStates(Array(processedSheets.length).fill(null));
    setCurrentSheetIndex(0);
    setHtmlContent(processedSheets[0]?.html || "");
  };

  const handleHtmlUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = e.target.result;

      // === NEW: TRIM HTML AT {{END}} ===
      const endMarkerIndex = content.indexOf("{{END}}");
      if (endMarkerIndex !== -1) {
        // Find the end of the current table row containing {{END}}
        const contentBeforeEnd = content.substring(0, endMarkerIndex);

        // Find the closing </tr> tag after {{END}}
        const afterEnd = content.substring(endMarkerIndex);
        const trCloseIndex = afterEnd.indexOf("</tr>");

        if (trCloseIndex !== -1) {
          // Remove everything from the start of the row containing {{END}}
          const lastTrOpenIndex = contentBeforeEnd.lastIndexOf("<tr");
          if (lastTrOpenIndex !== -1) {
            // Keep everything up to this <tr> opening tag
            content = content.substring(0, lastTrOpenIndex);
          }
        }
      }

      if (content.includes("<frameset") || content.includes("<frame src")) {
        setError(
          "⚠️ Please upload the individual sheet file (e.g., sheet001.htm), not the main workbook."
        );
        setIsUploading(false);
        return;
      }

      content = processHtml(content);

      try {
        const result = extractFieldConfigs(content);

        if (result.error) {
          setError(result.error);
          setSheets([]);
          setHtmlContent("");
        } else {
          setFieldConfigs(result.configs);
          setFieldInstances(result.instances);
          setFieldPositions(assignFieldPositions(result.instances));

          const processedSheets = [
            {
              id: "single",
              name: file.name.replace(/\.[^/.]+$/, ""),
              html: content,
              index: 0,
            },
          ];
          setSheets(processedSheets);
          setSheetStates(Array(processedSheets.length).fill(null));
          setCurrentSheetIndex(0);
          setHtmlContent(content);
          setError(null);
        }
      } catch (err) {
        setError(`Error: ${err.message}`);
        setSheets([]);
        setHtmlContent("");
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    setHtmlContent("");
    setSheets([]);
    setSheetStates([]);
    setImages({});
    setFormData({});
    setFieldConfigs({});
    setFieldPositions({});
    setFieldInstances([]);
    setCurrentSheetIndex(0);

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
      console.error("Upload error:", err);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        min: updatedField.min,
        max: updatedField.max,
        bgColorInRange: updatedField.bgColorInRange,
        bgColorBelowMin: updatedField.bgColorBelowMin,
        bgColorAboveMax: updatedField.bgColorAboveMax,
        borderColorInRange: updatedField.borderColorInRange,
        borderColorBelowMin: updatedField.borderColorBelowMin,
        borderColorAboveMax: updatedField.borderColorAboveMax,
      },
    }));
  };

  const parseOptions = {
    replace: (node) => {
      if (node.type !== "text") return;
      const text = node.data;
      const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
      if (!text.match(regex)) return;

      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) return;

      const parts = [];
      let lastIndex = 0;
      const renderedInstances = new Set();

      matches.forEach((match) => {
        const [fullMatch, rawType, rawLabel] = match;
        const type = rawType.toLowerCase();
        let cleanLabel = rawLabel.trim();
        cleanLabel = cleanLabel.replace(/<\/?[^>]+(>|$)/g, "").trim();
        const bracketIndex = cleanLabel.indexOf("<");
        if (bracketIndex > -1)
          cleanLabel = cleanLabel.substring(0, bracketIndex).trim();
        cleanLabel = cleanLabel.replace(/&[a-z]+;/g, "").trim();

        const possibleInstances = fieldInstances.filter(
          (inst) =>
            inst.originalLabel === cleanLabel &&
            inst.sheetIndex === currentSheetIndex
        );

        if (!possibleInstances.length) return;

        let instance =
          possibleInstances.find((i) => !renderedInstances.has(i.instanceId)) ||
          possibleInstances[0];
        if (!instance) return;

        renderedInstances.add(instance.instanceId);
        const { instanceId: fieldId, position } = instance;
        const config = fieldConfigs[fieldId] || {};

        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const fieldInfo = getFieldTypeInfo(config.type || type);

        parts.push(
          <FormField
            key={fieldId}
            type={config.type || type}
            label={config.label || instance.label}
            name={fieldId}
            value={formData[fieldId]?.value ?? fieldInfo.defaultValue}
            onChange={handleFieldChange}
            decimalPlaces={config.decimalPlaces}
            options={config.options}
            multiline={config.multiline ?? false}
            autoShrinkFont={config.autoShrinkFont ?? true}
            formula={config.formula}
            fieldPosition={position}
            allFormData={formData}
            fieldValueMap={createFieldValueMap}
            allFields={getAllFieldsInfo}
            min={config.min}
            max={config.max}
            bgColorInRange={config.bgColorInRange}
            bgColorBelowMin={config.bgColorBelowMin}
            bgColorAboveMax={config.bgColorAboveMax}
            borderColorInRange={config.borderColorInRange}
            borderColorBelowMin={config.borderColorBelowMin}
            borderColorAboveMax={config.borderColorAboveMax}
            onEditField={() =>
              setEditingField({
                ...config,
                instanceId: fieldId,
                fieldPosition: position,
                originalLabel: instance.originalLabel,
              })
            }
          />
        );

        lastIndex = match.index + fullMatch.length;
      });

      if (lastIndex < text.length) parts.push(text.substring(lastIndex));
      return <>{parts}</>;
    },
  };

  const parsedContent = useMemo(() => {
    const currentHtml = sheets[currentSheetIndex]?.html || htmlContent;
    return parse(currentHtml, parseOptions);
  }, [
    htmlContent,
    formData,
    fieldConfigs,
    currentSheetIndex,
    sheets,
    fieldInstances,
  ]);

  const handlePublish = async () => {
    if (!formName.trim()) return alert("Please enter a form name");
    if (sheets.length === 0) return alert("No content to publish");

    try {
      // Collect all field configs from all sheets
      const allConfigs = {};
      const allPositions = {};

      for (let i = 0; i < sheets.length; i++) {
        const result = extractFieldConfigs(sheets[i].html, i);
        if (result.error) {
          alert(`Error in sheet "${sheets[i].name}": ${result.error}`);
          return;
        }
        Object.assign(allConfigs, result.configs);
        Object.assign(allPositions, assignFieldPositions(result.instances));
      }

      const filledValues = Object.fromEntries(
        Object.entries(formData)
          .filter(([_, v]) => v.value != null && v.value !== "")
          .map(([k, v]) => [k, v.value])
      );

      const response = await axios.post(
        "http://localhost:5000/api/checksheet/templates",
        {
          name: formName,
          html_content: sheets
            .map((s) => s.html)
            .join("<div style='page-break-before:always'></div>"),
          field_configurations: allConfigs,
          field_positions: allPositions,
          form_values: filledValues,
          sheets: sheets.map((s) => ({ name: s.name, html: s.html })),
          last_updated: new Date().toISOString(),
        }
      );

      if (response.data.success) {
        alert(`Form "${formName}" published! ID: ${response.data.template_id}`);
        setFormName("");
      }
    } catch (err) {
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
        <h3>Form Checksheet Builder</h3>
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

          {sheets.length > 0 && (
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

      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <div className="sheet-tabs">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.id}
              className={`sheet-tab ${
                currentSheetIndex === index ? "active" : ""
              }`}
              onClick={() => setCurrentSheetIndex(index)}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="preview-area">
        {sheets.length > 0 ? (
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
