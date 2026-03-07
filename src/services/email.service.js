const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const templates = {
  'welcome': (context) => ({
    subject: 'Bienvenue sur Sofia Smart Solutions',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Bienvenue ${context.name} !</h2>
        <p>Merci de vous être inscrit sur Sofia Smart Solutions.</p>
        <p>Vous pouvez maintenant accéder à tous nos services.</p>
        <a href="${process.env.FRONTEND_URL}" 
           style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
          Accéder à la plateforme
        </a>
      </div>
    `
  }),
  'reset-password': (context) => ({
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${context.name},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
        <a href="${context.resetLink}" 
           style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Ce lien expirera dans 30 minutes.
        </p>
      </div>
    `
  }),
  'order-confirmation': (context) => ({
    subject: `Confirmation de commande #${context.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Merci pour votre commande !</h2>
        <p>Bonjour ${context.name},</p>
        <p>Votre commande a été reçue et est en cours de traitement.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Détails de la commande</h3>
          <p><strong>Numéro de commande :</strong> ${context.orderNumber}</p>
          <p><strong>Date :</strong> ${context.orderDate}</p>
          <p><strong>Total :</strong> ${context.totalAmount} ${context.currency}</p>
        </div>
        
        <p>Nous vous tiendrons informé de l'avancement de votre commande.</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, context, html, text }) => {
  try {
    // In development, log email instead of sending
    if (process.env.NODE_ENV === 'development') {
      logger.info(`📧 Email à envoyer à ${to}: ${subject}`, { context });
      return { success: true, message: 'Email logged (development mode)' };
    }

    const transporter = createTransporter();

    // Get template if provided
    let emailContent = {};
    if (template && templates[template]) {
      emailContent = templates[template](context);
    }

    const mailOptions = {
      from: `"Sofia Smart Solutions" <${process.env.EMAIL_FROM}>`,
      to,
      subject: subject || emailContent.subject,
      html: html || emailContent.html,
      text: text || ''
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`📧 Email envoyé à ${to}: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    logger.error(`❌ Erreur envoi email à ${to}: ${error.message}`);
    throw new Error('Échec de l\'envoi de l\'email');
  }
};

module.exports = { sendEmail };