const Book = require('../models/Book.model');
const logger = require('../utils/logger');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
exports.getAllBooks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      featured,
      search,
      sort = '-createdAt',
      minPrice,
      maxPrice,
      status = 'active'
    } = req.query;

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (featured === 'true') query.featured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) query.$text = { $search: search };

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const sortOptions = sort.split(',').join(' ');

    const [books, total] = await Promise.all([
      Book.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      Book.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        books,
        total,
        page: pageNum,
        totalPages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    logger.error(`Erreur récupération livres: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des livres' });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ status: 'error', message: 'Livre non trouvé' });
    }
    book.metadata.views += 1;
    await book.save();
    res.status(200).json({ status: 'success', data: { book } });
  } catch (error) {
    logger.error(`Erreur récupération livre: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération du livre' });
  }
};

// @desc    Create book
// @route   POST /api/books
// @access  Private/Admin
exports.createBook = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const book = await Book.create(req.body);
    res.status(201).json({ status: 'success', data: { book } });
  } catch (error) {
    logger.error(`Erreur création livre: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Un livre avec cet ISBN existe déjà' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages.join(', ') });
    }
    res.status(500).json({ status: 'error', message: 'Erreur lors de la création du livre' });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private/Admin
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!book) {
      return res.status(404).json({ status: 'error', message: 'Livre non trouvé' });
    }
    res.status(200).json({ status: 'success', data: { book } });
  } catch (error) {
    logger.error(`Erreur mise à jour livre: ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ status: 'error', message: messages.join(', ') });
    }
    res.status(500).json({ status: 'error', message: 'Erreur lors de la mise à jour du livre' });
  }
};

// @desc    Delete book (soft delete)
// @route   DELETE /api/books/:id
// @access  Private/Admin
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ status: 'error', message: 'Livre non trouvé' });
    }
    book.status = 'discontinued';
    await book.save();
    res.status(200).json({ status: 'success', message: 'Livre désactivé avec succès' });
  } catch (error) {
    logger.error(`Erreur suppression livre: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la suppression du livre' });
  }
};

// @desc    Get book categories
// @route   GET /api/books/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Book.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.status(200).json({ status: 'success', data: { categories } });
  } catch (error) {
    logger.error(`Erreur récupération catégories: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des catégories' });
  }
};

// @desc    Get featured books
// @route   GET /api/books/featured
// @access  Public
exports.getFeaturedBooks = async (req, res) => {
  try {
    const books = await Book.find({ featured: true, status: 'active' })
      .limit(8)
      .sort('-createdAt');
    res.status(200).json({ status: 'success', data: { books } });
  } catch (error) {
    logger.error(`Erreur récupération livres en vedette: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la récupération des livres en vedette' });
  }
};

// @desc    Update book stock
// @route   PUT /api/books/:id/stock
// @access  Private/Admin
exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ status: 'error', message: 'Livre non trouvé' });
    }
    await book.updateStock(quantity);
    res.status(200).json({ status: 'success', data: { book } });
  } catch (error) {
    logger.error(`Erreur mise à jour stock: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Erreur lors de la mise à jour du stock' });
  }
};