// fieldRegistry.js

// Field components will be defined separately
import TextField from "../excel-to-form-components/TextField";
import NumberField from "../excel-to-form-components/NumberField";
import DateField from "../excel-to-form-components/DateField";
import CheckboxField from "../excel-to-form-components/CheckboxField";
import DropdownField from "../excel-to-form-components/DropdownField";
import CalculationField from "../excel-to-form-components/CalculationField"; // NEW

export const fieldRegistry = {
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
    ],
  },
  // fieldRegistry.js (updated number field section)
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
