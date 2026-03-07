const User = require('../models/User.model');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/email.service');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    // Generate token
    const token = user.generateAuthToken();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Send verification email (optional)
    if (process.env.NODE_ENV === 'production') {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      await user.save();

      await sendEmail({
        to: user.email,
        subject: 'Vérifiez votre email - Sofia Smart Solutions',
        template: 'verify-email',
        context: {
          name: user.firstName || user.email,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    logger.error(`Erreur d'inscription: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'inscription'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Identifiants incorrects'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Compte verrouillé. Veuillez réessayer plus tard.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      
      const attemptsLeft = 5 - (user.loginAttempts + 1);
      
      return res.status(401).json({
        status: 'error',
        message: `Identifiants incorrects. ${attemptsLeft > 0 ? `${attemptsLeft} tentatives restantes` : 'Compte verrouillé.'}`
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    logger.error(`Erreur de connexion: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la connexion'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });

  } catch (error) {
    logger.error(`Erreur récupération profil: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.password;
    delete updates.role;
    delete updates.email;
    delete updates.isActive;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });

  } catch (error) {
    logger.error(`Erreur mise à jour profil: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Mot de passe mis à jour avec succès'
    });

  } catch (error) {
    logger.error(`Erreur changement mot de passe: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Aucun utilisateur trouvé avec cet email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe - Sofia Smart Solutions',
      template: 'reset-password',
      context: {
        name: user.firstName || user.email,
        resetLink: resetUrl
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Email de réinitialisation envoyé'
    });

  } catch (error) {
    logger.error(`Erreur mot de passe oublié: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'envoi de l\'email de réinitialisation'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token invalide ou expiré'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Mot de passe modifié - Sofia Smart Solutions',
      template: 'password-changed',
      context: {
        name: user.firstName || user.email
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    logger.error(`Erreur réinitialisation mot de passe: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // In production, you might want to implement token blacklisting
    
    res.status(200).json({
      status: 'success',
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error(`Erreur déconnexion: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la déconnexion'
    });
  }
};