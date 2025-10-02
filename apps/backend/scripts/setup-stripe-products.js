const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production.local') });

const { StripeService } = require('../dist/services/stripe-service');

async function setupStripeProducts() {
  try {
    console.log('🔧 Setting up Stripe products and prices...');

    // Initialize Stripe
    StripeService.initialize();
    const stripe = StripeService.getInstance();

    // Clear existing products (optional - comment this out if you want to keep existing ones)
    console.log('🗑️  Clearing existing test products...');
    const existingProducts = await stripe.products.list({ limit: 100 });
    for (const product of existingProducts.data) {
      if (product.metadata?.source === 'fsa_app' || product.name.includes('Basic') || product.name.includes('Premium') || product.name.includes('Enterprise')) {
        console.log(`  Deleting product: ${product.name}`);
        await stripe.products.del(product.id);
      }
    }

    // Create products and prices using the service method
    await StripeService.createStripeProducts();

    // List all products and prices to get the real IDs
    console.log('\n📋 Created Products and Prices:');
    const products = await stripe.products.list({ limit: 100 });

    const priceMap = {};

    for (const product of products.data) {
      if (product.metadata?.planId) {
        console.log(`\n📦 Product: ${product.name} (${product.metadata.planId})`);

        const prices = await stripe.prices.list({ product: product.id });
        for (const price of prices.data) {
          const billingCycle = price.metadata?.billingCycle || (price.recurring?.interval === 'month' ? 'monthly' : 'yearly');
          const planId = price.metadata?.planId || product.metadata?.planId;

          if (!priceMap[planId]) priceMap[planId] = {};
          priceMap[planId][billingCycle] = price.id;

          console.log(`  💰 ${billingCycle}: ${price.id} (€${price.unit_amount / 100}/${price.recurring?.interval})`);
        }
      }
    }

    // Generate the price mapping for the code
    console.log('\n🔧 Price mapping for stripe-service.ts:');
    console.log('const priceMap: Record<string, Record<string, string>> = {');
    console.log('  free: {');
    console.log('    monthly: "price_free_monthly", // This won\'t be used since free plan doesn\'t need Stripe');
    console.log('    yearly: "price_free_yearly",');
    console.log('  },');

    for (const [planId, prices] of Object.entries(priceMap)) {
      console.log(`  ${planId}: {`);
      console.log(`    monthly: "${prices.monthly || 'MISSING'}",`);
      console.log(`    yearly: "${prices.yearly || 'MISSING'}",`);
      console.log('  },');
    }
    console.log('};');

    // Generate environment variables
    console.log('\n📄 Environment variables to add to .env:');
    for (const [planId, prices] of Object.entries(priceMap)) {
      if (prices.monthly) console.log(`STRIPE_PRICE_${planId.toUpperCase()}_MONTHLY=${prices.monthly}`);
      if (prices.yearly) console.log(`STRIPE_PRICE_${planId.toUpperCase()}_YEARLY=${prices.yearly}`);
    }

    console.log('\n✅ Stripe setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update the priceMap in apps/backend/src/services/stripe-service.ts with the real price IDs');
    console.log('2. Or add the environment variables to your .env file and update the getPriceId method to use them');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

setupStripeProducts();