const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    // Exécuter toutes les validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Formater les erreurs
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Erreur de validation',
      errors: formattedErrors
    });
  };
};

// Validations communes
const authValidations = {
  register: [
    body('email')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre')
  ],
  login: [
    body('email')
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Le mot de passe est requis')
  ]
};

// Déclare d'abord create
const bookCreateValidations = [
  body('title')
    .notEmpty().withMessage('Le titre est requis')
    .trim()
    .isLength({ max: 200 }).withMessage('Le titre ne peut pas dépasser 200 caractères'),
  body('author')
    .notEmpty().withMessage("L'auteur est requis")
    .trim(),
  body('description')
    .notEmpty().withMessage('La description est requise')
    .trim()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas dépasser 2000 caractères'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('stock')
    .isInt({ min: 0 }).withMessage('Le stock doit être un nombre positif'),
  body('category')
    .isIn(['digital', 'management', 'finance', 'marketing', 'leadership'])
    .withMessage('Catégorie invalide')
];

// Maintenant on peut créer bookValidations
const bookValidations = {
  create: bookCreateValidations,
  update: [
    param('id')
      .isMongoId().withMessage('ID de livre invalide'),
    ...bookCreateValidations.map(validation => validation.optional())
  ]
};

const orderValidations = {
  create: [
    body('items')
      .isArray({ min: 1 }).withMessage('Au moins un article est requis')
      .custom(items => items.every(item => 
        item.book && item.quantity && item.quantity > 0
      )).withMessage('Chaque article doit avoir un livre et une quantité valide'),
    body('shippingAddress')
      .isObject().withMessage('Adresse de livraison invalide')
  ]
};

module.exports = {
  validate,
  authValidations,
  bookValidations,
  orderValidations
};
