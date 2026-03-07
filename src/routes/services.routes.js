const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/services.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', servicesController.getAllServices);
router.get('/categories', servicesController.getCategories);
router.get('/:id', servicesController.getService);
router.post('/:id/inquire', servicesController.submitInquiry);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.post('/', servicesController.createService);
router.put('/:id', servicesController.updateService);
router.delete('/:id', servicesController.deleteService);

module.exports = router;
