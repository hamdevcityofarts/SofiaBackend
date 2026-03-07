const Stripe = require('stripe');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.stripe = process.env.STRIPE_SECRET_KEY 
      ? new Stripe(process.env.STRIPE_SECRET_KEY)
      : null;
  }

  // Create payment intent for Stripe
  async createPaymentIntent(amount, currency = 'xaf', metadata = {}) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe non configuré');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };

    } catch (error) {
      logger.error(`Erreur création paiement Stripe: ${error.message}`);
      throw error;
    }
  }

  // Process mobile money payment (simplified - integrate with Flutterwave or similar)
  async processMobileMoney(amount, phone, provider = 'orange') {
    try {
      // This is a placeholder for mobile money integration
      // In production, integrate with Flutterwave, PayDunya, etc.
      
      logger.info(`Paiement mobile money simulé: ${amount} XAF via ${provider} à ${phone}`);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a mock transaction ID
      const transactionId = `MM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId,
        message: 'Paiement mobile money initié'
      };

    } catch (error) {
      logger.error(`Erreur paiement mobile money: ${error.message}`);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(paymentIntentId) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe non configuré');
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      };

    } catch (error) {
      logger.error(`Erreur vérification paiement: ${error.message}`);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentIntentId, amount = null) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe non configuré');
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined
      });

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100
      };

    } catch (error) {
      logger.error(`Erreur remboursement: ${error.message}`);
      throw error;
    }
  }

  // Webhook handler for Stripe
  async handleWebhook(payload, signature) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe non configuré');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          logger.info(`Paiement réussi: ${paymentIntent.id}`);
          // Update order status in database
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          logger.warn(`Paiement échoué: ${failedPayment.id}`);
          // Update order status to failed
          break;

        default:
          logger.info(`Événement Stripe non géré: ${event.type}`);
      }

      return { success: true };

    } catch (error) {
      logger.error(`Erreur webhook Stripe: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PaymentService();