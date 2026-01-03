// fieldRegistry.js

// Field components will be defined separately
import TextField from "../excel-to-form-components/TextField";
import NumberField from "../excel-to-form-components/NumberField";
import DateField from "../excel-to-form-components/DateField";
import CheckboxField from "../excel-to-form-components/CheckboxField";
import DropdownField from "../excel-to-form-components/DropdownField";
import CalculationField from "../excel-to-form-components/CalculationField"; // NEW

export const fieldRegistry = {
  // fieldRegistry.js - Update the 'text' entry
  text: {
    label: "Text",
    component: TextField,
    supportsHeight: true,
    editorFields: [
      { name: "label", type: "text", label: "Field Label", required: true },
      {
        name: "multiline",
        type: "checkbox",
        label: "Multiline (for comments/remarks)",
        defaultValue: false,
      },
      {
        name: "autoShrinkFont",
        type: "checkbox",
        label: "Auto-shrink font to fit text",
        defaultValue: true,
      },
      // General appearance
      {
        name: "bgColor",
        type: "color",
        label: "Background Color",
        defaultValue: "#ffffff",
      },
      {
        name: "textColor",
        type: "color",
        label: "Text Color",
        defaultValue: "#000000",
      },
      // Exact match conditional styling
      {
        name: "exactMatchText",
        type: "text",
        label: "If input exactly matches this text → change background",
        placeholder: 'e.g. "Approved", "Rejected", "Yes"',
      },
      {
        name: "exactMatchBgColor",
        type: "color",
        label: "Background when exact match",
        defaultValue: "#d4edda",
      },
      // Minimum length validation
      {
        name: "minLength",
        type: "number",
        label: "Minimum Characters",
        min: 0,
        placeholder: "Leave empty for no minimum",
      },
      {
        name: "minLengthMode",
        type: "select",
        label: "Min Length Behavior",
        options: [
          { value: "warning", label: "Warning (allow typing, show red bg)" },
          { value: "strict", label: "Strict (block typing beyond limit)" },
        ],
        defaultValue: "warning",
      },
      {
        name: "minLengthWarningBg",
        type: "color",
        label: "Background when below minimum",
        defaultValue: "#ffebee",
      },
      // NEW: Maximum length validation
      {
        name: "maxLength",
        type: "number",
        label: "Maximum Characters",
        min: 0,
        placeholder: "Leave empty for no maximum",
      },
      {
        name: "maxLengthMode",
        type: "select",
        label: "Max Length Behavior",
        options: [
          { value: "warning", label: "Warning (allow typing, show orange bg)" },
          { value: "strict", label: "Strict (block typing beyond limit)" },
        ],
        defaultValue: "warning",
      },
      {
        name: "maxLengthWarningBg",
        type: "color",
        label: "Background when above maximum",
        defaultValue: "#fff3cd",
      },
    ],
  },
  number: {
    label: "Number",
    component: NumberField,
    defaultValue: null,
    supportsHeight: true,
    editorFields: [
      {
        name: "label",
        type: "text",
        label: "Field Label",
        required: true,
      },
      {
        name: "decimalPlaces",
        type: "number",
        label: "Decimal Places",
        min: 0,
        max: 10,
        defaultValue: 0,
      },
      // NEW: Min/Max validation fields
      {
        name: "min",
        type: "number",
        label: "Minimum Value",
        placeholder: "Leave empty for no minimum",
      },
      {
        name: "max",
        type: "number",
        label: "Maximum Value",
        placeholder: "Leave empty for no maximum",
      },
      // User can customize ALL background colors
      {
        name: "bgColorInRange",
        type: "color",
        label: "Background Color (within range)",
        defaultValue: "#ffffff", // Default white
        placeholder: "#ffffff",
      },
      {
        name: "bgColorBelowMin",
        type: "color",
        label: "Background Color (below minimum)",
        defaultValue: "#e3f2fd", // Default light blue
        placeholder: "#e3f2fd",
      },
      {
        name: "bgColorAboveMax",
        type: "color",
        label: "Background Color (above maximum)",
        defaultValue: "#ffebee", // Default light red
        placeholder: "#ffebee",
      },
      // Optional: Customize border colors too
      {
        name: "borderColorInRange",
        type: "color",
        label: "Border Color (within range)",
        defaultValue: "#cccccc",
        placeholder: "#cccccc",
      },
      {
        name: "borderColorBelowMin",
        type: "color",
        label: "Border Color (below minimum)",
        defaultValue: "#2196f3",
        placeholder: "#2196f3",
      },
      {
        name: "borderColorAboveMax",
        type: "color",
        label: "Border Color (above maximum)",
        defaultValue: "#f44336",
        placeholder: "#f44336",
      },
    ],
  },
  // fieldRegistry.js - Update the date entry
  date: {
    label: "Date",
    component: DateField,
    defaultValue: "",
    supportsHeight: true,
    editorFields: [
      {
        name: "label",
        type: "text",
        label: "Field Label",
        required: true,
      },
      // NEW: Date format selection
      {
        name: "dateFormat",
        type: "select",
        label: "Date Format",
        options: [
          { value: "yyyy-MMMM-dd", label: "2026-January-03 (Full)" },
          { value: "yyyy-MM-dd", label: "2026-01-03 (ISO)" },
          { value: "dd/MM/yyyy", label: "03/01/2026 (European)" },
          { value: "MM/dd/yyyy", label: "01/03/2026 (US)" },
          { value: "MMMM d, yyyy", label: "January 3, 2026 (Long)" },
          { value: "dd-MMM-yy", label: "03-Jan-26 (Short)" },
          { value: "yyyy/MM/dd", label: "2026/01/03 (Slash)" },
          { value: "dd MMM yyyy", label: "03 Jan 2026 (Medium)" },
        ],
        defaultValue: "yyyy-MMMM-dd",
      },
      // Optional: Show time picker
      {
        name: "showTimeSelect",
        type: "checkbox",
        label: "Include Time Selection",
        defaultValue: false,
      },
      {
        name: "timeFormat",
        type: "select",
        label: "Time Format",
        options: [
          { value: "HH:mm", label: "24-hour (14:30)" },
          { value: "hh:mm aa", label: "12-hour (02:30 PM)" },
        ],
        defaultValue: "HH:mm",
        condition: (formData) => formData.showTimeSelect, // Only show if showTimeSelect is true
      },
      // Optional: Min/Max date validation
      {
        name: "minDate",
        type: "text",
        label: "Minimum Date (YYYY-MM-DD)",
        placeholder: "Leave empty for no minimum",
      },
      {
        name: "maxDate",
        type: "text",
        label: "Maximum Date (YYYY-MM-DD)",
        placeholder: "Leave empty for no maximum",
      },
    ],
  },
  checkbox: {
    label: "Checkbox",
    component: CheckboxField,
    defaultValue: false,
    supportsHeight: false,
    editorFields: [
      {
        name: "label",
        type: "text",
        label: "Field Label",
        required: true,
      },
    ],
  },
  dropdown: {
    label: "Dropdown",
    component: DropdownField,
    defaultValue: "",
    supportsHeight: true,
    editorFields: [
      {
        name: "label",
        type: "text",
        label: "Field Label",
        required: true,
      },
      {
        name: "options",
        type: "text",
        label: "Options (comma-separated)",
        placeholder: "Option1, Option2, Option3",
        required: true,
      },
    ],
  },
  calculation: {
    label: "Calculation",
    component: CalculationField,
    defaultValue: "",
    supportsHeight: true,
    readOnly: true,
    editorFields: [
      {
        name: "label",
        type: "text",
        label: "Field Label",
        required: true,
      },
      {
        name: "formula",
        type: "text",
        label: "Formula",
        placeholder: "Enter formula like: S1F1 + S1F2 or SUM(S1F4:S1F13)",
        required: true,
      },
      {
        name: "decimalPlaces",
        type: "number",
        label: "Decimal Places (for result)",
        min: 0,
        max: 10,
        defaultValue: 0,
      },
    ],
  },
};

// Helper function to get field type info
export const getFieldTypeInfo = (type) => {
  return fieldRegistry[type] || fieldRegistry.text;
};

// Helper to get all field type options for dropdown
export const getFieldTypeOptions = () => {
  return Object.entries(fieldRegistry).map(([value, config]) => ({
    value,
    label: config.label,
  }));
};
