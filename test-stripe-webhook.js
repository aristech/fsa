#!/usr/bin/env node

/**
 * Test Stripe webhook locally
 * This script simulates a Stripe webhook event to test the webhook handler
 */

const crypto = require('crypto');
const axios = require('axios');

// Configuration
const WEBHOOK_URL = 'http://localhost:3001/api/v1/stripe/webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_2db32d063f1609307413abc279d8d2b2343645a97d9d865906e2269afefc6256';

// Test event data - checkout.session.completed
const testEvent = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2025-08-27',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      customer: 'cus_test_123456',
      mode: 'subscription',
      payment_status: 'paid',
      status: 'complete',
      subscription: 'sub_test_' + Date.now(),
      metadata: {
        planId: 'premium',
        billingCycle: 'monthly',
        tenantId: '674a1e8c88b8e7fa6b8f5433' // Replace with a real tenant ID from your DB
      }
    }
  }
};

// Generate Stripe signature
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${expectedSignature}`;
}

async function sendTestWebhook() {
  try {
    const payload = JSON.stringify(testEvent);
    const signature = generateStripeSignature(payload, WEBHOOK_SECRET);

    console.log('Sending test webhook to:', WEBHOOK_URL);
    console.log('Event type:', testEvent.type);
    console.log('Metadata:', testEvent.data.object.metadata);

    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      }
    });

    console.log('\n✅ Webhook sent successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('\n❌ Error sending webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
console.log('🔧 Testing Stripe Webhook Handler\n');
sendTestWebhook();