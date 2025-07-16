const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const ratingController = require("../controllers/ratingController");
/**
 * @swagger
 * tags:
 *   - name: Ratings
 *     description: Ratings management
 */

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Submit a rating for a transporter
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - transporterId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: string
 *               transporterId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted successfully
 */
router.post("/", authenticateToken, ratingController.createRating);

/**
 * @swagger
 * /api/ratings/{transporterId}:
 *   get:
 *     summary: Get all ratings and average for a transporter
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: transporterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ratings with average
 */
router.get("/:transporterId", ratingController.getTransporterRatings);

module.exports = router;
