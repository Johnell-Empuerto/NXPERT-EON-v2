// fields/CheckboxField.js
import React from "react";

const CheckboxField = ({ label, name, value = false, onChange }) => {
  return (
    <div className="checkbox-container">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(name, e.target.checked, "checkbox", label)}
        className="form-checkbox"
      />
    </div>
  );
};

export default CheckboxField;
