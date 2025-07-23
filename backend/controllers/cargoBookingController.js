const CargoBooking = require("../models/CargoBooking");
const { logActivity } = require("../utils/activityLogger");
const admin = require("../config/firebase");

exports.createCargoBooking = async (req, res) => {
  try {
    const {
      fromLocation,
      toLocation,
      weightKg,
      cargoType,
      cargoValue,
      specialRequest,
      special
    } = req.body;

    const userId = req.user?.uid || null;
    if (!fromLocation || !toLocation || !weightKg || !cargoType || !cargoValue) {
      return res.status(400).json({ 
        code: "ERR_MISSING_FIELDS", 
        message: "Required fields are missing" 
      });
    }
    const requestId = req.body.requestId || 
      `AGR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const bookingData = {
      requestId,
      userId,
      fromLocation,
      toLocation,
      weightKg,
      cargoType,
      cargoValue,
      specialRequest,
      special: !!special
    };
   
    const booking = await CargoBooking.create(bookingData);

    // Log activity
    await logActivity(req.user.uid, 'create_cargo_booking', req);

    res.status(201).json({
      message: "CargoTRUK booking created successfully",
      booking
    });
  } catch (error) {
    console.error("Create cargo booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to create cargoTRUK booking"
    });
  }
};

exports.getCargoBooking = async (req, res) => {
  try {
    const booking = await CargoBooking.get(req.params.bookingId);

    // Log the activity
    await logActivity(req.user.uid, 'get_cargo_booking', req);

    res.status(200).json({
      message: "CargoTRUK booking retrieved successfully",
      booking
    });
  } catch (error) {
    console.error('Error retrieving cargo booking:', error);
    if (error.message === 'CargoBooking not found') {
      return res.status(404).json({ message: 'CargoBooking not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateCargoBooking = async (req, res) => {
  try {
    const updated = await CargoBooking.update(req.params.bookingId, req.body);
    
    // Log the activity
    await logActivity(req.user.uid, 'update_cargo_booking', req);

    res.status(200).json({ message: 'CargoTRUK booking updated', updated });
  } catch (error) {
    console.error('Update cargo booking error:', error);
    res.status(500).json({ message: 'Failed to update cargoTRUK booking' });
  }
};

exports.acceptCargoBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transporterId, vehicleId } = req.body;
    if (!transporterId || !vehicleId) {
      return res.status(400).json({ message: 'Transporter and vehicle IDs are required' });
    } 
    const updates = await CargoBooking.acceptBooking(bookingId, transporterId, vehicleId);
    // Log the acceptance
    await logActivity(req.user.uid, 'accept_cargo_booking', req);
    res.status(200).json({
      message: "CargoTRUK booking accepted successfully",
      booking: updates
    }); 
  } catch (error) {
    console.error("Accept cargo booking error:", error);
    res.status(500).json({
      code: "ERR_SERVER_ERROR",
      message: "Failed to accept cargoTRUK booking"
    });
  }
};

exports.rejectCargoBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const reason = req.body.reason || 'Unqualified';
    const result = await CargoBooking.rejectBooking(bookingId, reason);
    
    // Log the rejection
    await logActivity(req.user.uid, 'reject_cargo_booking', req);

    res.status(200).json({ message: 'CargoTRUK booking rejected', result });
  } catch (error) {
    console.error('Reject cargo booking error:', error);
    res.status(500).json({ message: 'Failed to reject cargoTRUK booking' });
  }
};

exports.deleteCargoBooking = async (req, res) => {
  try {
    await CargoBooking.delete(req.params.bookingId);
    
    // Log the deletion
    await logActivity(req.user.uid, 'delete_cargo_booking', req);

    res.status(200).json({ message: 'CargoTRUK booking deleted successfully' });
  } catch (error) {
    console.error('Delete cargo booking error:', error);
    res.status(500).json({ message: 'Failed to delete cargoTRUK booking' });
  }
};

exports.getAllCargoBookings = async (req, res) => {
  try {
    const bookings = await CargoBooking.getAllBookings();
    
    // Log the retrieval
    await logActivity(req.user.uid, 'get_all_cargo_bookings', req);

    res.status(200).json({
      message: "All CargoTRUK bookings retrieved successfully",
      bookings
    });
  } catch (error) {
    console.error('Error retrieving all cargo bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUserCargoBookings = async (req, res) => {
  try {
    const userId = req.user?.uid || null;
    console.log('User ID:', userId);
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const bookings = await CargoBooking.getByUserId(userId);
    
    // Log the retrieval
    await logActivity(userId, 'get_user_cargo_bookings', req);

    res.status(200).json({
      message: "User's CargoTRUK bookings retrieved successfully",
      bookings
    });
  } catch (error) {
    console.error('Error retrieving user cargo bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getTransporterCargoBookings = async (req, res) => {
  try {
    const transporterId = req.user?.uid || null;
    if (!transporterId) {
      return res.status(400).json({ message: 'Transporter ID is required' });
    }
    
    const bookings = await CargoBooking.getByTransporterId(transporterId);
    // Log the retrieval
    await logActivity(transporterId, 'get_transporter_cargo_bookings', req);

    res.status(200).json({
      message: "Transporter's CargoTRUK bookings retrieved successfully",
      bookings
    });
  } catch (error) {
    console.error('Error retrieving transporter cargo bookings:', error); 
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.cancelCargoBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });
    const cancelled = await CargoBooking.cancelBooking(bookingId);
    if (!cancelled) return res.status(404).json({ message: 'Booking not found' });
    await logActivity(req.user.uid, 'cancel_cargo_booking', req);
    res.status(200).json({ message: "CargoTRUK booking cancelled successfully", booking: cancelled });
  } catch (error) {
    console.error("Cancel cargo booking error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to cancel cargoTRUK booking" });
  }
};

exports.startCargoBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });
    const started = await CargoBooking.startBooking(bookingId);
    if (!started) return res.status(404).json({ message: 'Booking not found' });
    await logActivity(req.user.uid, 'start_cargo_booking', req);
    res.status(200).json({ message: "CargoTRUK booking started successfully", booking: started });
  } catch (error) {
    console.error("Start cargo booking error:", error);
    res.status(500).json({ code: "ERR_SERVER_ERROR", message: "Failed to start cargoTRUK booking" });
  }
};