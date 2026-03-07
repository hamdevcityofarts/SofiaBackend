const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, bookValidations } = require('../middleware/validation.middleware');

// Public routes
router.get('/', booksController.getAllBooks);
router.get('/categories', booksController.getCategories);
router.get('/featured', booksController.getFeaturedBooks);
router.get('/:id', booksController.getBook);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.post('/', validate(bookValidations.create), booksController.createBook);
router.put('/:id', validate(bookValidations.update), booksController.updateBook);
router.delete('/:id', booksController.deleteBook);
router.put('/:id/stock', booksController.updateStock);


/**
 * @swagger
 * tags:
 *   name: Books
 *   description: Gestion des livres
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Liste des livres
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Livres récupérés
 */

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Détails d'un livre
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Livre trouvé
 *       404:
 *         description: Livre non trouvé
 */


module.exports = router;
