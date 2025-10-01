import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { Tenant } from "../models/Tenant";
import { EnvSubscriptionService } from "../services/env-subscription-service";
import { getSubscriptionStatus } from "../middleware/subscription-enforcement";
import { StripeService } from "../services/stripe-service";
import { TenantSetupService } from "../services/tenant-setup";
import {
  sendError,
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  handleZodError
} from "../utils/error-handler";
import {
  AUTH_MESSAGES,
  BUSINESS_MESSAGES,
  SUCCESS_MESSAGES,
  SERVER_MESSAGES,
  NOT_FOUND_MESSAGES
} from "../constants/error-messages";

// ----------------------------------------------------------------------

// Subscription plan change schema
const changePlanSchema = z.object({
  planId: z
    .string()
    .min(1, "Plan ID is required")
    .refine(
      (planId) => EnvSubscriptionService.getPlan(planId) !== null,
      "Invalid subscription plan"
    ),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

// Checkout session schema
const checkoutSessionSchema = z.object({
  planId: z
    .string()
    .min(1, "Plan ID is required")
    .refine(
      (planId) => EnvSubscriptionService.getPlan(planId) !== null,
      "Invalid subscription plan"
    ),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  successUrl: z.string().url("Valid success URL is required"),
  cancelUrl: z.string().url("Valid cancel URL is required"),
  trialPeriodDays: z.number().int().min(0).max(365).optional(),
});

// Usage update schema
const updateUsageSchema = z.object({
  action: z.enum([
    "user_created",
    "user_deleted",
    "client_created",
    "client_deleted",
    "work_order_created",
    "sms_sent"
  ]),
  count: z.number().int().positive().default(1),
});

// ----------------------------------------------------------------------

export async function subscriptionRoutes(fastify: FastifyInstance) {
  // Register the public routes first, without any authentication middleware
  await fastify.register(async function (publicRoutes) {
    // GET /api/v1/subscription/plans - Get all available subscription plans (public endpoint)
    publicRoutes.get("/plans", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const pricingInfo = EnvSubscriptionService.getPricingInfo();

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.FETCHED,
          "Subscription plans fetched successfully",
          {
            plans: pricingInfo,
            currentDate: new Date().toISOString(),
          }
        );
      } catch (error) {
        fastify.log.error(error as Error, "Error fetching subscription plans");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to fetch subscription plans"
        );
      }
    });

    // GET /api/v1/subscription/checkout/success - Handle Stripe Checkout success redirect
    publicRoutes.get("/checkout/success", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { session_id } = (request.query as any) || {};

        if (!session_id) {
          return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "Session ID is required");
        }

        // Retrieve the checkout session from Stripe
        const stripe = StripeService.getInstance();
        const session = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ['subscription', 'customer'],
        });

        if (!session || session.payment_status !== 'paid') {
          return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "Invalid or unpaid session");
        }

        // Extract tenant ID from metadata
        const tenantId = session.metadata?.tenantId;
        if (!tenantId) {
          return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "Tenant information not found in session");
        }

        const planId = session.metadata?.planId;
        const billingCycle = session.metadata?.billingCycle || 'monthly';

        // Log the successful payment
        fastify.log.info(`Stripe Checkout success for tenant ${tenantId}, plan: ${planId}, session: ${session_id}`);

        return sendSuccess(reply, 200, SUCCESS_MESSAGES.UPDATED, "Subscription activated successfully", {
          sessionId: session_id,
          planId,
          billingCycle,
          status: 'success',
          subscriptionId: (session.subscription as any)?.id,
          customerId: (session.customer as any)?.id,
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error handling checkout success");
        return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to process successful checkout");
      }
    });

    // GET /api/v1/subscription/checkout/cancel - Handle Stripe Checkout cancel redirect
    publicRoutes.get("/checkout/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { session_id } = (request.query as any) || {};

        if (session_id) {
          // Optionally retrieve session to log cancellation details
          try {
            const stripe = StripeService.getInstance();
            const session = await stripe.checkout.sessions.retrieve(session_id);
            const tenantId = session.metadata?.tenantId;
            const planId = session.metadata?.planId;

            fastify.log.info(`Stripe Checkout cancelled for tenant ${tenantId}, plan: ${planId}, session: ${session_id}`);
          } catch (sessionError) {
            fastify.log.warn({ error: sessionError }, `Could not retrieve cancelled session ${session_id}`);
          }
        }

        return sendSuccess(reply, 200, SUCCESS_MESSAGES.FETCHED, "Checkout cancelled", {
          sessionId: session_id,
          status: 'cancelled',
          message: 'Subscription checkout was cancelled by user',
        });
      } catch (error) {
        fastify.log.error(error as Error, "Error handling checkout cancellation");
        return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to process cancelled checkout");
      }
    });
  });

  // Register all other subscription routes with authentication
  await fastify.register(async function (authenticatedRoutes) {
    await authenticatedRoutes.addHook('preHandler', authenticate);

    // GET /api/v1/subscription/status - Get current subscription status (requires authentication)
    authenticatedRoutes.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subscriptionStatus = await getSubscriptionStatus(request);

      if (!subscriptionStatus) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Unable to fetch subscription status"
        );
      }

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.FETCHED,
        "Subscription status fetched successfully",
        subscriptionStatus
      );
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching subscription status");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to fetch subscription status"
      );
    }
  });

    // GET /api/v1/subscription/usage - Get current usage statistics (requires authentication)
    authenticatedRoutes.get("/usage", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Tenant information not found"
        );
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendNotFound(
          reply,
          NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
          "Tenant not found"
        );
      }

      const usage = tenant.subscription.usage;
      const limits = tenant.subscription.limits;

      // Calculate usage percentages
      const usageWithPercentages = {
        users: {
          current: usage.currentUsers,
          limit: limits.maxUsers,
          percentage: limits.maxUsers === -1 ? 0 : Math.round((usage.currentUsers / limits.maxUsers) * 100),
          unlimited: limits.maxUsers === -1,
        },
        clients: {
          current: usage.currentClients,
          limit: limits.maxClients,
          percentage: limits.maxClients === -1 ? 0 : Math.round((usage.currentClients / limits.maxClients) * 100),
          unlimited: limits.maxClients === -1,
        },
        workOrders: {
          current: usage.workOrdersThisMonth,
          limit: limits.maxWorkOrdersPerMonth,
          percentage: limits.maxWorkOrdersPerMonth === -1 ? 0 : Math.round((usage.workOrdersThisMonth / limits.maxWorkOrdersPerMonth) * 100),
          unlimited: limits.maxWorkOrdersPerMonth === -1,
        },
        sms: {
          current: usage.smsThisMonth,
          limit: limits.maxSmsPerMonth,
          percentage: limits.maxSmsPerMonth === -1 ? 0 : Math.round((usage.smsThisMonth / limits.maxSmsPerMonth) * 100),
          unlimited: limits.maxSmsPerMonth === -1,
          available: limits.maxSmsPerMonth > 0,
        },
        storage: {
          current: usage.storageUsedGB,
          limit: limits.maxStorageGB,
          percentage: Math.round((usage.storageUsedGB / limits.maxStorageGB) * 100),
        },
      };

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.FETCHED,
        "Usage statistics fetched successfully",
        {
          usage: usageWithPercentages,
          lastResetDate: usage.lastResetDate,
          planName: tenant.subscription.plan,
          features: limits.features,
        }
      );
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching usage statistics");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to fetch usage statistics"
      );
    }
  });

    // POST /api/v1/subscription/change-plan - Change subscription plan (requires authentication)
    authenticatedRoutes.post(
      "/change-plan",
      async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = changePlanSchema.parse(request.body);
        const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

        if (!tenantId) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.INVALID_TENANT,
            "Tenant information not found"
          );
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          return sendNotFound(
            reply,
            NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
            "Tenant not found"
          );
        }

        // Check if user is tenant owner or has permission to change plan
        const user = (request as any).user;
        if (!user.isTenantOwner && user.role !== "admin") {
          return sendForbidden(
            reply,
            BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE,
            "Only tenant owners can change subscription plans"
          );
        }

        const newPlan = EnvSubscriptionService.getPlan(validatedData.planId);
        if (!newPlan) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
            "Invalid subscription plan"
          );
        }

        // Ensure tenant has a Stripe customer
        let stripeCustomerId = tenant.subscription.stripeCustomerId;
        if (!stripeCustomerId) {
          stripeCustomerId = await TenantSetupService.createStripeCustomerForTenant(tenantId);
          if (!stripeCustomerId) {
            return sendError(
              reply,
              500,
              SERVER_MESSAGES.INTERNAL_ERROR,
              "Failed to create Stripe customer"
            );
          }
        }

        let stripeSubscription = null;
        let clientSecret = null;

        // Handle plan change based on current state
        if (validatedData.planId === 'free') {
          // Downgrade to free plan - cancel existing Stripe subscription
          if (tenant.subscription.stripeSubscriptionId) {
            await StripeService.cancelSubscription(
              tenant.subscription.stripeSubscriptionId,
              { immediately: true, reason: 'downgrade_to_free' }
            );
          }
        } else {
          // Upgrade/change to paid plan
          if (tenant.subscription.stripeSubscriptionId) {
            // Update existing subscription
            stripeSubscription = await StripeService.updateSubscription(
              tenant.subscription.stripeSubscriptionId,
              {
                planId: validatedData.planId,
                billingCycle: validatedData.billingCycle,
                prorate: true,
                metadata: {
                  tenantId: tenantId,
                  planId: validatedData.planId,
                  billingCycle: validatedData.billingCycle,
                }
              }
            );
          } else {
            // Create new subscription
            stripeSubscription = await StripeService.createSubscription({
              customerId: stripeCustomerId,
              planId: validatedData.planId,
              billingCycle: validatedData.billingCycle,
              trialPeriodDays: tenant.subscription.status === 'trial' ? 14 : undefined,
              metadata: {
                tenantId: tenantId,
                planId: validatedData.planId,
                billingCycle: validatedData.billingCycle,
              }
            });

            // Extract client secret for payment confirmation
            if (stripeSubscription.latest_invoice &&
                typeof stripeSubscription.latest_invoice === 'object' &&
                (stripeSubscription.latest_invoice as any).payment_intent &&
                typeof (stripeSubscription.latest_invoice as any).payment_intent === 'object') {
              clientSecret = ((stripeSubscription.latest_invoice as any).payment_intent as any).client_secret;
            }
          }
        }

        // Apply new plan configuration
        const newSubscriptionConfig = EnvSubscriptionService.applyPlanLimits(validatedData.planId);

        // Update tenant subscription in database
        const updatedData: any = {
          'subscription.plan': validatedData.planId,
          'subscription.billingCycle': validatedData.billingCycle,
          'subscription.limits': newSubscriptionConfig.limits,
          'settings.sms.enabled': newSubscriptionConfig.limits.features.smsReminders,
        };

        if (stripeSubscription) {
          updatedData['subscription.stripeSubscriptionId'] = stripeSubscription.id;
          updatedData['subscription.stripePriceId'] = stripeSubscription.items.data[0]?.price.id;
          updatedData['subscription.status'] = stripeSubscription.status === 'trialing' ? 'trial' :
                                                 stripeSubscription.status === 'active' ? 'active' :
                                                 'inactive';
        } else if (validatedData.planId === 'free') {
          updatedData['subscription.stripeSubscriptionId'] = null;
          updatedData['subscription.stripePriceId'] = null;
          updatedData['subscription.status'] = 'active';
        }

        await Tenant.findByIdAndUpdate(tenantId, updatedData, { new: true });

        const responseData: any = {
          newPlan: {
            id: validatedData.planId,
            name: newPlan.name,
            billing: validatedData.billingCycle,
          },
          limits: newSubscriptionConfig.limits,
          features: newSubscriptionConfig.limits.features,
        };

        // Include client secret for payment confirmation if needed
        if (clientSecret) {
          responseData.requiresPayment = true;
          responseData.clientSecret = clientSecret;
          responseData.subscriptionId = stripeSubscription?.id;
        }

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.UPDATED,
          clientSecret ? "Subscription created - payment required" : "Subscription plan updated successfully",
          responseData
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return handleZodError(error, reply);
        }

        fastify.log.error(error as Error, "Error changing subscription plan");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to change subscription plan"
        );
      }
    }
    );

    // POST /api/v1/subscription/update-usage - Update usage counters (internal use)
    authenticatedRoutes.post(
      "/update-usage",
      async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const validatedData = updateUsageSchema.parse(request.body);
        const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

        if (!tenantId) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.INVALID_TENANT,
            "Tenant information not found"
          );
        }

        await EnvSubscriptionService.updateUsage(
          tenantId,
          validatedData.action,
          validatedData.count
        );

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.UPDATED,
          "Usage updated successfully",
          {
            action: validatedData.action,
            count: validatedData.count,
          }
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return handleZodError(error, reply);
        }

        fastify.log.error(error as Error, "Error updating usage");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to update usage"
        );
      }
    }
    );

    // POST /api/v1/subscription/reset-trial - Reset trial period (admin only)
    authenticatedRoutes.post(
      "/reset-trial",
      async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantId = (request as any).tenantId || (request as any).user?.tenantId;
        const user = (request as any).user;

        // Only superusers can reset trials
        if (user.role !== "superuser") {
          return sendForbidden(
            reply,
            BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE,
            "Only superusers can reset trial periods"
          );
        }

        if (!tenantId) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.INVALID_TENANT,
            "Tenant information not found"
          );
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          return sendNotFound(
            reply,
            NOT_FOUND_MESSAGES.TENANT_NOT_FOUND,
            "Tenant not found"
          );
        }

        const currentPlan = EnvSubscriptionService.getPlan(tenant.subscription.plan);
        if (!currentPlan) {
          return sendBadRequest(
            reply,
            BUSINESS_MESSAGES.SUBSCRIPTION_ERROR,
            "Invalid current subscription plan"
          );
        }

        // Reset trial period
        const newTrialEndDate = new Date();
        newTrialEndDate.setDate(newTrialEndDate.getDate() + currentPlan.trialDays);

        await Tenant.findByIdAndUpdate(tenantId, {
          "subscription.status": "trial",
          "subscription.trialEndDate": newTrialEndDate,
        });

        return sendSuccess(
          reply,
          200,
          SUCCESS_MESSAGES.UPDATED,
          "Trial period reset successfully",
          {
            newTrialEndDate: newTrialEndDate.toISOString(),
            trialDays: currentPlan.trialDays,
          }
        );
      } catch (error) {
        fastify.log.error(error as Error, "Error resetting trial");
        return sendError(
          reply,
          500,
          SERVER_MESSAGES.INTERNAL_ERROR,
          "Failed to reset trial period"
        );
      }
    }
    );

    // GET /api/v1/subscription/features - Check feature availability
    authenticatedRoutes.get("/features", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subscriptionStatus = await getSubscriptionStatus(request);

      if (!subscriptionStatus) {
        return sendBadRequest(
          reply,
          BUSINESS_MESSAGES.INVALID_TENANT,
          "Unable to fetch subscription status"
        );
      }

      const features = subscriptionStatus.limits.features;
      const featureList = Object.entries(features).map(([key, enabled]) => ({
        feature: key,
        enabled,
        displayName: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      }));

      return sendSuccess(
        reply,
        200,
        SUCCESS_MESSAGES.FETCHED,
        "Features fetched successfully",
        {
          features: featureList,
          plan: subscriptionStatus.plan,
          upgradeRequired: featureList.filter(f => !f.enabled),
        }
      );
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching features");
      return sendError(
        reply,
        500,
        SERVER_MESSAGES.INTERNAL_ERROR,
        "Failed to fetch features"
      );
    }
    });

    // POST /api/v1/subscription/create-setup-intent - Create setup intent for payment method
    authenticatedRoutes.post("/create-setup-intent", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;
      const user = (request as any).user;

      if (!tenantId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
      }

      // Check if user is tenant owner
      if (!user.isTenantOwner && user.role !== "admin") {
        return sendForbidden(reply, BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE, "Only tenant owners can manage payment methods");
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendNotFound(reply, NOT_FOUND_MESSAGES.TENANT_NOT_FOUND, "Tenant not found");
      }

      // Ensure tenant has a Stripe customer
      let stripeCustomerId = tenant.subscription.stripeCustomerId;
      if (!stripeCustomerId) {
        stripeCustomerId = await TenantSetupService.createStripeCustomerForTenant(tenantId);
        if (!stripeCustomerId) {
          return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to create Stripe customer");
        }
      }

      const setupIntent = await StripeService.createSetupIntent(stripeCustomerId);

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.CREATED, "Setup intent created successfully", {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error creating setup intent");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to create setup intent");
    }
    });

    // GET /api/v1/subscription/payment-methods - Get customer payment methods
    authenticatedRoutes.get("/payment-methods", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;

      if (!tenantId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.subscription.stripeCustomerId) {
        return sendSuccess(reply, 200, SUCCESS_MESSAGES.FETCHED, "No payment methods found", { paymentMethods: [] });
      }

      const paymentMethods = await StripeService.listPaymentMethods(tenant.subscription.stripeCustomerId);

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.FETCHED, "Payment methods retrieved successfully", {
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          } : null,
          created: pm.created,
        })),
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching payment methods");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to fetch payment methods");
    }
    });

    // DELETE /api/v1/subscription/payment-methods/:paymentMethodId - Remove payment method
    authenticatedRoutes.delete("/payment-methods/:paymentMethodId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { paymentMethodId } = (request.params as any);
      const user = (request as any).user;

      // Check if user is tenant owner
      if (!user.isTenantOwner && user.role !== "admin") {
        return sendForbidden(reply, BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE, "Only tenant owners can manage payment methods");
      }

      await StripeService.detachPaymentMethod(paymentMethodId);

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.DELETED, "Payment method removed successfully");
    } catch (error) {
      fastify.log.error(error as Error, "Error removing payment method");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to remove payment method");
    }
    });

    // POST /api/v1/subscription/billing-portal - Create billing portal session
    authenticatedRoutes.post("/billing-portal", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;
      const user = (request as any).user;
      const { returnUrl } = (request.body as any) || {};

      if (!tenantId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
      }

      // Check if user is tenant owner
      if (!user.isTenantOwner && user.role !== "admin") {
        return sendForbidden(reply, BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE, "Only tenant owners can access billing portal");
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.subscription.stripeCustomerId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "No Stripe customer found for tenant");
      }

      const session = await StripeService.createBillingPortalSession(
        tenant.subscription.stripeCustomerId,
        returnUrl || `${process.env.FRONTEND_URL}/settings/subscription`
      );

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.CREATED, "Billing portal session created", {
        url: session.url,
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error creating billing portal session");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to create billing portal session");
    }
    });

    // GET /api/v1/subscription/invoices - Get customer invoices
    authenticatedRoutes.get("/invoices", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;
      const { limit, startingAfter } = (request.query as any) || {};

      if (!tenantId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant || !tenant.subscription.stripeCustomerId) {
        return sendSuccess(reply, 200, SUCCESS_MESSAGES.FETCHED, "No invoices found", { invoices: [], hasMore: false });
      }

      const result = await StripeService.listInvoices(tenant.subscription.stripeCustomerId, {
        limit: limit ? parseInt(limit) : 10,
        startingAfter,
      });

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.FETCHED, "Invoices retrieved successfully", {
        invoices: result.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: invoice.status,
          created: invoice.created,
          periodStart: invoice.period_start,
          periodEnd: invoice.period_end,
          pdfUrl: invoice.invoice_pdf,
          hostedUrl: invoice.hosted_invoice_url,
        })),
        hasMore: result.hasMore,
      });
    } catch (error) {
      fastify.log.error(error as Error, "Error fetching invoices");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to fetch invoices");
    }
    });

    // POST /api/v1/subscription/checkout-session - Create Stripe Checkout session
    authenticatedRoutes.post("/checkout-session", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = checkoutSessionSchema.parse(request.body);
      const tenantId = (request as any).tenantId || (request as any).user?.tenantId;
      const user = (request as any).user;

      if (!tenantId) {
        return sendBadRequest(reply, BUSINESS_MESSAGES.INVALID_TENANT, "Tenant information not found");
      }

      // Check if user is tenant owner
      if (!user.isTenantOwner && user.role !== "admin") {
        return sendForbidden(reply, BUSINESS_MESSAGES.FEATURE_NOT_AVAILABLE, "Only tenant owners can create checkout sessions");
      }

      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return sendNotFound(reply, NOT_FOUND_MESSAGES.TENANT_NOT_FOUND, "Tenant not found");
      }

      // Validate that user is not trying to "upgrade" to free plan via checkout
      if (validatedData.planId === 'free') {
        return sendBadRequest(reply, BUSINESS_MESSAGES.SUBSCRIPTION_ERROR, "Cannot create checkout session for free plan");
      }

      // Ensure tenant has a Stripe customer
      let stripeCustomerId = tenant.subscription.stripeCustomerId;
      if (!stripeCustomerId) {
        stripeCustomerId = await TenantSetupService.createStripeCustomerForTenant(tenantId);
        if (!stripeCustomerId) {
          return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to create Stripe customer");
        }
      }

      // Determine trial period
      let trialPeriodDays = validatedData.trialPeriodDays;
      if (!trialPeriodDays && tenant.subscription.status !== 'active') {
        // Give trial period for new users or users not on active paid plans
        const plan = EnvSubscriptionService.getPlan(validatedData.planId);
        trialPeriodDays = plan?.trialDays || 14;
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        customerId: stripeCustomerId,
        planId: validatedData.planId,
        billingCycle: validatedData.billingCycle,
        successUrl: validatedData.successUrl,
        cancelUrl: validatedData.cancelUrl,
        trialPeriodDays,
        metadata: {
          tenantId: tenantId,
          currentPlan: tenant.subscription.plan,
          userId: user.userId,
        },
      });

      return sendSuccess(reply, 200, SUCCESS_MESSAGES.CREATED, "Checkout session created successfully", {
        sessionId: session.id,
        url: session.url,
        planId: validatedData.planId,
        billingCycle: validatedData.billingCycle,
        trialPeriodDays,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleZodError(error, reply);
      }

      fastify.log.error(error as Error, "Error creating checkout session");
      return sendError(reply, 500, SERVER_MESSAGES.INTERNAL_ERROR, "Failed to create checkout session");
    }
    });
  });
}