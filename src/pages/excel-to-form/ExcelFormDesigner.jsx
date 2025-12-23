import React, { useState, useRef, useEffect } from "react";
import ExcelJS from "exceljs";

const ExcelFormDesigner = () => {
  const [cells, setCells] = useState([]);
  const [printArea, setPrintArea] = useState(null);
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margins, setMargins] = useState({
    top: 0.75,
    right: 0.75,
    bottom: 0.75,
    left: 0.75,
  });
  const containerRef = useRef(null);

  // Paper sizes in inches (width x height)
  const paperSizes = {
    A4: { width: 8.27, height: 11.69 },
    A3: { width: 11.69, height: 16.54 },
    Letter: { width: 8.5, height: 11 },
    Legal: { width: 8.5, height: 14 },
    A5: { width: 5.83, height: 8.27 },
    B4: { width: 9.84, height: 13.9 },
    B5: { width: 6.93, height: 9.84 },
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    const cellData = [];

    // Get print area if defined
    let printRange = null;
    if (sheet.pageSetup.printArea) {
      printRange =
        sheet.pageSetup.printArea.split("!")[1] || sheet.pageSetup.printArea;
      setPrintArea(printRange);
    }

    // Get paper size and orientation from Excel
    if (sheet.pageSetup.paperSize) {
      // Excel paper sizes mapping
      const excelPaperSizes = {
        9: "A4",
        8: "A3",
        1: "Letter",
        5: "Legal",
        11: "A5",
        12: "B5",
        13: "B4",
      };
      const paperKey = sheet.pageSetup.paperSize;
      if (excelPaperSizes[paperKey]) {
        setPaperSize(excelPaperSizes[paperKey]);
      }
    }

    if (sheet.pageSetup.orientation) {
      setOrientation(
        sheet.pageSetup.orientation === "landscape" ? "landscape" : "portrait"
      );
    }

    // Get margins if available
    if (sheet.pageSetup.margins) {
      const m = sheet.pageSetup.margins;
      setMargins({
        top: m.top || 0.75,
        right: m.right || 0.75,
        bottom: m.bottom || 0.75,
        left: m.left || 0.75,
      });
    }

    // Determine data range (either from print area or actual data)
    let startRow = 1;
    let startCol = 1;
    let endRow = sheet.rowCount;
    let endCol = sheet.columnCount;

    if (printRange) {
      // Parse print area range (e.g., "A1:D10")
      const rangeMatch = printRange.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (rangeMatch) {
        const [, startColLetter, startRowNum, endColLetter, endRowNum] =
          rangeMatch;
        startRow = parseInt(startRowNum);
        startCol = excelColumnToNumber(startColLetter);
        endRow = parseInt(endRowNum);
        endCol = excelColumnToNumber(endColLetter);
      }
    } else {
      // If no print area, find used range
      const dimensions = sheet.dimensions;
      if (dimensions) {
        startRow = dimensions.top;
        endRow = dimensions.bottom;
        startCol = dimensions.left;
        endCol = dimensions.right;
      }
    }

    // Calculate column widths and row heights
    const colWidths = [];
    const rowHeights = [];

    for (let colNum = startCol; colNum <= endCol; colNum++) {
      const col = sheet.getColumn(colNum);
      colWidths.push(col.width || 8.43); // Default Excel column width
    }

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = sheet.getRow(rowNum);
      rowHeights.push(row.height || 15); // Default Excel row height
    }

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = sheet.getRow(rowNum);
      const rowCells = [];

      for (let colNum = startCol; colNum <= endCol; colNum++) {
        const cell = row.getCell(colNum);
        rowCells.push({
          value: cell.value,
          style: cell.style,
          address: cell.address,
          row: rowNum,
          col: colNum,
          isPrintArea: true,
          rowHeight: row.height || 15,
          colWidth: sheet.getColumn(colNum).width || 8.43,
        });
      }
      cellData.push(rowCells);
    }

    setCells(cellData);
  };

  // Convert Excel column letters to numbers (A=1, B=2, etc.)
  const excelColumnToNumber = (column) => {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - "A".charCodeAt(0) + 1);
    }
    return result;
  };

  const getCellStyle = (cell) => {
    const style = {
      padding: "2px 5px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      fontFamily: "'Calibri', 'Arial', sans-serif",
      fontSize: "11px", // Default Excel font size
      minHeight: "20px",
      minWidth: "20px",
    };

    // Convert Excel width to pixels (Excel default: 1 unit = ~7.5px at 100% zoom)
    const excelToPx = (excelUnits) => {
      return `${excelUnits * 7.5}px`;
    };

    // Use actual column width if available
    if (cell.colWidth) {
      style.width = excelToPx(cell.colWidth);
    }

    // Use actual row height if available
    if (cell.rowHeight) {
      style.height = `${cell.rowHeight}px`;
    }

    // Font styling
    if (cell.style.font) {
      style.fontWeight = cell.style.font.bold ? "bold" : "normal";
      style.fontStyle = cell.style.font.italic ? "italic" : "normal";
      style.fontSize = cell.style.font.size
        ? `${cell.style.font.size}px`
        : "11px";

      if (cell.style.font.color && cell.style.font.color.argb) {
        const argb = cell.style.font.color.argb;
        style.color = `#${argb.length === 8 ? argb.slice(2) : argb}`;
      }

      if (cell.style.font.name) {
        style.fontFamily = cell.style.font.name;
      }
    }

    // Alignment
    if (cell.style.alignment) {
      const hAlign = cell.style.alignment.horizontal;
      if (hAlign) {
        style.justifyContent =
          hAlign === "center"
            ? "center"
            : hAlign === "right"
            ? "flex-end"
            : "flex-start";
        style.textAlign = hAlign;
      }

      if (cell.style.alignment.vertical) {
        style.alignItems =
          cell.style.alignment.vertical === "middle"
            ? "center"
            : cell.style.alignment.vertical === "bottom"
            ? "flex-end"
            : "flex-start";
      }

      if (cell.style.alignment.wrapText) {
        style.whiteSpace = "normal";
        style.wordBreak = "break-word";
      }
    }

    // Borders
    if (cell.style.border) {
      const border = cell.style.border;

      // Top border
      if (border.top && border.top.style && border.top.style !== "none") {
        style.borderTop = `1px solid #${
          border.top.color?.argb?.slice(2) || "000000"
        }`;
      }

      // Bottom border
      if (
        border.bottom &&
        border.bottom.style &&
        border.bottom.style !== "none"
      ) {
        style.borderBottom = `1px solid #${
          border.bottom.color?.argb?.slice(2) || "000000"
        }`;
      }

      // Left border
      if (border.left && border.left.style && border.left.style !== "none") {
        style.borderLeft = `1px solid #${
          border.left.color?.argb?.slice(2) || "000000"
        }`;
      }

      // Right border
      if (border.right && border.right.style && border.right.style !== "none") {
        style.borderRight = `1px solid #${
          border.right.color?.argb?.slice(2) || "000000"
        }`;
      }
    }

    // Background color
    if (
      cell.style.fill &&
      cell.style.fill.fgColor &&
      cell.style.fill.fgColor.argb
    ) {
      const argb = cell.style.fill.fgColor.argb;
      if (argb !== "FFFFFFFF") {
        // Not white
        style.backgroundColor = `#${argb.length === 8 ? argb.slice(2) : argb}`;
      }
    }

    // Number formatting
    if (cell.style.numFmt && cell.value) {
      // Basic number formatting
      if (typeof cell.value === "number") {
        if (cell.style.numFmt.includes("$")) {
          cell.value = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(cell.value);
        } else if (cell.style.numFmt.includes("%")) {
          cell.value = `${(cell.value * 100).toFixed(2)}%`;
        } else if (cell.style.numFmt.includes("0.00")) {
          cell.value = cell.value.toFixed(2);
        }
      }

      // Date formatting
      if (cell.value instanceof Date) {
        if (cell.style.numFmt.includes("m/d/yyyy")) {
          cell.value = cell.value.toLocaleDateString("en-US");
        } else if (cell.style.numFmt.includes("dd/mm/yyyy")) {
          cell.value = cell.value.toLocaleDateString("en-GB");
        }
      }
    }

    return style;
  };

  // Calculate container dimensions based on paper size
  const getPaperDimensions = () => {
    const size = paperSizes[paperSize];
    const isLandscape = orientation === "landscape";

    // Convert inches to pixels at 96 DPI (screen resolution)
    const widthInPx = (isLandscape ? size.height : size.width) * 96;
    const heightInPx = (isLandscape ? size.width : size.height) * 96;

    // Subtract margins
    const marginLeft = margins.left * 96;
    const marginRight = margins.right * 96;
    const marginTop = margins.top * 96;
    const marginBottom = margins.bottom * 96;

    return {
      width: widthInPx - marginLeft - marginRight,
      height: heightInPx - marginTop - marginBottom,
      marginTop,
      marginLeft,
      marginRight,
      marginBottom,
    };
  };

  const paperDim = getPaperDimensions();

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h2>Excel Form Designer - Print Preview</h2>

      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <div>
          <label>Upload Excel File: </label>
          <input type="file" accept=".xlsx, .xls" onChange={handleFile} />
        </div>

        {printArea && (
          <div
            style={{
              padding: "10px",
              backgroundColor: "#e8f4fd",
              borderRadius: "4px",
            }}
          >
            <strong>Print Area:</strong> {printArea}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <div>
            <label>Paper Size: </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              style={{ marginLeft: "5px", padding: "5px" }}
            >
              {Object.keys(paperSizes).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Orientation: </label>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              style={{ marginLeft: "5px", padding: "5px" }}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>
      </div>

      {cells.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 150px)",
          }}
        >
          <div
            style={{
              position: "relative",
              backgroundColor: "white",
              boxShadow: "0 0 20px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            {/* Paper shadow effect */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                right: "-10px",
                bottom: "-10px",
                backgroundColor: "rgba(0,0,0,0.1)",
                zIndex: -1,
                borderRadius: "2px",
              }}
            ></div>

            {/* Paper dimensions label */}
            <div
              style={{
                position: "absolute",
                top: "-30px",
                left: "0",
                fontSize: "12px",
                color: "#666",
                backgroundColor: "#fff",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            >
              {paperSize} ({orientation}) - {Math.round(paperDim.width)}px ×{" "}
              {Math.round(paperDim.height)}px
            </div>

            {/* Print area container */}
            <div
              ref={containerRef}
              style={{
                width: `${paperDim.width}px`,
                height: `${paperDim.height}px`,
                border: "1px solid #ccc",
                overflow: "auto",
                backgroundColor: "white",
                position: "relative",
                marginTop: `${paperDim.marginTop}px`,
                marginLeft: `${paperDim.marginLeft}px`,
              }}
            >
              {cells.map((row, i) => (
                <div key={i} style={{ display: "flex" }}>
                  {row.map((cell, j) => (
                    <div
                      key={j}
                      style={getCellStyle(cell)}
                      title={`${cell.address}: ${cell.value || "(empty)"}`}
                    >
                      {cell.value !== null && cell.value !== undefined
                        ? String(cell.value)
                        : ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Page border */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                border: "2px dashed #ccc",
                pointerEvents: "none",
                marginTop: `${paperDim.marginTop}px`,
                marginLeft: `${paperDim.marginLeft}px`,
              }}
            ></div>
          </div>
        </div>
      )}

      {cells.length === 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "400px",
            backgroundColor: "white",
            border: "2px dashed #ddd",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <div style={{ textAlign: "center", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>📄</div>
            <h3>Upload an Excel file to see the print preview</h3>
            <p>The print area will be automatically detected and displayed</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelFormDesigner;
