const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const Book = require('../models/Book.model');
const Order = require('../models/Order.model');
const Hotel = require('../models/Hotel.model');
const { protect, authorize } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// All admin routes require admin role
router.use(protect);
router.use(authorize('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, booksCount, ordersCount, hotelsCount, revenueStats] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Order.countDocuments(),
      Hotel.countDocuments({ isActive: true }),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(new Date().setDate(new Date().getDate() - 30))] },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const recentOrders = await Order.find().sort('-createdAt').limit(5).populate('user', 'firstName lastName email');
    const lowStockBooks = await Book.find({ stock: { $lt: 10 }, status: 'active' }).limit(5).select('title stock price');

    res.status(200).json({
      status: 'success',
      data: { counts: { users: usersCount, books: booksCount, orders: ordersCount, hotels: hotelsCount }, revenue: revenueStats[0] || { totalRevenue: 0, monthlyRevenue: 0 }, recentOrders, lowStockBooks }
    });
  } catch (error) {
    logger.error(`Erreur statistiques admin: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des statistiques' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { email: new RegExp(search, 'i') },
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') }
    ];

    const usersQuery = User.find(query).select('-password').sort('-createdAt');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    usersQuery.skip(skip).limit(parseInt(limit));

    const [users, total] = await Promise.all([usersQuery, User.countDocuments(query)]);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages, hasNextPage: parseInt(page) < totalPages, hasPrevPage: parseInt(page) > 1 } }
    });
  } catch (error) {
    logger.error(`Erreur récupération utilisateurs: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'hotel_manager'].includes(role)) return res.status(400).json({ status: 'error', message: 'Rôle invalide' });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    logger.error(`Erreur mise à jour rôle utilisateur: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la mise à jour du rôle' });
  }
});

// PUT /api/admin/users/:id/toggle-active
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    logger.error(`Erreur basculement statut utilisateur: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors du changement de statut' });
  }
});

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Gestion administrative
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Statistiques globales (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Liste des utilisateurs avec filtres (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, hotel_manager]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Mettre à jour le rôle d'un utilisateur (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, hotel_manager]
 *     responses:
 *       200:
 *         description: Rôle mis à jour
 *       404:
 *         description: Utilisateur non trouvé
 */

/**
 * @swagger
 * /api/admin/users/{id}/toggle-active:
 *   put:
 *     summary: Activer/désactiver un utilisateur (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statut utilisateur changé
 *       404:
 *         description: Utilisateur non trouvé
 */


module.exports = router;
