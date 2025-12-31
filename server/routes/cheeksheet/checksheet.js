// checksheet.js - Updated API with proper field configuration saving
const express = require("express");
const router = express.Router();
const pool = require("../../db");

// ==============================
// PUBLISH FORM TEMPLATE (UPDATED)
// ==============================
router.post("/templates", async (req, res) => {
  const {
    name,
    html_content, // HTML with placeholders
    original_html_content, // Original HTML
    field_configurations,
    field_positions,
    sheets,
    form_values,
    css_content = "",
    images = {}, // Base64 images data
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: "Form name is required",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Insert template
    const templateRes = await client.query(
      `
      INSERT INTO checksheet_templates 
      (name, html_content, field_configurations, field_positions, sheets, css_content, original_html_content)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        name,
        html_content || "",
        field_configurations ? JSON.stringify(field_configurations) : null,
        field_positions ? JSON.stringify(field_positions) : null,
        sheets ? JSON.stringify(sheets) : null,
        css_content || "",
        original_html_content || "",
      ]
    );

    const templateId = templateRes.rows[0].id;

    // 2. Save images to template_images table
    const savedImages = {};
    if (images && Object.keys(images).length > 0) {
      for (const [originalPath, imageData] of Object.entries(images)) {
        try {
          const imageRes = await client.query(
            `
            INSERT INTO template_images 
            (template_id, original_path, filename, mime_type, image_data, size)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            `,
            [
              templateId,
              originalPath,
              imageData.filename,
              imageData.mimeType,
              imageData.base64,
              imageData.size,
            ]
          );

          const imageId = imageRes.rows[0].id;
          savedImages[originalPath] = imageId;

          console.log(`Saved image: ${imageData.filename} with ID: ${imageId}`);
        } catch (imgErr) {
          console.error(`Failed to save image ${originalPath}:`, imgErr);
          // Continue with other images
        }
      }
    }

    // 3. Update HTML to replace placeholders with API endpoints
    let processedHtml = html_content;
    if (Object.keys(savedImages).length > 0) {
      // Replace IMAGE_PLACEHOLDER:path with /api/checksheet/templates/:id/images/:imageId
      for (const [originalPath, imageId] of Object.entries(savedImages)) {
        const placeholderRegex = new RegExp(
          `src=["']IMAGE_PLACEHOLDER:${originalPath.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}["']`,
          "gi"
        );
        const imageUrl = `src="/api/checksheet/templates/${templateId}/images/${imageId}"`;
        processedHtml = processedHtml.replace(placeholderRegex, imageUrl);
      }
    }

    // Update the template with processed HTML
    await client.query(
      `UPDATE checksheet_templates SET html_content = $1 WHERE id = $2`,
      [processedHtml, templateId]
    );

    // 4. Create fields array from field_configurations
    const fields = [];

    if (field_configurations && Object.keys(field_configurations).length > 0) {
      Object.values(field_configurations).forEach((config) => {
        // Clean the label - remove HTML tags
        let cleanLabel = config.label || "";
        cleanLabel = cleanLabel.replace(/<\/?[^>]+(>|$)/g, "").trim();
        cleanLabel = cleanLabel.replace(/&[a-z]+;/g, "").trim();

        if (cleanLabel.length < 2) {
          cleanLabel = config.instanceId || `field_${Date.now()}`;
        }

        const fieldName = cleanLabel.replace(/\s+/g, "_").toLowerCase();

        fields.push({
          field_name: fieldName,
          field_type: config.type || "text",
          label: cleanLabel,
          decimal_places: config.decimalPlaces || null,
          options: config.options || null,
          bg_color: config.bgColor || "#ffffff",
          text_color: config.textColor || "#000000",
          exact_match_text: config.exactMatchText || null,
          exact_match_bg_color: config.exactMatchBgColor || "#d4edda",
          min_length: config.minLength || null,
          min_length_mode: config.minLengthMode || "warning",
          min_length_warning_bg: config.minLengthWarningBg || "#ffebee",
          max_length: config.maxLength || null,
          max_length_mode: config.maxLengthMode || "warning",
          max_length_warning_bg: config.maxLengthWarningBg || "#fff3cd",
          multiline: config.multiline || false,
          auto_shrink_font: config.autoShrinkFont !== false,
          min_value: config.min || null,
          max_value: config.max || null,
          bg_color_in_range: config.bgColorInRange || "#ffffff",
          bg_color_below_min: config.bgColorBelowMin || "#e3f2fd",
          bg_color_above_max: config.bgColorAboveMax || "#ffebee",
          border_color_in_range: config.borderColorInRange || "#cccccc",
          border_color_below_min: config.borderColorBelowMin || "#2196f3",
          border_color_above_max: config.borderColorAboveMax || "#f44336",
          formula: config.formula || null,
          position: config.position || null,
          instance_id: config.instanceId || null,
          sheet_index: config.sheetIndex || 0,
        });
      });
    }

    // 5. Create dynamic data table
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

    // 6. Save table name back to template
    await client.query(
      `UPDATE checksheet_templates SET table_name = $1 WHERE id = $2`,
      [tableName, templateId]
    );

    // 7. Save field metadata
    for (const field of fields) {
      await client.query(
        `
        INSERT INTO template_fields
        (
          template_id, field_name, field_type, label, decimal_places, options,
          bg_color, text_color, exact_match_text, exact_match_bg_color,
          min_length, min_length_mode, min_length_warning_bg,
          max_length, max_length_mode, max_length_warning_bg,
          multiline, auto_shrink_font,
          min_value, max_value, bg_color_in_range, bg_color_below_min, 
          bg_color_above_max, border_color_in_range, border_color_below_min, 
          border_color_above_max, formula, position, instance_id, sheet_index
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        )
        `,
        [
          templateId,
          field.field_name,
          field.field_type,
          field.label,
          field.decimal_places,
          field.options ? JSON.stringify(field.options) : null,
          field.bg_color,
          field.text_color,
          field.exact_match_text,
          field.exact_match_bg_color,
          field.min_length,
          field.min_length_mode,
          field.min_length_warning_bg,
          field.max_length,
          field.max_length_mode,
          field.max_length_warning_bg,
          field.multiline,
          field.auto_shrink_font,
          field.min_value,
          field.max_value,
          field.bg_color_in_range,
          field.bg_color_below_min,
          field.bg_color_above_max,
          field.border_color_in_range,
          field.border_color_below_min,
          field.border_color_above_max,
          field.formula,
          field.position,
          field.instance_id,
          field.sheet_index,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      template_id: templateId,
      saved_images: Object.keys(savedImages).length,
      message: "Form published successfully with images",
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
// GET TEMPLATE BY ID (with all configurations) - FIXED VERSION
// ==============================

router.get("/templates/:id/images/:imageId", async (req, res) => {
  const { id, imageId } = req.params;

  try {
    // First verify the template exists and image belongs to it
    const imageRes = await pool.query(
      `
      SELECT ti.mime_type, ti.image_data, ti.filename
      FROM template_images ti
      WHERE ti.id = $1 AND ti.template_id = $2
      `,
      [imageId, id]
    );

    if (imageRes.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const { mime_type, image_data, filename } = imageRes.rows[0];

    if (!image_data) {
      return res.status(404).json({ error: "Image data not found" });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(image_data, "base64");

    // Set headers
    res.setHeader("Content-Type", mime_type);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.setHeader("ETag", `"${imageId}-${buffer.length}"`);

    res.send(buffer);
  } catch (err) {
    console.error("Get image error:", err);
    res.status(500).json({ error: "Failed to load image" });
  }
});

// ==============================
// NEW: GET ALL IMAGES FOR TEMPLATE (optional)
// ==============================
router.get("/templates/:id/images", async (req, res) => {
  const { id } = req.params;

  try {
    const imagesRes = await pool.query(
      `
      SELECT id, original_path, filename, mime_type, size, created_at
      FROM template_images 
      WHERE template_id = $1
      ORDER BY filename
      `,
      [id]
    );

    res.json({
      success: true,
      images: imagesRes.rows,
      count: imagesRes.rows.length,
    });
  } catch (err) {
    console.error("Get images error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get images",
    });
  }
});

// ==============================
// UPDATE GET TEMPLATE BY ID ENDPOINT
// ==============================
router.get("/templates/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get template basic info
    const templateRes = await pool.query(
      `
      SELECT 
        id, name, html_content, field_configurations, 
        field_positions, sheets, table_name, created_at,
        css_content, original_html_content
      FROM checksheet_templates 
      WHERE id = $1
      `,
      [id]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Get all field configurations
    const fieldsRes = await pool.query(
      `
      SELECT 
        field_name, field_type, label, decimal_places, options,
        bg_color, text_color, exact_match_text, exact_match_bg_color,
        min_length, min_length_mode, min_length_warning_bg,
        max_length, max_length_mode, max_length_warning_bg,
        multiline, auto_shrink_font,
        min_value, max_value, bg_color_in_range, bg_color_below_min, 
        bg_color_above_max, border_color_in_range, border_color_below_min, 
        border_color_above_max, formula, position, instance_id, sheet_index
      FROM template_fields 
      WHERE template_id = $1 
      ORDER BY id
      `,
      [id]
    );

    // Get images count for this template
    const imagesRes = await pool.query(
      `SELECT COUNT(*) as image_count FROM template_images WHERE template_id = $1`,
      [id]
    );

    // Parse JSON fields
    const template = templateRes.rows[0];

    // Parse JSON data if it exists
    if (template.field_configurations) {
      try {
        template.field_configurations =
          typeof template.field_configurations === "string"
            ? JSON.parse(template.field_configurations)
            : template.field_configurations;
      } catch (e) {
        template.field_configurations = {};
      }
    } else {
      template.field_configurations = {};
    }

    if (template.field_positions) {
      try {
        template.field_positions =
          typeof template.field_positions === "string"
            ? JSON.parse(template.field_positions)
            : template.field_positions;
      } catch (e) {
        template.field_positions = {};
      }
    } else {
      template.field_positions = {};
    }

    if (template.sheets) {
      try {
        template.sheets =
          typeof template.sheets === "string"
            ? JSON.parse(template.sheets)
            : template.sheets;
      } catch (e) {
        template.sheets = [];
      }
    } else {
      template.sheets = [];
    }

    // Process field data
    const fields = fieldsRes.rows.map((field) => {
      const processedField = {
        field_name: field.field_name,
        field_type: field.field_type,
        label: field.label,
        decimal_places: field.decimal_places,
        options: field.options
          ? typeof field.options === "string"
            ? JSON.parse(field.options)
            : field.options
          : null,
        bg_color: field.bg_color,
        text_color: field.text_color,
        exact_match_text: field.exact_match_text,
        exact_match_bg_color: field.exact_match_bg_color,
        min_length: field.min_length,
        min_length_mode: field.min_length_mode,
        min_length_warning_bg: field.min_length_warning_bg,
        max_length: field.max_length,
        max_length_mode: field.max_length_mode,
        max_length_warning_bg: field.max_length_warning_bg,
        multiline: field.multiline,
        auto_shrink_font: field.auto_shrink_font,
        min_value: field.min_value,
        max_value: field.max_value,
        bg_color_in_range: field.bg_color_in_range,
        bg_color_below_min: field.bg_color_below_min,
        bg_color_above_max: field.bg_color_above_max,
        border_color_in_range: field.border_color_in_range,
        border_color_below_min: field.border_color_below_min,
        border_color_above_max: field.border_color_above_max,
        formula: field.formula,
        position: field.position,
        instance_id: field.instance_id,
        sheet_index: field.sheet_index,
      };

      return processedField;
    });

    res.json({
      success: true,
      template: {
        ...template,
        fields: fields,
        image_count: parseInt(imagesRes.rows[0].image_count) || 0,
      },
    });
  } catch (err) {
    console.error("Get template error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      details: err.message,
    });
  }
});

// Update the GET template endpoint:

router.get("/templates/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get template basic info INCLUDING CSS
    const templateRes = await pool.query(
      `
      SELECT 
        id, name, html_content, field_configurations, 
        field_positions, sheets, table_name, created_at,
        css_content  -- NEW: Include CSS
      FROM checksheet_templates 
      WHERE id = $1
      `,
      [id]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Get all field configurations
    const fieldsRes = await pool.query(
      `
      SELECT 
        field_name, field_type, label, decimal_places, options,
        bg_color, text_color, exact_match_text, exact_match_bg_color,
        min_length, min_length_mode, min_length_warning_bg,
        max_length, max_length_mode, max_length_warning_bg,
        multiline, auto_shrink_font,
        min_value, max_value, bg_color_in_range, bg_color_below_min, 
        bg_color_above_max, border_color_in_range, border_color_below_min, 
        border_color_above_max, formula, position, instance_id, sheet_index
      FROM template_fields 
      WHERE template_id = $1 
      ORDER BY id
      `,
      [id]
    );

    // Parse JSON fields
    const template = templateRes.rows[0];

    // Parse JSON data if it exists
    if (template.field_configurations) {
      try {
        template.field_configurations =
          typeof template.field_configurations === "string"
            ? JSON.parse(template.field_configurations)
            : template.field_configurations;
      } catch (e) {
        template.field_configurations = {};
      }
    } else {
      template.field_configurations = {};
    }

    if (template.field_positions) {
      try {
        template.field_positions =
          typeof template.field_positions === "string"
            ? JSON.parse(template.field_positions)
            : template.field_positions;
      } catch (e) {
        template.field_positions = {};
      }
    } else {
      template.field_positions = {};
    }

    if (template.sheets) {
      try {
        template.sheets =
          typeof template.sheets === "string"
            ? JSON.parse(template.sheets)
            : template.sheets;
      } catch (e) {
        template.sheets = [];
      }
    } else {
      template.sheets = [];
    }

    // Process field data
    const fields = fieldsRes.rows.map((field) => {
      const processedField = {
        field_name: field.field_name,
        field_type: field.field_type,
        label: field.label,
        decimal_places: field.decimal_places,
        options: field.options
          ? typeof field.options === "string"
            ? JSON.parse(field.options)
            : field.options
          : null,
        // All field settings
        bg_color: field.bg_color,
        text_color: field.text_color,
        exact_match_text: field.exact_match_text,
        exact_match_bg_color: field.exact_match_bg_color,
        min_length: field.min_length,
        min_length_mode: field.min_length_mode,
        min_length_warning_bg: field.min_length_warning_bg,
        max_length: field.max_length,
        max_length_mode: field.max_length_mode,
        max_length_warning_bg: field.max_length_warning_bg,
        multiline: field.multiline,
        auto_shrink_font: field.auto_shrink_font,
        min_value: field.min_value,
        max_value: field.max_value,
        bg_color_in_range: field.bg_color_in_range,
        bg_color_below_min: field.bg_color_below_min,
        bg_color_above_max: field.bg_color_above_max,
        border_color_in_range: field.border_color_in_range,
        border_color_below_min: field.border_color_below_min,
        border_color_above_max: field.border_color_above_max,
        formula: field.formula,
        position: field.position,
        instance_id: field.instance_id,
        sheet_index: field.sheet_index,
      };

      return processedField;
    });

    res.json({
      success: true,
      template: {
        ...template,
        fields: fields,
        // css_content is already included in template object
      },
    });
  } catch (err) {
    console.error("Get template error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      details: err.message,
    });
  }
});

// ==============================
// GET ALL TEMPLATES (for listing)
// ==============================
router.get("/templates", async (req, res) => {
  try {
    const templatesRes = await pool.query(
      "SELECT id, name, table_name, created_at FROM checksheet_templates ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      templates: templatesRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==============================
// SUBMIT DATA TO DYNAMIC TABLE (unchanged)
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

// ==============================
// GET SUBMISSIONS FOR A TEMPLATE
// ==============================
router.get("/templates/:id/submissions", async (req, res) => {
  const { id } = req.params;

  try {
    // Get template table name
    const templateRes = await pool.query(
      "SELECT table_name FROM checksheet_templates WHERE id = $1",
      [id]
    );

    if (templateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    }

    const tableName = templateRes.rows[0].table_name;

    // Get all submissions from the dynamic table
    const submissionsRes = await pool.query(
      `SELECT * FROM "${tableName}" ORDER BY submitted_at DESC`
    );

    // Get field metadata for better display
    const fieldsRes = await pool.query(
      "SELECT field_name, label, field_type FROM template_fields WHERE template_id = $1",
      [id]
    );

    const fieldMetadata = {};
    fieldsRes.rows.forEach((field) => {
      fieldMetadata[field.field_name] = {
        label: field.label,
        type: field.field_type,
      };
    });

    res.json({
      success: true,
      submissions: submissionsRes.rows,
      field_metadata: fieldMetadata,
    });
  } catch (err) {
    console.error("Get submissions error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get submissions",
      details: err.message,
    });
  }
});

// ==============================
// DELETE TEMPLATE
// ==============================
router.delete("/templates/:id", async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get template info
    const templateRes = await client.query(
      "SELECT table_name FROM checksheet_templates WHERE id = $1",
      [id]
    );

    if (templateRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const tableName = templateRes.rows[0].table_name;

    // 2. Delete dynamic table if exists
    if (tableName) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      } catch (dropError) {
        console.warn(`Could not drop table ${tableName}:`, dropError.message);
      }
    }

    // 3. Delete images (CASCADE will handle this, but explicit is better)
    await client.query("DELETE FROM template_images WHERE template_id = $1", [
      id,
    ]);

    // 4. Delete field configurations
    await client.query("DELETE FROM template_fields WHERE template_id = $1", [
      id,
    ]);

    // 5. Delete template
    await client.query("DELETE FROM checksheet_templates WHERE id = $1", [id]);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Template deleted successfully with all associated images",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete template error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
      details: err.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
