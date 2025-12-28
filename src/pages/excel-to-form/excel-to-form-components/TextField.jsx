// fields/TextField.js
import React from "react";

const TextField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
}) => {
  return (
    <input
      type="text"
      placeholder={label}
      className="form-input"
      style={{ height: `${height}px` }}
      value={value}
      onChange={(e) => onChange(name, e.target.value, "text", label)}
    />
  );
};

export default TextField;
