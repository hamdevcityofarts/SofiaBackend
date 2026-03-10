const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validate, bookValidations } = require('../middleware/validation.middleware');
const { upload, handleMulterError } = require('../config/multer');
const { uploadToCloudinary } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

// ── Routes publiques ──────────────────────────────────────────────────────────

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
 *     summary: Liste des livres avec filtres et pagination
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [digital, management, finance, marketing, leadership, technology, business]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, out_of_stock, discontinued, draft]
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche full-text dans titre, auteur, description
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: '-createdAt' }
 *     responses:
 *       200:
 *         description: Liste des livres récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     books: { type: array, items: { $ref: '#/components/schemas/Book' } }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     totalPages: { type: integer }
 *       500:
 *         description: Erreur serveur
 */
router.get('/', booksController.getAllBooks);

/**
 * @swagger
 * /api/books/categories:
 *   get:
 *     summary: Liste des catégories avec nombre de livres
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Catégories récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id: { type: string, example: digital }
 *                           count: { type: integer, example: 12 }
 *       500:
 *         description: Erreur serveur
 */
router.get('/categories', booksController.getCategories);

/**
 * @swagger
 * /api/books/featured:
 *   get:
 *     summary: Livres en vedette (max 8)
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Livres en vedette récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     books: { type: array, items: { $ref: '#/components/schemas/Book' } }
 *       500:
 *         description: Erreur serveur
 */
router.get('/featured', booksController.getFeaturedBooks);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Détails d'un livre (incrémente les vues)
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID MongoDB du livre
 *     responses:
 *       200:
 *         description: Livre trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     book: { $ref: '#/components/schemas/Book' }
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', booksController.getBook);

// ── Routes protégées (Admin uniquement) ───────────────────────────────────────
router.use(protect);
router.use(authorize('admin'));

/**
 * @swagger
 * /api/books/upload-image:
 *   post:
 *     summary: Upload une image de couverture vers Cloudinary
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image (JPG, PNG, WEBP, GIF — max 5 Mo)
 *     responses:
 *       200:
 *         description: Image uploadée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string, example: 'https://res.cloudinary.com/...' }
 *                     public_id: { type: string, example: 'sofia-smart-solutions/books/abc123' }
 *       400:
 *         description: Aucun fichier fourni ou format invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur upload Cloudinary
 */
router.post(
  '/upload-image',
  upload.single('image'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Aucun fichier fourni' });
      }

      const result = await uploadToCloudinary(req.file.path, {
        folder: 'sofia-smart-solutions/books',
        transformation: [
          { width: 600, height: 900, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });

      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erreur suppression fichier local:', err.message);
      });

      res.status(200).json({
        status: 'success',
        data: { url: result.url, public_id: result.public_id }
      });
    } catch (error) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      res.status(500).json({ status: 'error', message: error.message || 'Erreur upload image' });
    }
  }
);

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Créer un nouveau livre
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, author, description, price, stock, category, coverImage]
 *             properties:
 *               title:            { type: string, maxLength: 200 }
 *               author:           { type: string }
 *               description:      { type: string, maxLength: 2000 }
 *               shortDescription: { type: string, maxLength: 500 }
 *               price:            { type: number, minimum: 0 }
 *               stock:            { type: integer, minimum: 0 }
 *               category:
 *                 type: string
 *                 enum: [digital, management, finance, marketing, leadership, technology, business]
 *               coverImage:  { type: string, description: URL Cloudinary }
 *               isbn:        { type: string }
 *               publisher:   { type: string }
 *               pages:       { type: integer, minimum: 1 }
 *               formats:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Papier, PDF, EPUB, Audiobook]
 *               featured:    { type: boolean, default: false }
 *               status:
 *                 type: string
 *                 enum: [active, out_of_stock, discontinued, draft]
 *                 default: active
 *               tags:        { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Livre créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     book: { $ref: '#/components/schemas/Book' }
 *       400:
 *         description: Données invalides ou ISBN déjà existant
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.post('/', validate(bookValidations.create), booksController.createBook);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Mettre à jour un livre
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:            { type: string }
 *               author:           { type: string }
 *               description:      { type: string }
 *               shortDescription: { type: string }
 *               price:            { type: number }
 *               stock:            { type: integer }
 *               category:         { type: string }
 *               coverImage:       { type: string }
 *               isbn:             { type: string }
 *               publisher:        { type: string }
 *               pages:            { type: integer }
 *               formats:          { type: array, items: { type: string } }
 *               featured:         { type: boolean }
 *               status:           { type: string }
 *               tags:             { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Livre mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     book: { $ref: '#/components/schemas/Book' }
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id', validate(bookValidations.update), booksController.updateBook);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Désactiver un livre (soft delete — status → discontinued)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Livre désactivé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Livre désactivé avec succès }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', booksController.deleteBook);

/**
 * @swagger
 * /api/books/{id}/stock:
 *   put:
 *     summary: Mettre à jour le stock d'un livre
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: >
 *                   Quantité à ajouter (positif) ou retirer (négatif).
 *                   Le statut passe automatiquement à out_of_stock si stock ≤ 0.
 *                 example: 10
 *     responses:
 *       200:
 *         description: Stock mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     book: { $ref: '#/components/schemas/Book' }
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/:id/stock', booksController.updateStock);

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       properties:
 *         _id:              { type: string }
 *         title:            { type: string }
 *         author:           { type: string }
 *         description:      { type: string }
 *         shortDescription: { type: string }
 *         price:            { type: number }
 *         currency:         { type: string, enum: [XAF, EUR, USD] }
 *         stock:            { type: integer }
 *         category:         { type: string }
 *         coverImage:       { type: string }
 *         formats:          { type: array, items: { type: string } }
 *         rating:           { type: number }
 *         reviewsCount:     { type: integer }
 *         featured:         { type: boolean }
 *         isbn:             { type: string }
 *         pages:            { type: integer }
 *         publisher:        { type: string }
 *         status:
 *           type: string
 *           enum: [active, out_of_stock, discontinued, draft]
 *         tags:             { type: array, items: { type: string } }
 *         metadata:
 *           type: object
 *           properties:
 *             views:      { type: integer }
 *             purchases:  { type: integer }
 *             clicks:     { type: integer }
 *             addedToCart:{ type: integer }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

module.exports = router;