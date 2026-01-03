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
import API_BASE_URL from "../../config/api";

const ExcelChecksheet = ({ initialHtml = "", onSubmit }) => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : {
          "Content-Type": "application/json",
        };
  };

  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const [formData, setFormData] = useState({});
  const [fieldConfigs, setFieldConfigs] = useState({});
  const [sheetFieldConfigs, setSheetFieldConfigs] = useState({}); // { sheetIndex: { fieldId: config } }
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

      // CRITICAL: Check if we already have custom configs for this field
      const existingConfig = sheetFieldConfigs[sheetIndex]?.[instanceId];

      // If we have existing config, use it, otherwise create defaults
      if (existingConfig) {
        configs[instanceId] = {
          ...existingConfig,
          // Preserve original data
          originalType: type,
          originalLabel: label,
          originalHtml: fullMatch,
          instanceId,
          position,
          sheetIndex,
          // Only set defaults if they don't exist
          bgColor: existingConfig.bgColor || "#ffffff",
          textColor: existingConfig.textColor || "#000000",
          exactMatchText: existingConfig.exactMatchText || "",
          exactMatchBgColor: existingConfig.exactMatchBgColor || "#d4edda",
          minLength: existingConfig.minLength || null,
          minLengthMode: existingConfig.minLengthMode || "warning",
          minLengthWarningBg: existingConfig.minLengthWarningBg || "#ffebee",
          maxLength: existingConfig.maxLength || null,
          maxLengthMode: existingConfig.maxLengthMode || "warning",
          maxLengthWarningBg: existingConfig.maxLengthWarningBg || "#fff3cd",
        };
      } else {
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
          bgColor: "#ffffff",
          textColor: "#000000",
          exactMatchText: "",
          exactMatchBgColor: "#d4edda",
          minLength: null,
          minLengthMode: "warning",
          minLengthWarningBg: "#ffebee",
          maxLength: null,
          maxLengthMode: "warning",
          maxLengthWarningBg: "#fff3cd",
        };
      }

      instances.push({
        instanceId,
        type: configs[instanceId].type,
        label: configs[instanceId].label,
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
        setError(result.error);
        return;
      }

      // Store configs per sheet instead of overwriting
      setSheetFieldConfigs((prev) => ({
        ...prev,
        [currentSheetIndex]: result.configs,
      }));

      setFieldInstances((prevInstances) => {
        // Merge new instances for this sheet
        const existingInstances = prevInstances.filter(
          (inst) => inst.sheetIndex !== currentSheetIndex
        );
        return [...existingInstances, ...result.instances];
      });

      const positions = assignFieldPositions(result.instances);
      setFieldPositions((prev) => ({
        ...prev,
        ...positions,
      }));
    }
  }, [htmlContent, currentSheetIndex, sheets]);

  // Add this helper function
  const getCurrentFieldConfigs = () => {
    return sheetFieldConfigs[currentSheetIndex] || {};
  };

  const getCurrentFieldInstances = () => {
    return fieldInstances.filter(
      (inst) => inst.sheetIndex === currentSheetIndex
    );
  };

  const getAllFieldsInfo = useMemo(() => {
    if (!Array.isArray(fieldInstances)) return [];

    return fieldInstances.map((inst) => {
      const configs = sheetFieldConfigs[inst.sheetIndex] || {};
      return {
        position: inst.position,
        type: configs[inst.instanceId]?.type || inst.type,
        label: inst.label,
        instanceId: inst.instanceId,
        sheetIndex: inst.sheetIndex,
      };
    });
  }, [fieldInstances, sheetFieldConfigs]);

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
    let allFieldLabels = {};
    let hasDuplicates = false;
    let duplicateLabels = [];

    for (let i = 0; i < sheetFiles.length; i++) {
      const sheetFile = sheetFiles[i];
      let html = await sheetFile.async("text");

      // === TRIM HTML AT {{END}} ===
      const endMarkerIndex = html.indexOf("{{END}}");
      if (endMarkerIndex !== -1) {
        const htmlBeforeEnd = html.substring(0, endMarkerIndex);
        const afterEnd = html.substring(endMarkerIndex);
        const trCloseIndex = afterEnd.indexOf("</tr>");

        if (trCloseIndex !== -1) {
          const lastTrOpenIndex = htmlBeforeEnd.lastIndexOf("<tr");
          if (lastTrOpenIndex !== -1) {
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

      // === CHECK FOR DUPLICATE LABELS ACROSS ALL SHEETS ===
      const regex = /\{\{(\w+):([^:}]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
      const matches = [...html.matchAll(regex)];

      matches.forEach((match) => {
        const [, , rawLabel] = match;
        let label = rawLabel.trim();
        label = label.replace(/<\/?[^>]+(>|$)/g, "").trim();
        const bracketIndex = label.indexOf("<");
        if (bracketIndex > -1) label = label.substring(0, bracketIndex).trim();
        label = label.replace(/&[a-z]+;/g, "").trim();

        if (allFieldLabels[label]) {
          if (!duplicateLabels.includes(label)) {
            duplicateLabels.push(label);
          }
          allFieldLabels[label].count += 1;
          allFieldLabels[label].sheets.push(i + 1);
        } else {
          allFieldLabels[label] = {
            count: 1,
            sheets: [i + 1],
          };
        }
      });

      loadedSheets.push({
        id: sheetFile.name,
        name: sheetNames[i] || `Sheet ${i + 1}`,
        html: html, // Store original HTML
        originalHtml: html, // Keep original for reference
        index: i,
      });
    }

    // Check for cross-sheet duplicates
    const crossSheetDuplicates = duplicateLabels.filter(
      (label) => allFieldLabels[label].sheets.length > 1
    );

    if (crossSheetDuplicates.length > 0) {
      swal({
        title: "⚠️ Duplicate Field Labels Across Sheets Detected",
        html: `<div style="text-align: left; font-size: 14px;">
      <p>The following field labels appear in multiple sheets:</p>
      <ul style="margin-left: 20px; margin-bottom: 15px;">
        ${crossSheetDuplicates
          .map(
            (label) =>
              `<li><strong>"${label}"</strong> - Sheets: ${allFieldLabels[
                label
              ].sheets.join(", ")}</li>`
          )
          .join("")}
      </ul>
      <p style="color: #d35400; font-weight: bold;">
        ⚠️ Fields with the same name in different sheets will share the same value.
      </p>
      <p style="color: #666; margin-top: 10px;">
        If this is intended (same field appearing on multiple sheets), click "Continue".<br>
        If not, click "Cancel" and edit your Excel file to make field labels unique.
      </p>
    </div>`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Continue Anyway",
        cancelButtonText: "Cancel Upload",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      }).then((result) => {
        if (!result.isConfirmed) {
          setIsUploading(false);
          fileInputRef.current.value = "";
          return;
        }
        continueWithCssInjection();
      });

      function continueWithCssInjection() {
        injectExcelCSS(allCss);

        extractImages(zip)
          .then((imageMap) => {
            setImages(imageMap);

            const processedSheets = loadedSheets.map((sheet) => ({
              ...sheet,
              html: rewriteImageUrls(sheet.html, imageMap),
            }));

            setSheets(processedSheets);
            setSheetStates(Array(processedSheets.length).fill(null));
            setCurrentSheetIndex(0);
            setHtmlContent(processedSheets[0]?.html || "");
            setIsUploading(false);

            // CRITICAL: Extract field configs from ALL sheets immediately
            setTimeout(() => {
              const initialConfigs = {};
              const allInstances = [];

              processedSheets.forEach((sheet, index) => {
                const result = extractFieldConfigs(sheet.html, index);
                if (result.configs && !result.error) {
                  initialConfigs[index] = result.configs;
                  allInstances.push(...result.instances);
                }
              });

              setSheetFieldConfigs(initialConfigs);
              setFieldInstances(allInstances);

              // Initialize form data for all fields
              const initialFormData = {};
              Object.values(initialConfigs).forEach((sheetConfig) => {
                Object.keys(sheetConfig).forEach((fieldId) => {
                  initialFormData[fieldId] = "";
                });
              });
              setFormData(initialFormData);
            }, 0);
          })
          .catch((err) => {
            console.error("Error processing images:", err);
            setError("Error processing images: " + err.message);
            setIsUploading(false);
          });
      }
    } else {
      injectExcelCSS(allCss);

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
      setIsUploading(false);

      // CRITICAL: Extract field configs from ALL sheets immediately
      setTimeout(() => {
        const initialConfigs = {};
        const allInstances = [];

        processedSheets.forEach((sheet, index) => {
          const result = extractFieldConfigs(sheet.html, index);
          if (result.configs && !result.error) {
            initialConfigs[index] = result.configs;
            allInstances.push(...result.instances);
          }
        });

        setSheetFieldConfigs(initialConfigs);
        setFieldInstances(allInstances);

        // Initialize form data for all fields
        const initialFormData = {};
        Object.values(initialConfigs).forEach((sheetConfig) => {
          Object.keys(sheetConfig).forEach((fieldId) => {
            initialFormData[fieldId] = "";
          });
        });
        setFormData(initialFormData);
      }, 0);
    }
  };

  const handleHtmlUpload = async (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = e.target.result;

      // === NEW: TRIM HTML AT {{END}} ===
      const endMarkerIndex = content.indexOf("{{END}}");
      if (endMarkerIndex !== -1) {
        const contentBeforeEnd = content.substring(0, endMarkerIndex);

        const afterEnd = content.substring(endMarkerIndex);
        const trCloseIndex = afterEnd.indexOf("</tr>");

        if (trCloseIndex !== -1) {
          const lastTrOpenIndex = contentBeforeEnd.lastIndexOf("<tr");
          if (lastTrOpenIndex !== -1) {
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
    const { instanceId, sheetIndex = currentSheetIndex } = updatedField;

    setSheetFieldConfigs((prev) => {
      const currentSheetConfigs = prev[sheetIndex] || {};

      return {
        ...prev,
        [sheetIndex]: {
          ...currentSheetConfigs,
          [instanceId]: {
            ...currentSheetConfigs[instanceId], // Preserve existing properties
            ...updatedField, // Apply all updated field properties
            sheetIndex: sheetIndex, // Ensure sheet index is stored
          },
        },
      };
    });
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

      // Get current sheet's instances
      const currentSheetInstances = getCurrentFieldInstances();

      matches.forEach((match) => {
        const [fullMatch, rawType, rawLabel] = match;
        const type = rawType.toLowerCase();
        let cleanLabel = rawLabel.trim();
        cleanLabel = cleanLabel.replace(/<\/?[^>]+(>|$)/g, "").trim();
        const bracketIndex = cleanLabel.indexOf("<");
        if (bracketIndex > -1)
          cleanLabel = cleanLabel.substring(0, bracketIndex).trim();
        cleanLabel = cleanLabel.replace(/&[a-z]+;/g, "").trim();

        const possibleInstances = currentSheetInstances.filter(
          (inst) => inst.originalLabel === cleanLabel
        );

        if (!possibleInstances.length) return;

        let instance =
          possibleInstances.find((i) => !renderedInstances.has(i.instanceId)) ||
          possibleInstances[0];
        if (!instance) return;

        renderedInstances.add(instance.instanceId);
        const { instanceId: fieldId, position } = instance;

        // Get config from current sheet
        const currentConfigs = getCurrentFieldConfigs();
        const config = currentConfigs[fieldId] || {};

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
            bgColor={config.bgColor}
            textColor={config.textColor}
            exactMatchText={config.exactMatchText}
            exactMatchBgColor={config.exactMatchBgColor}
            minLength={config.minLength}
            minLengthMode={config.minLengthMode}
            minLengthWarningBg={config.minLengthWarningBg}
            maxLength={config.maxLength}
            maxLengthMode={config.maxLengthMode}
            maxLengthWarningBg={config.maxLengthWarningBg}
            onEditField={() =>
              setEditingField({
                ...config,
                instanceId: fieldId,
                fieldPosition: position,
                originalLabel: instance.originalLabel,
                sheetIndex: currentSheetIndex, // Add sheet index
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
    console.log("=== PUBLISH BUTTON CLICKED ===");

    /* ===============================
     AUTH CHECK (ADDED)
  =============================== */
    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      alert("Please login to publish forms");
      return;
    }

    if (!formName.trim()) {
      alert("Please enter a form name");
      return;
    }

    if (sheets.length === 0) {
      alert("No content to publish");
      return;
    }

    console.log("Form name:", formName);
    console.log("Sheets count:", sheets.length);

    try {
      /* ===============================
       1. EXTRACT FIELD CONFIGS FROM ALL SHEETS (CRITICAL FIX)
    =============================== */
      console.log("Step 1: Extracting field configs from ALL sheets...");
      const allConfigs = {};
      const allInstances = [];
      const allPositions = {};
      let hasFields = false;

      // Extract field configs from EVERY sheet, regardless of whether user visited them
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        console.log(`Processing sheet ${i}: ${sheet.name}`);

        // Use the ORIGINAL HTML to extract fields (contains {{field:label}} patterns)
        const sheetHtml = sheet.originalHtml || sheet.html;

        if (!sheetHtml) {
          console.warn(`Sheet ${i} has no HTML content`);
          continue;
        }

        // Extract field configs from this sheet
        const result = extractFieldConfigs(sheetHtml, i);

        if (result.error) {
          console.error(`Error in sheet ${i}:`, result.error);
          // Don't stop publishing, just skip this sheet
          continue;
        }

        if (Object.keys(result.configs).length > 0) {
          hasFields = true;

          // Merge configs
          Object.assign(allConfigs, result.configs);

          // Merge instances
          allInstances.push(...result.instances);

          // Merge positions
          const positions = assignFieldPositions(result.instances);
          Object.assign(allPositions, positions);

          console.log(
            `Sheet ${i}: Found ${Object.keys(result.configs).length} fields`
          );
        } else {
          console.log(`Sheet ${i}: No fields found`);
        }
      }

      // ALSO merge any custom configurations from sheetFieldConfigs
      Object.entries(sheetFieldConfigs).forEach(
        ([sheetIndexStr, sheetConfigs]) => {
          const sheetIndex = parseInt(sheetIndexStr);
          if (sheetConfigs) {
            Object.entries(sheetConfigs).forEach(([instanceId, config]) => {
              // Update existing config or add new one
              allConfigs[instanceId] = {
                ...(allConfigs[instanceId] || {}),
                ...config,
                sheetIndex: sheetIndex,
              };
            });
          }
        }
      );

      console.log("Total field configs:", Object.keys(allConfigs).length);
      console.log("Total instances:", allInstances.length);

      if (!hasFields) {
        console.warn("WARNING: No form fields detected!");
        const userConfirmation = window.confirm(
          "No form fields ({{field:label}} patterns) were found in your document. " +
            "Do you want to publish it as a form template without fields?"
        );

        if (!userConfirmation) {
          console.log("User cancelled publish due to no fields");
          return;
        }
      }

      // Clean the configs
      const cleanedConfigs = {};
      Object.entries(allConfigs).forEach(([key, config]) => {
        let cleanLabel = (config.label || "")
          .replace(/<\/?[^>]+>/g, "")
          .replace(/&[a-z]+;/gi, "")
          .trim();

        if (cleanLabel.length < 2) {
          cleanLabel = config.originalLabel || `Field_${Date.now()}`;
        }

        cleanedConfigs[key] = {
          ...config,
          label: cleanLabel,
          bgColor: config.bgColor || "#ffffff",
          textColor: config.textColor || "#000000",
          exactMatchText: config.exactMatchText || "",
          exactMatchBgColor: config.exactMatchBgColor || "#d4edda",
          minLength: config.minLength || null,
          minLengthMode: config.minLengthMode || "warning",
          minLengthWarningBg: config.minLengthWarningBg || "#ffebee",
          maxLength: config.maxLength || null,
          maxLengthMode: config.maxLengthMode || "warning",
          maxLengthWarningBg: config.maxLengthWarningBg || "#fff3cd",
          multiline: config.multiline || false,
          autoShrinkFont: config.autoShrinkFont !== false,
          min: config.min || null,
          max: config.max || null,
          formula: config.formula || "",
          position: config.position || "",
          instanceId: config.instanceId || key,
          sheetIndex: config.sheetIndex || 0,
          field_name: config.field_name || key,

          // FIX: Make sure decimalPlaces is included
          decimalPlaces:
            config.decimalPlaces !== undefined
              ? config.decimalPlaces
              : config.type === "number" || config.type === "calculation"
              ? 0
              : undefined,

          // Also include for database column mapping
          decimal_places:
            config.decimalPlaces !== undefined
              ? config.decimalPlaces
              : config.type === "number" || config.type === "calculation"
              ? 0
              : null,
        };
      });

      /* ===============================
       2. CSS
    =============================== */
      console.log("Step 2: Getting CSS...");
      const excelCSS = document.getElementById("excel-css");
      let allCSS = excelCSS?.innerHTML || "";

      if (!allCSS.trim()) {
        allCSS = `
        table { border-collapse: collapse; }
        td, th {
          border: 1px solid #d4d4d4;
          padding: 2px 4px;
          font-family: Arial, sans-serif;
        }
      `;
      }

      console.log("CSS length:", allCSS.length);

      /* ===============================
       3. IMAGE POSITION ANALYSIS
    =============================== */
      console.log("Step 3: Analyzing image positions...");
      const analyzeImagePositions = (html) => {
        const positions = {};
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let match;
        let index = 0;

        while ((match = imgRegex.exec(html)) !== null) {
          const src = match[1];

          let filename = "";
          if (src.includes("blob:")) {
            for (const [name, blobUrl] of Object.entries(images)) {
              if (blobUrl === src) {
                filename = name.includes("/") ? name.split("/").pop() : name;
                break;
              }
            }
          } else if (src.includes("IMAGE_PLACEHOLDER:")) {
            filename = src.split("IMAGE_PLACEHOLDER:")[1].replace(/["']/g, "");
          } else {
            filename = src.split("/").pop().split("?")[0];
          }

          if (filename) {
            positions[filename] = {
              position: index,
              originalSrc: src,
              filename,
            };
          }
          index++;
        }
        return positions;
      };

      const combinedHtml = sheets
        .map((s) => s.originalHtml)
        .join("<div style='page-break-before:always'></div>");

      const imagePositions = analyzeImagePositions(combinedHtml);

      /* ===============================
       4. IMAGE → BASE64
    =============================== */
      console.log("Step 4: Converting images to base64...");
      const imagesData = {};

      if (images && Object.keys(images).length > 0) {
        const imageEntries = Object.entries(images);
        const assignedImages = [];

        imageEntries.forEach(([name, blobUrl], index) => {
          const filename = name.includes("/") ? name.split("/").pop() : name;
          let position = imagePositions[filename]?.position ?? index;

          assignedImages.push({
            name,
            blobUrl,
            filename,
            position,
            order: index,
          });
        });

        assignedImages.sort((a, b) => a.position - b.position);

        for (const img of assignedImages) {
          const response = await fetch(img.blobUrl);
          const blob = await response.blob();

          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          imagesData[img.filename] = {
            base64,
            mimeType: blob.type,
            filename: img.filename,
            size: blob.size,
            order: img.order,
            position: img.position,
            originalSrc: imagePositions[img.filename]?.originalSrc || "",
          };
        }
      }

      /* ===============================
       5. CREATE HTML WITH PLACEHOLDERS
    =============================== */
      let htmlForDatabase = combinedHtml;

      Object.entries(imagesData).forEach(([filename]) => {
        const blobPattern = new RegExp(`src=["']blob:[^"']*["']`, "gi");
        htmlForDatabase = htmlForDatabase.replace(
          blobPattern,
          `src="IMAGE_PLACEHOLDER:${filename}"`
        );

        const filenamePattern = new RegExp(
          `src=["'][^"']*${filename.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}[^"']*["']`,
          "gi"
        );
        htmlForDatabase = htmlForDatabase.replace(
          filenamePattern,
          `src="IMAGE_PLACEHOLDER:${filename}"`
        );
      });

      /* ===============================
       6. FILLED VALUES
    =============================== */
      const filledValues = Object.fromEntries(
        Object.entries(formData)
          .filter(([_, v]) => {
            const value = v?.value !== undefined ? v.value : v;
            return (
              value !== null &&
              value !== undefined &&
              value !== "" &&
              (typeof value !== "string" || value.trim() !== "")
            );
          })
          .map(([k, v]) => {
            const value = v?.value !== undefined ? v.value : v;
            return [k, value];
          })
      );

      /* ===============================
       7. API CALL
    =============================== */
      const payload = {
        name: formName,
        html_content: htmlForDatabase,
        original_html_content: combinedHtml,
        css_content: allCSS.trim(),
        field_configurations: cleanedConfigs,
        field_positions: allPositions,
        form_values: filledValues,
        images: imagesData,
        sheets: sheets.map((s) => ({
          id: s.id,
          name: s.name,
          html: s.html,
          originalHtml: s.originalHtml,
          index: s.index,
        })),
        last_updated: new Date().toISOString(),
      };

      console.log("=== PAYLOAD SUMMARY ===");
      console.log("Sheets:", sheets.length);
      console.log("Fields:", Object.keys(cleanedConfigs).length);

      const publishBtn = document.querySelector(".primary-btn");
      const originalText = publishBtn?.textContent || "Publish Form";
      if (publishBtn) {
        publishBtn.textContent = "Publishing...";
        publishBtn.disabled = true;
      }

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/checksheet/templates`,
          payload,
          {
            timeout: 120000,
            headers: authHeaders,
          }
        );

        if (response.data.success) {
          alert(
            `Form "${formName}" published successfully! Template ID: ${response.data.template_id}`
          );
          setFormName("");
        } else {
          alert(`Publish failed: ${response.data.message || "Unknown error"}`);
        }
      } catch (apiError) {
        if (apiError.response?.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
        } else {
          alert(
            `Server error: ${
              apiError.response?.data?.message || apiError.message
            }`
          );
        }
      } finally {
        if (publishBtn) {
          publishBtn.textContent = originalText;
          publishBtn.disabled = false;
        }
      }
    } catch (err) {
      alert("Unexpected error: " + (err.message || "Unknown error"));
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
                  Save as "Web Page" → creates folder → compress to ZIP → upload
                  .zip
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
