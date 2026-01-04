// src/excel-to-form-components/DateField.js
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateField = ({
  label,
  name,
  value = "",
  onChange,
  height = 38,
  onHeightChange,
  // NEW: Add format props
  dateFormat = "yyyy-MMMM-dd",
  showTimeSelect = false,
  DatetimeFormat = "HH:mm",
  minDate,
  maxDate,
}) => {
  // Convert value to Date object
  const selectedDate = value ? new Date(value) : null;

  // Parse min/max dates if provided
  const minDateObj = minDate ? new Date(minDate) : null;
  const maxDateObj = maxDate ? new Date(maxDate) : null;

  const handleDateChange = (date) => {
    let formattedValue = "";

    if (date) {
      if (showTimeSelect) {
        // For date-time: include time in ISO format
        formattedValue = date.toISOString();
      } else {
        // For date only: YYYY-MM-DD format
        formattedValue = date.toISOString().split("T")[0];
      }
    }

    onChange(name, formattedValue, "date", label);
  };

  // Combine date and time format if needed
  const displayFormat = showTimeSelect
    ? `${dateFormat} ${DatetimeFormat}`
    : dateFormat;

  return (
    <div
      className="datepicker-wrapper"
      style={{
        height: `${height}px`,
        position: "relative",
        width: "100%",
      }}
    >
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat={displayFormat}
        placeholderText={label ? `Select ${label}` : "Select date"}
        className="form-input"
        wrapperClassName="datepicker-full-width"
        popperPlacement="bottom-start"
        isClearable
        showYearDropdown
        scrollableYearDropdown
        yearDropdownItemNumber={20}
        autoComplete="off"
        // Additional props
        showTimeSelect={showTimeSelect}
        showTimeSelectOnly={false}
        timeIntervals={15}
        timeCaption="Time"
        minDate={minDateObj}
        maxDate={maxDateObj}
      />
    </div>
  );
};

export default DateField;
