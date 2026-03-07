const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, orderValidations } = require('../middleware/validation.middleware');

// Protected routes
router.use(protect);

// User routes
router.get('/my-orders', ordersController.getMyOrders);
router.get('/:id', ordersController.getOrder);
router.post('/', validate(orderValidations.create), ordersController.createOrder);

// Admin routes
router.use(authorize('admin'));
router.get('/', ordersController.getAllOrders);
router.get('/stats', ordersController.getOrderStats);
router.put('/:id/status', ordersController.updateOrderStatus);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Gestion des commandes
 */

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Récupérer les commandes de l'utilisateur
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des commandes
 */


module.exports = router;


