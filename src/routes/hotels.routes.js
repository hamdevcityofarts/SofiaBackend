const express = require('express');
const router = express.Router();
const hotelsController = require('../controllers/hotels.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', hotelsController.getAllHotels);
router.get('/:id', hotelsController.getHotel);
router.post('/:id/check-availability', hotelsController.checkAvailability);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.post('/', hotelsController.createHotel);
router.put('/:id', hotelsController.updateHotel);
router.delete('/:id', hotelsController.deleteHotel);
router.get('/stats', hotelsController.getHotelStats);

module.exports = router;
