const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ==============================
// PUBLISH FORM TEMPLATE
// ==============================
router.post("/templates", async (req, res) => {
  const { name, html_content } = req.body;

  if (!name || !html_content) {
    return res.status(400).json({
      success: false,
      message: "Form name and HTML content are required",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Insert template
    const templateRes = await client.query(
      `
      INSERT INTO checksheet_templates (name, html_content)
      VALUES ($1, $2)
      RETURNING id
      `,
      [name, html_content]
    );

    const templateId = templateRes.rows[0].id;

    // 2. Extract fields from placeholders
    const regex = /\{\{(\w+):([^:]+)(?::(\d+))?(?::([^}]+))?\}\}/g;
    const matches = [...html_content.matchAll(regex)];

    const fields = [];
    const uniqueLabels = new Set();

    for (const match of matches) {
      const [, typeRaw, labelRaw, decimalsRaw, optionsRaw] = match;
      const type = typeRaw.toLowerCase();
      const label = labelRaw.trim();

      if (uniqueLabels.has(label)) continue; // avoid duplicates
      uniqueLabels.add(label);

      const fieldName = label.replace(/\s+/g, "_").toLowerCase();
      const decimalPlaces = decimalsRaw ? parseInt(decimalsRaw) : null;
      const options = optionsRaw
        ? optionsRaw.split(",").map((o) => o.trim())
        : null;

      fields.push({
        field_name: fieldName,
        field_type: type,
        label,
        decimal_places: decimalPlaces,
        options,
      });
    }

    // 3. Create dynamic data table
    const tableName = `checksheet_data_${templateId}`;

    let createTableSQL = `
  CREATE TABLE "${tableName}" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usermaster(user_id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
`;

    for (const field of fields) {
      let columnType = "TEXT";
      switch (field.field_type) {
        case "number":
          columnType = field.decimal_places
            ? `NUMERIC(12, ${field.decimal_places})`
            : "NUMERIC";
          break;
        case "date":
          columnType = "DATE";
          break;
        case "checkbox":
          columnType = "BOOLEAN";
          break;
        case "text":
        case "dropdown":
        default:
          columnType = "TEXT";
      }

      const safeColName = field.field_name.replace(/"/g, '""');
      createTableSQL += `,\n        "${safeColName}" ${columnType}`;
    }

    createTableSQL += "\n      );";

    await client.query(createTableSQL);

    // 4. Save table name back to template
    await client.query(
      `UPDATE checksheet_templates SET table_name = $1 WHERE id = $2`,
      [tableName, templateId]
    );

    // 5. Save field metadata
    for (const field of fields) {
      await client.query(
        `
        INSERT INTO template_fields
        (template_id, field_name, field_type, label, decimal_places, options)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          templateId,
          field.field_name,
          field.field_type,
          field.label,
          field.decimal_places,
          field.options ? JSON.stringify(field.options) : null,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      template_id: templateId,
      message: "Form published successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Publish form error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to publish form",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

// ==============================
// GET TEMPLATE (for future editing/viewing)
// ==============================
router.get("/templates/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const templateRes = await pool.query(
      "SELECT id, name, html_content FROM checksheet_templates WHERE id = $1",
      [id]
    );

    if (templateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    const fieldsRes = await pool.query(
      "SELECT field_name, field_type, label, decimal_places, options FROM template_fields WHERE template_id = $1 ORDER BY id",
      [id]
    );

    res.json({
      success: true,
      template: {
        ...templateRes.rows[0],
        fields: fieldsRes.rows.map((f) => ({
          ...f,
          options: f.options ? JSON.parse(f.options) : null,
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==============================
// SUBMIT DATA TO DYNAMIC TABLE
// ==============================
router.post("/submissions", async (req, res) => {
  const { template_id, user_id, data } = req.body;

  if (!template_id || !user_id || !data || typeof data !== "object") {
    return res.status(400).json({
      success: false,
      message: "Invalid submission data",
    });
  }

  try {
    const templateRes = await pool.query(
      "SELECT table_name FROM checksheet_templates WHERE id = $1",
      [template_id]
    );

    if (templateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    const tableName = templateRes.rows[0].table_name;

    // Validate fields exist in template
    const fieldsRes = await pool.query(
      "SELECT field_name FROM template_fields WHERE template_id = $1",
      [template_id]
    );

    const validFields = new Set(fieldsRes.rows.map((r) => r.field_name));
    const submittedKeys = Object.keys(data);

    for (const key of submittedKeys) {
      if (!validFields.has(key)) {
        return res.status(400).json({
          success: false,
          message: `Invalid field: ${key}`,
        });
      }
    }

    // Build dynamic INSERT
    const columns = ["user_id", ...submittedKeys];
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const values = [user_id, ...submittedKeys.map((k) => data[k])];

    const safeCols = columns
      .map((c) => `"${c.replace(/"/g, '""')}"`)
      .join(", ");

    const query = `
      INSERT INTO "${tableName}" (${safeCols})
      VALUES (${placeholders})
      RETURNING id, submitted_at
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      submission_id: result.rows[0].id,
      submitted_at: result.rows[0].submitted_at,
    });
  } catch (err) {
    console.error("Submission error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to save submission" });
  }
});

module.exports = router;
