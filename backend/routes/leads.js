const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Leads endpoint working",
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;