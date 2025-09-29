import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Stripe from 'stripe';
import { StripeService } from "../services/stripe-service";
import { Tenant } from "../models/Tenant";
import { SubscriptionPlansService } from "../services/subscription-plans-service";

interface StripeWebhookRequest extends FastifyRequest {
  rawBody?: Buffer;
}

// ----------------------------------------------------------------------

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  // Add content type parser for Stripe webhooks
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: any, body: Buffer, done: any) => {
      // Store raw body for signature verification
      req.rawBody = body;
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err);
      }
    }
  );

  // Stripe webhook endpoint - no authentication required
  fastify.post(
    "/webhook",
    async (request: StripeWebhookRequest, reply: FastifyReply) => {
      try {
        const signature = request.headers['stripe-signature'] as string;
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!endpointSecret) {
          fastify.log.error('STRIPE_WEBHOOK_SECRET environment variable not set');
          return reply.status(500).send({ error: 'Webhook secret not configured' });
        }

        if (!signature) {
          fastify.log.error('Missing stripe-signature header');
          return reply.status(400).send({ error: 'Missing signature' });
        }

        // Construct the event using raw body
        const body = request.rawBody || request.body;
        const event = StripeService.constructWebhookEvent(
          body as string | Buffer,
          signature,
          endpointSecret
        );

        fastify.log.info({
          eventId: event.id,
          type: event.type,
        }, `Received Stripe webhook: ${event.type}`);

        // Handle the event
        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, fastify);
            break;

          case 'customer.subscription.created':
            await handleSubscriptionCreated(event.data.object as Stripe.Subscription, fastify);
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, fastify);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, fastify);
            break;

          case 'invoice.payment_succeeded':
            await handlePaymentSucceeded(event.data.object as Stripe.Invoice, fastify);
            break;

          case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object as Stripe.Invoice, fastify);
            break;

          case 'customer.subscription.trial_will_end':
            await handleTrialWillEnd(event.data.object as Stripe.Subscription, fastify);
            break;

          case 'setup_intent.succeeded':
            await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent, fastify);
            break;

          default:
            fastify.log.info(`Unhandled event type: ${event.type}`);
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        fastify.log.error(error as Error, 'Stripe webhook error');
        return reply.status(400).send({
          error: error instanceof Error ? error.message : 'Webhook processing failed',
        });
      }
    }
  );
}

// ----------------------------------------------------------------------
// Event Handlers
// ----------------------------------------------------------------------

/**
 * Handle checkout session completed
 * This is fired immediately when a customer successfully completes a checkout
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = session.customer as string;
    const planId = session.metadata?.planId;
    const billingCycle = session.metadata?.billingCycle as 'monthly' | 'yearly';
    const tenantId = session.metadata?.tenantId;

    // Enhanced logging for debugging
    fastify.log.info({
      sessionId: session.id,
      customerId,
      metadata: session.metadata,
      subscriptionId: session.subscription,
      mode: session.mode,
      status: session.status,
      paymentStatus: session.payment_status,
    }, 'Processing checkout.session.completed webhook');

    if (!planId) {
      fastify.log.error({
        sessionId: session.id,
        customerId,
        metadata: session.metadata,
      }, 'No planId in checkout session metadata');
      return;
    }

    // Find tenant by either tenantId in metadata or Stripe customer ID
    let tenant;
    if (tenantId) {
      tenant = await Tenant.findById(tenantId);
    } else if (customerId) {
      tenant = await Tenant.findOne({
        'subscription.stripeCustomerId': customerId,
      });
    }

    if (!tenant) {
      fastify.log.error({
        customerId,
        tenantId,
        sessionId: session.id,
      }, 'Tenant not found for checkout session completed');
      return;
    }

    // Apply the plan limits and update tenant immediately
    const planConfig = SubscriptionPlansService.applyPlanLimits(planId);

    // Get subscription info if available
    let subscriptionId = null;
    let trialEndDate = null;
    let status = 'active';

    if (session.subscription) {
      subscriptionId = session.subscription as string;

      // Get the subscription details to check for trial
      const stripe = StripeService.getInstance();
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.trial_end) {
          trialEndDate = new Date(subscription.trial_end * 1000);
          status = 'trial';
        }
      } catch (error) {
        fastify.log.warn({
          subscriptionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Could not retrieve subscription details');
      }
    }

    // Update tenant with new plan immediately
    await Tenant.findByIdAndUpdate(tenant._id, {
      'subscription.plan': planId,
      'subscription.status': status,
      'subscription.billingCycle': billingCycle || 'monthly',
      'subscription.stripeSubscriptionId': subscriptionId,
      'subscription.stripeCustomerId': customerId,
      'subscription.trialEndDate': trialEndDate,
      'subscription.limits': planConfig.limits,
      'settings.sms.enabled': planConfig.limits.features.smsReminders,
    });

    fastify.log.info({
      tenantId: tenant._id,
      planId,
      sessionId: session.id,
      subscriptionId,
      status,
      billingCycle,
    }, 'Checkout session completed - tenant subscription updated immediately');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling checkout session completed');
    throw error;
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = subscription.customer as string;
    let planId = subscription.metadata?.planId;
    let billingCycle = subscription.metadata?.billingCycle as 'monthly' | 'yearly';

    // If no planId in metadata, try to determine it from the price ID
    if (!planId && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      const planInfo = StripeService.getPlanFromPriceId(priceId);
      if (planInfo) {
        planId = planInfo.planId;
        billingCycle = planInfo.billingCycle as 'monthly' | 'yearly';
        fastify.log.info({
          priceId,
          detectedPlanId: planId,
          detectedBillingCycle: billingCycle,
        }, 'Detected plan from price ID in subscription.created');
      }
    }

    if (!planId) {
      fastify.log.error({
        subscriptionId: subscription.id,
        customerId,
        items: subscription.items.data,
      }, 'No planId in subscription metadata and could not detect from price');
      return;
    }

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        subscriptionId: subscription.id,
      }, 'Tenant not found for Stripe customer');
      return;
    }

    // Apply the plan limits and update tenant
    const planConfig = SubscriptionPlansService.applyPlanLimits(planId);

    await Tenant.findByIdAndUpdate(tenant._id, {
      'subscription.plan': planId,
      'subscription.status': subscription.status === 'trialing' ? 'trial' : 'active',
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.stripePriceId': subscription.items.data[0]?.price.id,
      'subscription.billingCycle': billingCycle || 'monthly',
      'subscription.trialEndDate': subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      'subscription.limits': planConfig.limits,
      'settings.sms.enabled': planConfig.limits.features.smsReminders,
    });

    fastify.log.info({
      tenantId: tenant._id,
      planId,
      subscriptionId: subscription.id,
    }, 'Subscription created and tenant updated');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling subscription created');
    throw error;
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = subscription.customer as string;
    let planId = subscription.metadata?.planId;
    const billingCycle = subscription.metadata?.billingCycle as 'monthly' | 'yearly';

    // Enhanced logging for debugging
    fastify.log.info({
      subscriptionId: subscription.id,
      customerId,
      metadata: subscription.metadata,
      status: subscription.status,
      items: subscription.items.data.map(item => ({
        priceId: item.price.id,
        productId: item.price.product,
      })),
    }, 'Processing customer.subscription.updated webhook');

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        subscriptionId: subscription.id,
      }, 'Tenant not found for subscription update');
      return;
    }

    // If no planId in metadata, try to determine it from the price ID
    if (!planId && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      const planInfo = StripeService.getPlanFromPriceId(priceId);
      if (planInfo) {
        planId = planInfo.planId;
        fastify.log.info({
          priceId,
          detectedPlanId: planId,
          detectedBillingCycle: planInfo.billingCycle,
        }, 'Detected plan from price ID');
      }
    }

    // Map Stripe status to our status
    let status: "active" | "inactive" | "cancelled" | "trial" | "past_due" | "unpaid" = subscription.status === 'active' ? 'active' : 'inactive';
    if (subscription.status === 'trialing') {
      status = 'trial';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'unpaid') {
      status = 'unpaid';
    } else if (subscription.status === 'active') {
      status = 'active';
    }

    // Update subscription details
    const updateData: any = {
      'subscription.status': status,
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.stripePriceId': subscription.items.data[0]?.price.id,
      'subscription.trialEndDate': subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    };

    // If plan changed, update limits
    if (planId && planId !== tenant.subscription.plan) {
      const planConfig = SubscriptionPlansService.applyPlanLimits(planId);
      updateData['subscription.plan'] = planId;
      updateData['subscription.limits'] = planConfig.limits;
      updateData['settings.sms.enabled'] = planConfig.limits.features.smsReminders;
    }

    // Update billing cycle if changed
    if (billingCycle) {
      updateData['subscription.billingCycle'] = billingCycle;
    }

    await Tenant.findByIdAndUpdate(tenant._id, updateData);

    fastify.log.info({
      tenantId: tenant._id,
      subscriptionId: subscription.id,
      status: subscription.status,
      planId,
    }, 'Subscription updated');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling subscription updated');
    throw error;
  }
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = subscription.customer as string;

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        subscriptionId: subscription.id,
      }, 'Tenant not found for subscription deletion');
      return;
    }

    // Downgrade to free plan
    const freeConfig = SubscriptionPlansService.applyPlanLimits('free');

    await Tenant.findByIdAndUpdate(tenant._id, {
      'subscription.plan': 'free',
      'subscription.status': 'cancelled',
      'subscription.stripeSubscriptionId': null,
      'subscription.stripePriceId': null,
      'subscription.limits': freeConfig.limits,
      'settings.sms.enabled': false,
    });

    fastify.log.info({
      tenantId: tenant._id,
      subscriptionId: subscription.id,
    }, 'Subscription cancelled, tenant downgraded to free');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling subscription deleted');
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = invoice.customer as string;

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        invoiceId: invoice.id,
      }, 'Tenant not found for payment succeeded');
      return;
    }

    // If tenant was past due or unpaid, reactivate
    if (tenant.subscription.status === 'past_due' || tenant.subscription.status === 'unpaid') {
      await Tenant.findByIdAndUpdate(tenant._id, {
        'subscription.status': 'active',
      });

      fastify.log.info({
        tenantId: tenant._id,
        invoiceId: invoice.id,
      }, 'Subscription reactivated after successful payment');
    }

    // TODO: Send payment receipt email
    // TODO: Update billing history

  } catch (error) {
    fastify.log.error(error as Error, 'Error handling payment succeeded');
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = invoice.customer as string;

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        invoiceId: invoice.id,
      }, 'Tenant not found for payment failed');
      return;
    }

    // Mark subscription as past due
    await Tenant.findByIdAndUpdate(tenant._id, {
      'subscription.status': 'past_due',
    });

    // TODO: Send payment failure notification email
    // TODO: Implement grace period logic

    fastify.log.info({
      tenantId: tenant._id,
      invoiceId: invoice.id,
    }, 'Subscription marked as past due after payment failure');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling payment failed');
    throw error;
  }
}

/**
 * Handle trial ending soon
 */
async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = subscription.customer as string;

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        subscriptionId: subscription.id,
      }, 'Tenant not found for trial ending');
      return;
    }

    // TODO: Send trial ending notification email

    fastify.log.info({
      tenantId: tenant._id,
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end,
    }, 'Trial ending soon notification');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling trial will end');
    throw error;
  }
}

/**
 * Handle setup intent succeeded (payment method added)
 */
async function handleSetupIntentSucceeded(
  setupIntent: Stripe.SetupIntent,
  fastify: FastifyInstance
): Promise<void> {
  try {
    const customerId = setupIntent.customer as string;

    if (!customerId) {
      return;
    }

    // Find tenant by Stripe customer ID
    const tenant = await Tenant.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!tenant) {
      fastify.log.error({
        customerId,
        setupIntentId: setupIntent.id,
      }, 'Tenant not found for setup intent');
      return;
    }

    fastify.log.info({
      tenantId: tenant._id,
      setupIntentId: setupIntent.id,
      paymentMethodId: setupIntent.payment_method,
    }, 'Payment method added successfully');
  } catch (error) {
    fastify.log.error(error as Error, 'Error handling setup intent succeeded');
    throw error;
  }
}