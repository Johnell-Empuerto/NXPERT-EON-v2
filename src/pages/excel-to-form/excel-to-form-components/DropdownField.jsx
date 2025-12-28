// fields/DropdownField.js
import React from "react";

const DropdownField = ({
  label,
  name,
  value = "",
  onChange,
  options = [],
  height = 38,
  onHeightChange,
}) => {
  return (
    <select
      className="form-select"
      style={{ height: `${height}px` }}
      value={value}
      onChange={(e) => onChange(name, e.target.value, "dropdown", label)}
    >
      <option value="" disabled>
        {label}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
};

export default DropdownField;
