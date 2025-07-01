const AgriBooking = require("../models/AgriBooking");
const logActivity = require("../utils/activityLogger");

exports.createAgriBooking = async (req, res) => {
  try {
    const {
      weightKg,
      productType,
      specialRequest,
      perishable,
      needsRefrigeration,
      urgentDelivery,
      fromLocation,
      toLocation,
    } = req.body;

    const user = req.user?.uid || null; 

    if (!fromLocation || !toLocation || !weightKg || !productType) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    const requestId = req.body.requestId || 
      `AGR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const bookingData = {
      requestId,
      userId: user,
      weightKg,
      productType,
      specialRequest,
      perishable: !!perishable, 
      needsRefrigeration: !!needsRefrigeration,
      urgentDelivery: !!urgentDelivery,
      fromLocation,
      toLocation,
      status: 'pending',
    };

    const booking = await AgriBooking.create(bookingData);

    // Log activity
    await logActivity(req.user.uid, 'create_agri_booking', req);

    res.status(201).json({
      message: "AgriTRUK booking created successfully",
      booking
    });
  } catch (error) {
    console.error("Create agri booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to create agriTRUK booking"
    });
  }
};

exports.acceptAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transporterId, vehicleId } = req.body;
    const driverId = req.user.uid; 

    if (!transporterId || !vehicleId) {
      return res.status(400).json({ message: 'Transporter and vehicle IDs are required' });
    }

    const updates = await AgriBooking.acceptBooking(bookingId, transporterId, vehicleId);

    await logActivity(req.user.uid, 'accept_agri_booking', req);

    res.status(200).json({
      message: "Booking accepted successfully",
      booking: updates
    });
  } catch (error) {
    console.error("Accept booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to accept booking"
    });
  }
};

exports.getAgriBooking = async (req, res) => {
  try {
    console.log("Fetching agri booking with ID:", req.params.bookingId);
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await AgriBooking.get(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity(req.user.uid, 'get_agri_booking', req);

    res.status(200).json({
      message: "AgriTRUK booking retrieved successfully",
      booking
    });
  } catch (error) {
    console.error("Get agri booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to retrieve agriTRUK booking"
    });
  }
};

exports.getAgriBookings = async (req, res) => {
  try {
    const bookings = await AgriBooking.getAllBookings();

    await logActivity(req.user.uid, 'get_all_agri_bookings', req);

    res.status(200).json({
      message: "AgriTRUK bookings retrieved successfully",
      bookings
    });
  } catch (error) {
    console.error("Get all agri bookings error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to retrieve agriTRUK bookings"
    });
  }
};

exports.updateAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updates = req.body;

    if (!bookingId || !updates) {
      return res.status(400).json({ message: 'Booking ID and updates are required' });
    }

    const updatedBooking = await AgriBooking.update(bookingId, updates);

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity(req.user.uid, 'update_agri_booking', req);

    res.status(200).json({
      message: "AgriTRUK booking updated successfully",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Update agri booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to update agriTRUK booking"
    });
  }
};

exports.cancelAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const cancelled = await AgriBooking.cancelBooking(bookingId);

    if (!cancelled) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity(req.user.uid, 'cancel_agri_booking', req);

    res.status(200).json({
      message: "AgriTRUK booking cancelled successfully",
      booking: cancelled
    });
  } catch (error) {
    console.error("Cancel agri booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to cancel agriTRUK booking"
    });
  }
};

exports.startAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const started = await AgriBooking.startBooking(bookingId);

    if (!started) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity(req.user.uid, 'start_agri_booking', req);

    res.status(200).json({
      message: "AgriTRUK booking started successfully",
      booking: started
    });
  } catch (error) {
    console.error("Start agri booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to start agriTRUK booking"
    });
  }
};

exports.rejectAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const reason = req.body.reason || 'Unqualified';
    const result = await AgriBooking.rejectBooking(bookingId, reason);
    await logActivity(req.user.uid, 'reject_agri_booking', req);
    res.status(200).json({ message: 'AgriTRUK booking rejected', result });
  } catch (error) {
    console.error("Reject agri booking error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to reject agriTRUK booking" });
  }
};

exports.deleteAgriBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    await AgriBooking.delete(bookingId);
    await logActivity(req.user.uid, 'delete_agri_booking', req);
    res.status(200).json({ message: 'AgriTRUK booking deleted successfully' });
  } catch (error) {
    console.error("Delete agri booking error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to delete agriTRUK booking" });
  }
};

exports.getUserAgriBookings = async (req, res) => {
  try {
    const userId = req.user?.uid || null;
   
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    const bookings = await AgriBooking.getByUserId(userId);
    await logActivity(userId, 'get_user_agri_bookings', req);
    res.status(200).json({ message: "User's AgriTRUK bookings retrieved successfully", bookings });
  } catch (error) {
    console.error("Get user agri bookings error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to retrieve user's agriTRUK bookings" });
  }
};

exports.getTransporterAgriBookings = async (req, res) => {
  try {
    const transporterId = req.user?.uid || null;
    if (!transporterId) return res.status(400).json({ message: 'Transporter ID is required' });
    const bookings = await AgriBooking.getAllTransporterBookings(transporterId);
    await logActivity(transporterId, 'get_transporter_agri_bookings', req);
    res.status(200).json({ message: "Transporter's AgriTRUK bookings retrieved successfully", bookings });
  } catch (error) {
    console.error("Get transporter agri bookings error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to retrieve transporter's agriTRUK bookings" });
  }
};