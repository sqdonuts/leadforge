const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Search endpoint working",
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;