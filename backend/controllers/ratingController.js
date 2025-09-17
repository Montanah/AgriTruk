const Rating = require("../models/Rating");
const { logActivity, logAdminActivity } = require("../utils/activityLogger");
const Notification = require("../models/Notification");

exports.createRating = async (req, res) => {
  try {
    const { bookingId, transporterId, rating, comment } = req.body;

    if (!bookingId || !transporterId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const ratingDoc = await Rating.create({
      bookingId,
      transporterId,
      userId: req.user.uid,
      rating: Number(rating),
      comment
    });

    await logActivity(req.user.uid, "create_rating", req);

    await Notification.create({
      type: "Create Rating",
      message: `You rated a transporter. Transporter ID: ${transporterId}`,
      userId: req.user.uid,
      userType: "user",
    });

    res.status(201).json({ message: "Rating submitted", rating: ratingDoc });
  } catch (err) {
    console.error("Create rating error:", err);
    res.status(500).json({ message: "Failed to submit rating" });
  }
};

exports.getTransporterRatings = async (req, res) => {
  try {
    const { transporterId } = req.params;

    const ratings = await Rating.getAllForTransporter(transporterId);
    const avg = await Rating.getAverageForTransporter(transporterId);

    await logAdminActivity(req.user.uid, "get_transporter_ratings", req);

    res.status(200).json({ averageRating: avg, ratings });
  } catch (err) {
    console.error("Fetch ratings error:", err);
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
};
