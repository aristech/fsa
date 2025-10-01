import Stripe from 'stripe';
import { EnvSubscriptionService } from './env-subscription-service';

export class StripeService {
  private static stripe: Stripe;

  /**
   * Initialize Stripe with API key
   */
  static initialize() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  /**
   * Get Stripe instance
   */
  static getInstance(): Stripe {
    if (!this.stripe) {
      this.initialize();
    }
    return this.stripe;
  }

  /**
   * Create a Stripe customer
   */
  static async createCustomer(params: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    const stripe = this.getInstance();

    return await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        ...params.metadata,
        source: 'fsa_app',
      },
    });
  }

  /**
   * Update a Stripe customer
   */
  static async updateCustomer(
    customerId: string,
    params: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Customer> {
    const stripe = this.getInstance();

    return await stripe.customers.update(customerId, {
      ...params,
    });
  }

  /**
   * Create a subscription
   */
  static async createSubscription(params: {
    customerId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    const stripe = this.getInstance();
    const plan = EnvSubscriptionService.getPlan(params.planId);

    if (!plan) {
      throw new Error(`Invalid plan ID: ${params.planId}`);
    }

    // Create price ID based on plan and billing cycle
    const priceId = this.getPriceId(params.planId, params.billingCycle);

    return await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: priceId }],
      trial_period_days: params.trialPeriodDays,
      metadata: {
        planId: params.planId,
        billingCycle: params.billingCycle,
        ...params.metadata,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  /**
   * Update a subscription (change plan, billing cycle, etc.)
   */
  static async updateSubscription(
    subscriptionId: string,
    params: {
      planId?: string;
      billingCycle?: 'monthly' | 'yearly';
      prorate?: boolean;
      metadata?: Record<string, string>;
    }
  ): Promise<Stripe.Subscription> {
    const stripe = this.getInstance();

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];

    let updateParams: Stripe.SubscriptionUpdateParams = {
      metadata: params.metadata,
      proration_behavior: params.prorate ? 'create_prorations' : 'none',
    };

    // If changing plan or billing cycle, update the price
    if (params.planId || params.billingCycle) {
      const planId = params.planId || subscription.metadata?.planId || 'basic';
      const billingCycle = params.billingCycle || subscription.metadata?.billingCycle || 'monthly';
      const priceId = this.getPriceId(planId, billingCycle as 'monthly' | 'yearly');

      updateParams.items = [
        {
          id: currentItem.id,
          price: priceId,
        },
      ];

      updateParams.metadata = {
        ...updateParams.metadata,
        planId,
        billingCycle,
      };
    }

    return await stripe.subscriptions.update(subscriptionId, updateParams);
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    params: {
      immediately?: boolean;
      reason?: string;
    } = {}
  ): Promise<Stripe.Subscription> {
    const stripe = this.getInstance();

    if (params.immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: params.reason || 'user_requested',
        },
      });
    }
  }

  /**
   * Create a payment method setup intent
   */
  static async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    const stripe = this.getInstance();

    return await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
  }

  /**
   * List customer payment methods
   */
  static async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const stripe = this.getInstance();

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Detach a payment method
   */
  static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    const stripe = this.getInstance();

    return await stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Get upcoming invoice for a customer
   * TODO: Fix method name for latest Stripe API version
   */
  static async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice> {
    const stripe = this.getInstance();

    // @ts-ignore - TODO: Fix the method name for the latest Stripe API
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  }

  /**
   * List customer invoices
   */
  static async listInvoices(
    customerId: string,
    params: {
      limit?: number;
      startingAfter?: string;
    } = {}
  ): Promise<{ data: Stripe.Invoice[]; hasMore: boolean }> {
    const stripe = this.getInstance();

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: params.limit || 10,
      starting_after: params.startingAfter,
    });

    return {
      data: invoices.data,
      hasMore: invoices.has_more,
    };
  }

  /**
   * Get invoice PDF
   */
  static async getInvoicePdf(invoiceId: string): Promise<string> {
    const stripe = this.getInstance();

    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (!invoice.invoice_pdf) {
      throw new Error('Invoice PDF not available');
    }

    return invoice.invoice_pdf;
  }

  /**
   * Create a Stripe Checkout session for subscription
   */
  static async createCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getInstance();
    const plan = EnvSubscriptionService.getPlan(params.planId);

    if (!plan) {
      throw new Error(`Invalid plan ID: ${params.planId}`);
    }

    // Get price ID for the plan and billing cycle
    const priceId = this.getPriceId(params.planId, params.billingCycle);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        planId: params.planId,
        billingCycle: params.billingCycle,
        ...params.metadata,
      },
      subscription_data: {
        metadata: {
          planId: params.planId,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    };

    // Add trial period if specified
    if (params.trialPeriodDays && params.trialPeriodDays > 0) {
      sessionParams.subscription_data!.trial_period_days = params.trialPeriodDays;
    }

    // Use existing customer or create new one
    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    return await stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Create a billing portal session
   */
  static async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getInstance();

    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Construct webhook event
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string
  ): Stripe.Event {
    const stripe = this.getInstance();

    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }

  /**
   * Get price ID for plan and billing cycle
   * Uses real Stripe price IDs created by setup-stripe-products.js
   */
  private static getPriceId(planId: string, billingCycle: 'monthly' | 'yearly'): string {
    // Real Stripe price IDs created by the setup script
    const priceMap: Record<string, Record<string, string>> = {
      free: {
        monthly: 'price_free_monthly', // This won't be used since free plan doesn't need Stripe
        yearly: 'price_free_yearly',
      },
      basic: {
        monthly: 'price_1SCSVbFr5DGpT0mzZ3NPcvO5',
        yearly: 'price_1SCSVbFr5DGpT0mzU9EY4I5P',
      },
      premium: {
        monthly: 'price_1SCSVcFr5DGpT0mzogmGwgln',
        yearly: 'price_1SCSVcFr5DGpT0mzFgDnZdzr',
      },
      enterprise: {
        monthly: 'price_1SCSVdFr5DGpT0mzfjBDxWDY',
        yearly: 'price_1SCSVdFr5DGpT0mzUj4IRj36',
      },
    };

    const planPrices = priceMap[planId];
    if (!planPrices) {
      throw new Error(`No price mapping found for plan: ${planId}`);
    }

    const priceId = planPrices[billingCycle];
    if (!priceId) {
      throw new Error(`No price found for plan ${planId} with ${billingCycle} billing`);
    }

    return priceId;
  }

  /**
   * Get plan details from Stripe price ID
   */
  static getPlanFromPriceId(priceId: string): { planId: string; billingCycle: string } | null {
    // Reverse mapping from price ID to plan using real Stripe price IDs
    const priceToplanMap: Record<string, { planId: string; billingCycle: string }> = {
      price_1SCSVbFr5DGpT0mzZ3NPcvO5: { planId: 'basic', billingCycle: 'monthly' },
      price_1SCSVbFr5DGpT0mzU9EY4I5P: { planId: 'basic', billingCycle: 'yearly' },
      price_1SCSVcFr5DGpT0mzogmGwgln: { planId: 'premium', billingCycle: 'monthly' },
      price_1SCSVcFr5DGpT0mzFgDnZdzr: { planId: 'premium', billingCycle: 'yearly' },
      price_1SCSVdFr5DGpT0mzfjBDxWDY: { planId: 'enterprise', billingCycle: 'monthly' },
      price_1SCSVdFr5DGpT0mzUj4IRj36: { planId: 'enterprise', billingCycle: 'yearly' },
    };

    return priceToplanMap[priceId] || null;
  }

  /**
   * Create products and prices in Stripe (run this once during setup)
   */
  static async createStripeProducts(): Promise<void> {
    const stripe = this.getInstance();

    for (const [planId, plan] of Object.entries(EnvSubscriptionService.getAllPlans())) {
      if (planId === 'free') continue; // Skip free plan

      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          planId,
        },
      });

      // Create monthly price
      await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price.monthly * 100, // Stripe uses cents
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          planId,
          billingCycle: 'monthly',
        },
      });

      // Create yearly price
      await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price.yearly * 100, // Stripe uses cents
        currency: 'eur',
        recurring: {
          interval: 'year',
        },
        metadata: {
          planId,
          billingCycle: 'yearly',
        },
      });

      console.log(`✅ Created Stripe product and prices for ${plan.name}`);
    }
  }
}