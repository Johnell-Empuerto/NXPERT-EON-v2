// fields/DateField.js
import React from "react";

const DateField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
}) => {
  return (
    <input
      type="date"
      className="form-input"
      style={{ height: `${height}px` }}
      value={value}
      onChange={(e) => onChange(name, e.target.value, "date", label)}
    />
  );
};

export default DateField;
