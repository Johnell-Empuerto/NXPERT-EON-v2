const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const pool = require("../../db"); // ✅ SAME STYLE AS YOUR EXAMPLE

// ==============================
// Multer Configuration
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/checksheets/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "template-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ==============================
// 1. CREATE TEMPLATE (UPLOAD IMAGE)
// ==============================
router.post("/templates", upload.single("image"), async (req, res) => {
  const { name, width, height } = req.body;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image is required",
    });
  }

  const imageUrl = `/uploads/checksheets/${req.file.filename}`;

  try {
    const result = await pool.query(
      `
      INSERT INTO checksheet_templates
      (name, image_url, width_px, height_px)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, imageUrl, width, height]
    );

    res.json({
      success: true,
      template: result.rows[0],
    });
  } catch (err) {
    console.error("Create template error:", err.message);
    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

// ==============================
// 2. SAVE FIELD POSITIONS (MAP)
// ==============================
router.post("/templates/:id/fields", async (req, res) => {
  const { id } = req.params;
  const { fields } = req.body;

  if (!Array.isArray(fields)) {
    return res.status(400).json({
      success: false,
      message: "Fields must be an array",
    });
  }

  try {
    // Remove existing fields
    await pool.query("DELETE FROM template_fields WHERE template_id = $1", [
      id,
    ]);

    // Insert new fields
    for (const field of fields) {
      await pool.query(
        `
        INSERT INTO template_fields
        (
          template_id,
          field_name,
          field_type,
          label,
          position_top,
          position_left,
          width_percent,
          height_percent
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          id,
          field.fieldName,
          field.fieldType,
          field.label,
          field.position.top,
          field.position.left,
          field.position.width,
          field.position.height,
        ]
      );
    }

    res.json({
      success: true,
      message: "Fields saved successfully",
    });
  } catch (err) {
    console.error("Save fields error:", err.message);
    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

// ==============================
// 3. GET TEMPLATE WITH FIELDS
// ==============================
router.get("/templates/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const templateRes = await pool.query(
      "SELECT * FROM checksheet_templates WHERE id = $1",
      [id]
    );

    if (templateRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const fieldsRes = await pool.query(
      "SELECT * FROM template_fields WHERE template_id = $1",
      [id]
    );

    res.json({
      success: true,
      template: {
        ...templateRes.rows[0],
        fields: fieldsRes.rows,
      },
    });
  } catch (err) {
    console.error("Get template error:", err.message);
    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

// ==============================
// 4. SUBMIT CHECKSHEET DATA
// ==============================
router.post("/submissions", async (req, res) => {
  const { template_id, user_id, data } = req.body;

  if (!template_id || !user_id || !data) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO checksheet_submissions
      (template_id, user_id, submission_data)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [template_id, user_id, JSON.stringify(data)]
    );

    res.json({
      success: true,
      submission: result.rows[0],
    });
  } catch (err) {
    console.error("Submit data error:", err.message);
    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});

module.exports = router;
