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

    // Build query
    const query = { status };

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const booksQuery = Book.find(query);

    // Sorting
    const sortOptions = sort.split(',').join(' ');
    booksQuery.sort(sortOptions);

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    booksQuery.skip(skip).limit(limitNum);

    // Get books and count
    const [books, total] = await Promise.all([
      booksQuery,
      Book.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        books,
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
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des livres'
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    // Increment views
    book.metadata.views += 1;
    await book.save();

    res.status(200).json({
      status: 'success',
      data: {
        book
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération livre: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du livre'
    });
  }
};

// @desc    Create book
// @route   POST /api/books
// @access  Private/Admin
exports.createBook = async (req, res) => {
  try {
    // Add createdBy field
    req.body.createdBy = req.user.id;

    const book = await Book.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        book
      }
    });

  } catch (error) {
    logger.error(`Erreur création livre: ${error.message}`);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du livre'
    });
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
      {
        new: true,
        runValidators: true
      }
    );

    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        book
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour livre: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du livre'
    });
  }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private/Admin
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    // Soft delete - change status to discontinued
    book.status = 'discontinued';
    await book.save();

    res.status(200).json({
      status: 'success',
      message: 'Livre désactivé avec succès'
    });

  } catch (error) {
    logger.error(`Erreur suppression livre: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la suppression du livre'
    });
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

    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération catégories: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des catégories'
    });
  }
};

// @desc    Get featured books
// @route   GET /api/books/featured
// @access  Public
exports.getFeaturedBooks = async (req, res) => {
  try {
    const books = await Book.find({
      featured: true,
      status: 'active'
    }).limit(8).sort('-createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        books
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération livres en vedette: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des livres en vedette'
    });
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
      return res.status(404).json({
        status: 'error',
        message: 'Livre non trouvé'
      });
    }

    await book.updateStock(quantity);

    res.status(200).json({
      status: 'success',
      data: {
        book
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour stock: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du stock'
    });
  }
};