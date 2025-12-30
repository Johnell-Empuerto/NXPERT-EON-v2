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
        defaultValue: 2,
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
    // NEW: Calculation field
    label: "Calculation",
    component: CalculationField,
    defaultValue: "",
    supportsHeight: true,
    readOnly: true, // Calculated fields are read-only
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
        placeholder: "Enter formula like: S1F1 + S1F2",
        required: true,
      },
      {
        name: "decimalPlaces",
        type: "number",
        label: "Decimal Places (for result)",
        min: 0,
        max: 10,
        defaultValue: 2,
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
