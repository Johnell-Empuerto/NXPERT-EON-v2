import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import parse from "html-react-parser";
import axios from "axios";
import "./FormFiller.css";
import Tooltip from "../excel-to-form/tools/Tooltip";
import CalculationField from "../excel-to-form/excel-to-form-components/CalculationField";
import NumberField from "../excel-to-form/excel-to-form-components/NumberField"; // Add this import
import API_BASE_URL from "../../config/api";
import DateField from "../excel-to-form/excel-to-form-components/DateField";
import ImageField from "../excel-to-form/excel-to-form-components/ImageField";

const FormFiller = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [images, setImages] = useState({});
  const [processedHtml, setProcessedHtml] = useState("");

  // Pan & Zoom state
  const translate = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isOverForm = useRef(false);
  const scaleRef = useRef(1);
  const scalerRef = useRef(null);
  const containerRef = useRef(null);
  const prevSheetIndexRef = useRef(null);
  const [sheetStates, setSheetStates] = useState([]);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Inject Excel CSS into the page
  const injectExcelCSS = (cssText) => {
    const existing = document.getElementById("excel-css-filler");
    if (existing) existing.remove();

    if (!cssText.trim()) return;

    const style = document.createElement("style");
    style.id = "excel-css-filler";
    style.innerHTML = cssText;
    document.head.appendChild(style);
  };

  // Cleanup injected CSS when component unmounts
  useEffect(() => {
    return () => {
      const fillerStyles = document.querySelectorAll(
        'style[id^="excel-css"], style[id^="excel-css-"]'
      );
      fillerStyles.forEach((style) => style.remove());
    };
  }, []);

  // Close tooltips when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
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

  const fieldValueMap = useMemo(() => {
    const map = {};
    template?.fields?.forEach((field) => {
      if (field.position) {
        const fieldValue = formData[field.instance_id || field.field_name] || 0;
        const numValue = parseFloat(fieldValue);
        map[field.position] = isNaN(numValue) ? 0 : numValue;
      }
    });
    return map;
  }, [formData, template]);

  const allFields = useMemo(() => {
    if (!Array.isArray(template?.fields)) return [];
    return template.fields.map((field) => ({
      position: field.position,
      type: field.field_type,
      label: field.label,
      instanceId: field.instance_id || field.field_name,
      value: formData[field.instance_id || field.field_name] || "",
    }));
  }, [template, formData]);

  // Function to load template images from the template API
  const loadTemplateImages = async () => {
    try {
      // Get the template data which now includes images
      const templateResponse = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates/${templateId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (templateResponse.data.success) {
        const templateData = templateResponse.data.template;

        // Check if images are included in template response
        if (templateData.images && templateData.images.length > 0) {
          console.log("=== LOADING IMAGES FROM TEMPLATE API ===");
          console.log(
            `Found ${templateData.images.length} images in template response`
          );

          const imageMap = {};
          const imagesByPosition = {};

          templateData.images.forEach((image, index) => {
            console.log(`Image ${index}:`, {
              id: image.id,
              filename: image.filename,
              position_index: image.position_index,
              element_id: image.element_id,
            });

            const imageUrl = `${API_BASE_URL}/api/checksheet/templates/${templateId}/images/${image.id}`;
            const filename = image.filename || `image_${image.id}`;
            const position =
              image.position_index !== null ? image.position_index : index;

            const imageData = {
              id: image.id,
              url: imageUrl,
              filename: filename,
              originalPath: image.original_path,
              position: position,
              elementId: image.element_id,
            };

            // Add to both maps
            imageMap[filename] = imageData;
            imagesByPosition[position] = imageData;
          });

          console.log("=== IMAGE LOADING SUMMARY ===");
          console.log("Total images loaded:", Object.keys(imageMap).length);
          console.log(
            "Images by position:",
            Object.entries(imagesByPosition)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([pos, img]) => `${pos}: ${img.filename}`)
          );

          setImages(imageMap);
          return { imageMap, imagesByPosition };
        }
      }

      // Fallback: Try direct images API
      console.log("No images in template response, trying images API...");
      const imagesResponse = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates/${templateId}/images`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (
        imagesResponse.data.success &&
        imagesResponse.data.images?.length > 0
      ) {
        console.log(
          `Found ${imagesResponse.data.images.length} images in images API`
        );

        const imageMap = {};
        const imagesByPosition = {};

        imagesResponse.data.images.forEach((image, index) => {
          console.log(`Image ${index}:`, {
            id: image.id,
            filename: image.filename,
            position_index: image.position_index,
          });

          const imageUrl = `${API_BASE_URL}/api/checksheet/templates/${templateId}/images/${image.id}`;
          const filename = image.filename || `image_${image.id}`;
          const position =
            image.position_index !== null ? image.position_index : index;

          const imageData = {
            id: image.id,
            url: imageUrl,
            filename: filename,
            originalPath: image.original_path,
            position: position,
            elementId: image.element_id,
          };

          imageMap[filename] = imageData;
          imagesByPosition[position] = imageData;
        });

        console.log(
          "Images loaded from fallback API:",
          Object.keys(imageMap).length
        );
        setImages(imageMap);
        return { imageMap, imagesByPosition };
      }

      console.log("No images found for this template");
      return { imageMap: {}, imagesByPosition: {} };
    } catch (err) {
      console.error("Failed to load template images:", err);
      return { imageMap: {}, imagesByPosition: {} };
    }
  };

  // Function to process HTML and replace image placeholders
  const processHtmlWithImages = (html, imageData) => {
    const { imageMap, imagesByPosition } = imageData;
    if (!html) return "";

    console.log("=== PROCESSING HTML WITH IMAGES ===");
    console.log(`Available images: ${Object.keys(imageMap).length}`);
    console.log(`Images by position: ${Object.keys(imagesByPosition).length}`);

    // If no images, return original HTML
    if (Object.keys(imageMap).length === 0) {
      console.log("No images available, returning original HTML");
      return html;
    }

    let processedHtml = html;
    let replacementsMade = 0;

    // Find all img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const matches = [...html.matchAll(imgRegex)];

    console.log(`Found ${matches.length} image tags in HTML`);

    // Method 1: Try position-based matching if we have positions
    if (Object.keys(imagesByPosition).length > 0 && matches.length > 0) {
      console.log("Using POSITION-BASED image replacement");

      matches.forEach((match, index) => {
        const fullMatch = match[0];
        const src = match[1];

        // Skip if already API URL
        if (src.includes("/api/checksheet/templates/")) {
          console.log(`[POSITION ${index}] Already has API URL: ${src}`);
          return;
        }

        // Try to find image at this position
        if (imagesByPosition[index]) {
          const image = imagesByPosition[index];
          const newImgTag = fullMatch.replace(
            /src=["'][^"']*["']/i,
            `src="${image.url}"`
          );
          processedHtml = processedHtml.replace(fullMatch, newImgTag);
          console.log(`[POSITION ${index}] Replaced with: ${image.filename}`);
          replacementsMade++;
        } else {
          console.log(
            `[POSITION ${index}] No image at this position, trying filename matching`
          );

          // Extract filename from src
          let filename = "";
          if (src.includes("IMAGE_PLACEHOLDER:")) {
            filename = src.split("IMAGE_PLACEHOLDER:")[1].replace(/["']/g, "");
          } else {
            filename = src.split("/").pop().split("?")[0];
          }

          // Try to match by filename
          let matchedImage = null;
          for (const [key, image] of Object.entries(imageMap)) {
            if (
              key === filename ||
              image.filename === filename ||
              image.filename.includes(filename) ||
              filename.includes(image.filename)
            ) {
              matchedImage = image;
              break;
            }
          }

          if (matchedImage) {
            const newImgTag = fullMatch.replace(
              /src=["'][^"']*["']/i,
              `src="${matchedImage.url}"`
            );
            processedHtml = processedHtml.replace(fullMatch, newImgTag);
            console.log(
              `[FALLBACK] Replaced ${filename} with: ${matchedImage.filename} (position ${matchedImage.position})`
            );
            replacementsMade++;
          } else {
            console.warn(`[POSITION ${index}] No image found for: ${filename}`);
          }
        }
      });
    }
    // Method 2: Filename matching (fallback)
    else if (Object.keys(imageMap).length > 0 && matches.length > 0) {
      console.log("Using FILENAME-BASED image replacement");

      matches.forEach((match, index) => {
        const fullMatch = match[0];
        const src = match[1];

        if (src.includes("/api/checksheet/templates/")) {
          return;
        }

        // Extract filename
        let filename = "";
        if (src.includes("IMAGE_PLACEHOLDER:")) {
          filename = src.split("IMAGE_PLACEHOLDER:")[1].replace(/["']/g, "");
        } else {
          filename = src.split("/").pop().split("?")[0];
        }

        console.log(`[MATCH ${index}] Looking for image: ${filename}`);

        let matchedImage = null;

        // Try exact filename match first
        if (imageMap[filename]) {
          matchedImage = imageMap[filename];
        } else {
          // Try partial match
          for (const [key, image] of Object.entries(imageMap)) {
            if (
              filename.includes(image.filename) ||
              image.filename.includes(filename)
            ) {
              matchedImage = image;
              break;
            }
          }
        }

        if (matchedImage) {
          const newImgTag = fullMatch.replace(
            /src=["'][^"']*["']/i,
            `src="${matchedImage.url}"`
          );
          processedHtml = processedHtml.replace(fullMatch, newImgTag);
          console.log(
            `[MATCH ${index}] Replaced ${filename} with: ${matchedImage.filename}`
          );
          replacementsMade++;
        } else {
          console.warn(
            `[MATCH ${index}] Could not find image for: ${filename}`
          );
        }
      });
    }

    console.log(
      `Total replacements made: ${replacementsMade}/${matches.length}`
    );

    // If no replacements were made, check if HTML already has correct URLs
    if (replacementsMade === 0 && matches.length > 0) {
      const hasCorrectUrls = matches.some((match) =>
        match[1].includes(`/api/checksheet/templates/${templateId}/images/`)
      );
      if (hasCorrectUrls) {
        console.log("HTML already has correct image URLs");
      }
    }

    return processedHtml;
  };

  // Load template with proper pan/zoom state management
  const loadTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load template data
      const response = await axios.get(
        `${API_BASE_URL}/api/checksheet/templates/${templateId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.data.success) {
        const templateData = response.data.template;
        console.log("Template loaded:", templateData.name);
        console.log("Template has images:", templateData.images?.length || 0);

        setTemplate(templateData);

        // Remove all existing injected styles
        const existingStyles = document.querySelectorAll(
          'style[id^="excel-css"], style[id^="excel-css-"]'
        );
        existingStyles.forEach((style) => style.remove());

        // Inject the saved CSS
        if (templateData.css_content && templateData.css_content.trim()) {
          injectExcelCSS(templateData.css_content);
          console.log("CSS injected");
        }

        // Load and process images
        const imageData = await loadTemplateImages();
        console.log(
          "Image data loaded:",
          Object.keys(imageData.imageMap).length
        );

        // Get HTML content
        let htmlContent = "";
        if (templateData.sheets && templateData.sheets.length > 0) {
          htmlContent =
            templateData.sheets[currentSheetIndex]?.html ||
            templateData.sheets[0]?.html ||
            templateData.html_content ||
            "";
        } else {
          htmlContent = templateData.html_content || "";
        }

        console.log("HTML content length:", htmlContent.length);

        // Process HTML to replace image placeholders
        const processedHtmlContent = processHtmlWithImages(
          htmlContent,
          imageData
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

        // Initialize sheet states
        const sheetCount = templateData.sheets?.length || 1;
        setSheetStates(Array(sheetCount).fill(null));

        console.log("Template loading complete");
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

  // Handle sheet tab switching with pan/zoom state preservation
  const handleSheetChange = (index) => {
    // Save current sheet state
    if (currentSheetIndex >= 0 && scalerRef.current) {
      setSheetStates((prev) => {
        const newStates = [...prev];
        newStates[currentSheetIndex] = {
          scale: scaleRef.current,
          translate: { ...translate.current },
        };
        return newStates;
      });
    }

    // Update sheet index
    setCurrentSheetIndex(index);

    // Load new sheet HTML
    if (template?.sheets && template.sheets[index]) {
      const sheetHtml =
        template.sheets[index]?.html || template.html_content || "";

      // Re-process images for this sheet
      const imageData = { imageMap: images, imagesByPosition: {} };
      const processedHtmlContent = processHtmlWithImages(sheetHtml, imageData);
      setProcessedHtml(processedHtmlContent);
    }
  };

  // Pan & Zoom logic with per-sheet state management
  useEffect(() => {
    const scaler = scalerRef.current;
    const container = containerRef.current;
    if (!scaler || !container || !template) return;

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

    // Apply transform
    scaler.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scaleRef.current})`;

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

      // Update sheet state
      setSheetStates((prev) => {
        const newStates = [...prev];
        newStates[currentSheetIndex] = {
          scale: newScale,
          translate: { ...translate.current },
        };
        return newStates;
      });
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

      // Update sheet state
      setSheetStates((prev) => {
        const newStates = [...prev];
        newStates[currentSheetIndex] = {
          scale: scaleRef.current,
          translate: { ...translate.current },
        };
        return newStates;
      });
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
  }, [template, currentSheetIndex, sheetStates]);

  const handleFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      // Always store as string (or null) so NumberField can control formatting
      [fieldName]: value === null || value === undefined ? "" : String(value),
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
        `${API_BASE_URL}/api/checksheet/submissions`,
        {
          template_id: templateId,
          user_id: userId,
          data: formData,
        },
        {
          headers: getAuthHeaders(),
        }
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

          if (!fieldConfig) {
            return;
          }

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

      // Handle image tags
      if (node.type === "tag" && node.name === "img") {
        const src = node.attribs?.src || "";

        // If it's already an API URL, leave it as is
        if (src.includes("/api/checksheet/templates/")) {
          return React.createElement("img", {
            ...node.attribs,
            key: `img-${src}-${Math.random()}`,
          });
        }

        // If it's a placeholder, try to find the image
        if (src.includes("IMAGE_PLACEHOLDER:")) {
          const filename = src
            .split("IMAGE_PLACEHOLDER:")[1]
            .replace(/["']/g, "");
          const image = Object.values(images).find(
            (img) =>
              img.filename === filename ||
              img.filename.includes(filename) ||
              filename.includes(img.filename)
          );

          if (image) {
            return React.createElement("img", {
              ...node.attribs,
              src: image.url,
              key: `img-${image.id}`,
              alt: image.filename,
            });
          }
        }

        // Return original img tag
        return React.createElement("img", {
          ...node.attribs,
          key: `img-${src}-${Math.random()}`,
        });
      }

      // Handle VML imagedata tags (Excel specific)
      if (node.type === "tag" && node.name === "v:imagedata") {
        const src = node.attribs?.src || "";

        // Try to match VML image
        for (const [originalPath, imageData] of Object.entries(images)) {
          if (src.includes(imageData.filename)) {
            // Convert VML to regular img tag
            return React.createElement("img", {
              src: imageData.url,
              alt: imageData.filename,
              style: {
                width: node.attribs?.style?.width || "auto",
                height: node.attribs?.style?.height || "auto",
              },
              key: `vml-img-${imageData.id}`,
            });
          }
        }
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
      bg_color_below_min: bgColorBelowMin = "#e3f2fd",
      bg_color_above_max: bgColorAboveMax = "#ffebee",
      border_color_in_range: borderColorInRange = "#cccccc",
      border_color_below_min: borderColorBelowMin = "#2196f3",
      border_color_above_max: borderColorAboveMax = "#f44336",
      position: fieldPosition = "",
      formula, // This should come from fieldConfig if available
      required, // Add this if needed
      // NEW: Extract date format props from database
      date_format: dateFormat = "yyyy-MMMM-dd",
      show_time_select: showTimeSelect = false,
      time_format: timeFormat = "HH:mm",
      min_date: minDate,
      max_date: maxDate,
    } = fieldConfig;

    const getBackgroundColor = (val) => {
      // Handle empty values
      if (!val || val === "") {
        return bgColorInRange || bg_color;
      }

      // Exact match check (for text fields)
      if (exactMatchText && val.trim() === exactMatchText.trim()) {
        return exactMatchBgColor || "#d4edda";
      }

      // Length validation (for text fields)
      if (minLength && val.length < minLength) return minLengthWarningBg;
      if (maxLength && val.length > maxLength) return maxLengthWarningBg;

      // Number validation
      if (type === "number" && val) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          // Convert min/max to numbers if they're strings
          const minNum = min != null ? parseFloat(min) : null;
          const maxNum = max != null ? parseFloat(max) : null;

          // Check if below minimum
          if (minNum !== null && !isNaN(minNum) && num < minNum) {
            return bgColorBelowMin || "#e3f2fd";
          }

          // Check if above maximum
          if (maxNum !== null && !isNaN(maxNum) && num > maxNum) {
            return bgColorAboveMax || "#ffebee";
          }

          // Value is in range
          return bgColorInRange || bg_color;
        }
      }

      // Default: use bgColorInRange if available, otherwise bg_color
      return bgColorInRange || bg_color;
    };

    const getBorderColor = (val) => {
      // Handle empty values
      if (!val || val === "") {
        return borderColorInRange || "#cccccc";
      }

      // Exact match check (for text fields) - use in-range border
      if (exactMatchText && val.trim() === exactMatchText.trim()) {
        return borderColorInRange || "#cccccc";
      }

      // Length validation (for text fields) - use in-range border
      if (minLength && val.length < minLength)
        return borderColorInRange || "#cccccc";
      if (maxLength && val.length > maxLength)
        return borderColorInRange || "#cccccc";

      // Number validation
      if (type === "number" && val) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          // Convert min/max to numbers if they're strings
          const minNum = min != null ? parseFloat(min) : null;
          const maxNum = max != null ? parseFloat(max) : null;

          // Check if below minimum
          if (minNum !== null && !isNaN(minNum) && num < minNum) {
            return borderColorBelowMin || "#2196f3";
          }

          // Check if above maximum
          if (maxNum !== null && !isNaN(maxNum) && num > maxNum) {
            return borderColorAboveMax || "#f44336";
          }

          // Value is in range
          return borderColorInRange || "#cccccc";
        }
      }

      // Default: use borderColorInRange
      return borderColorInRange || "#cccccc";
    };

    const commonProps = {
      value: value || "",
      onChange: (e) => handleFieldChange(fieldName, e.target.value),
      placeholder: label,
      style: {
        backgroundColor: getBackgroundColor(value),
        color: text_color,
        border: `1px solid ${getBorderColor(value)}`,
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

      if (type === "calculation" && formula) {
        parts.push(`<strong>Formula:</strong> ${formula}`);
      }

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
        console.log("Number field config:", {
          fieldName,
          decimalPlaces,
          value,
          fieldConfig,
        });

        const numberField = (
          <NumberField
            label={label}
            name={fieldName}
            value={value || null}
            onChange={(name, val) => handleFieldChange(name, val)}
            decimalPlaces={decimalPlaces}
            min={min}
            max={max}
            bgColorInRange={bgColorInRange || bg_color}
            bgColorBelowMin={bgColorBelowMin}
            bgColorAboveMax={bgColorAboveMax}
            borderColorInRange={borderColorInRange}
            borderColorBelowMin={borderColorBelowMin}
            borderColorAboveMax={borderColorAboveMax}
          />
        );
        return renderFieldWithTooltip(numberField);

      case "image":
        const imageField = (
          <ImageField
            label={label}
            name={fieldName}
            value={value || ""}
            onChange={(name, imageData) => handleFieldChange(name, imageData)}
            height={150}
            allowCamera={fieldConfig.allow_camera !== false}
            allowUpload={fieldConfig.allow_upload !== false}
            allowDrawing={fieldConfig.allow_drawing !== false}
            allowCropping={fieldConfig.allow_cropping !== false}
            maxFileSize={fieldConfig.max_file_size || 5}
            aspectRatio={fieldConfig.aspect_ratio}
            required={fieldConfig.required || false}
          />
        );
        return renderFieldWithTooltip(imageField);

      case "date":
        const dateField = (
          <DateField
            label={label}
            name={fieldName}
            value={value || ""} // ISO string like "2026-01-03"
            onChange={(name, dateString) => handleFieldChange(name, dateString)}
            height={38}
            // PASS THE DATE FORMAT PROPS FROM DATABASE
            dateFormat={dateFormat || "yyyy-MMMM-dd"}
            showTimeSelect={showTimeSelect || false}
            timeFormat={timeFormat || "HH:mm"}
            minDate={minDate || ""}
            maxDate={maxDate || ""}
          />
        );
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

      case "calculation":
        const calculationField = (
          <CalculationField
            label={label}
            name={fieldName}
            value={value}
            onChange={(name, val, fieldType, fieldLabel) => {
              // CalculationField sends 4 args, but FormFiller expects just (name, value)
              handleFieldChange(name, val);
            }}
            formula={formula}
            decimalPlaces={decimalPlaces || 0}
            formData={formData}
            fieldPosition={fieldPosition}
            fieldValueMap={fieldValueMap}
            allFields={allFields}
          />
        );
        return renderFieldWithTooltip(calculationField);

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
              onClick={() => handleSheetChange(index)}
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
