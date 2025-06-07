const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireRole = require("../middlewares/requireRole");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authController.logoutUser);

router.get("/profile", authenticateToken, authController.getUser);
router.put("/update", authenticateToken, authController.updateUser);
router.delete("/delete", authenticateToken, authController.deleteUser);
router.put("/update-password", authenticateToken, authController.updatePassword);

router.get("/admin-dashboard",
  authenticateToken,
  requireRole("admin"),
  (req, res) => {
    res.json({ message: "Admin access granted" });
  }
);

module.exports = router