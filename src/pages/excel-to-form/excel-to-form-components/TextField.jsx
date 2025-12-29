// fields/TextField.js
import React, { useEffect, useRef, useLayoutEffect } from "react";

const TextField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
  multiline = false, // NEW: true for <textarea>
  autoShrinkFont = true, // NEW: toggle font shrinking
}) => {
  const inputRef = useRef(null);
  const minFontSize = 8;
  const maxFontSize = 16;
  const defaultFontSize = 14;

  // Auto-resize textarea height when multiline
  useLayoutEffect(() => {
    if (multiline && inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = "auto"; // reset
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, multiline]);

  // Auto-shrink font size to fit content
  useEffect(() => {
    if (!inputRef.current || !autoShrinkFont) {
      if (inputRef.current) {
        inputRef.current.style.fontSize = `${defaultFontSize}px`;
      }
      return;
    }

    const element = inputRef.current;
    const isTextarea = multiline;
    const containerWidth = element.clientWidth - 20; // padding
    const containerHeight = height;

    const text = value || label || "";
    if (!text) {
      element.style.fontSize = `${defaultFontSize}px`;
      return;
    }

    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = isTextarea ? "pre-wrap" : "nowrap";
    span.style.wordWrap = "break-word";
    span.style.width = isTextarea ? `${containerWidth}px` : "auto";
    span.style.font = window.getComputedStyle(element).font;
    span.textContent = text || " ";
    document.body.appendChild(span);

    const textWidth = span.getBoundingClientRect().width;
    const textHeight = span.scrollHeight; // more accurate for wrapped text
    document.body.removeChild(span);

    let fontSize = defaultFontSize;

    if (textWidth > containerWidth || textHeight > containerHeight) {
      // For multiline: prioritize fitting height first
      if (isTextarea && textHeight > containerHeight) {
        fontSize = (containerHeight / textHeight) * defaultFontSize;
      }
      // Then width
      if (textWidth > containerWidth) {
        fontSize = Math.min(
          fontSize,
          (containerWidth / textWidth) * defaultFontSize
        );
      }
    }

    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    element.style.fontSize = `${fontSize}px`;
  }, [value, label, height, multiline, autoShrinkFont]);

  const commonProps = {
    ref: inputRef,
    placeholder: label,
    className: "form-input",
    value: value,
    onChange: (e) => onChange(name, e.target.value, "text", label),
    style: {
      height: multiline ? "auto" : `${height}px`,
      minHeight: multiline ? `${height}px` : undefined,
      fontSize: `${defaultFontSize}px`,
      padding: "8px 10px",
      boxSizing: "border-box",
      overflow: "hidden",
      resize: "none", // disable manual resize
      whiteSpace: multiline ? "pre-wrap" : "nowrap",
      textOverflow: "clip",
    },
  };

  if (multiline) {
    return <textarea {...commonProps} rows={1} />;
  }

  return <input type="text" {...commonProps} />;
};

export default TextField;
