const paypal = require('../../config/paypal');
const User = require('../user/user.model');
const affiliateService = require('../affiliate/affiliate.service');
const { getPlanPrice } = require('../../config/plans');

const VALID_PAID_PLANS = ['silver', 'gold', 'platinum', 'lifetime'];

// Prices in EUR for PayPal orders.
// Approximate conversion: 1 MAD ≈ 0.09 EUR (rounded to clean numbers).
const PAYPAL_PRICES = {
  silver: { monthly: 2.99, yearly: 29.90 },
  gold: { monthly: 4.99, yearly: 49.90 },
  platinum: { monthly: 6.99, yearly: 69.90 },
  lifetime: { monthly: 29.90, yearly: 29.90 }, // one-time
};

class BillingService {
  // Creates a PayPal order for direct card payment (no redirect).
  // Returns the order ID for the frontend to process with PayPal JS SDK.
  async createOrder({ userId, plan, billing = 'monthly' }) {
    if (!paypal.isConfigured()) {
      throw new Error('Payment provider is not configured');
    }
    if (!VALID_PAID_PLANS.includes(plan)) {
      throw new Error('Invalid plan');
    }

    const user = await User.findById(userId).select('email');
    if (!user) throw new Error('User not found');

    const priceEntry = PAYPAL_PRICES[plan];
    const amount = plan === 'lifetime' ? priceEntry.monthly : priceEntry[billing] || priceEntry.monthly;

    const token = await paypal.getAccessToken();
    const base = paypal.getBaseUrl();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${userId}_${plan}_${billing}`,
          description: `B1 Prüfung - ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${billing})`,
          custom_id: JSON.stringify({ userId: String(userId), plan, billing }),
          amount: {
            currency_code: 'EUR',
            value: amount.toFixed(2),
          },
        },
      ],
    };

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('PayPal create order failed:', res.status, text);
      throw new Error('Could not create order');
    }

    const order = await res.json();
    return { orderId: order.id };
  }

  // Process a card payment entirely server-side.
  // Creates an order with the card as payment source — PayPal charges it immediately.
  async payWithCard({ userId, plan, billing = 'monthly', card }) {
    if (!paypal.isConfigured()) {
      throw new Error('Payment provider is not configured');
    }
    if (!VALID_PAID_PLANS.includes(plan)) {
      throw new Error('Invalid plan');
    }

    const user = await User.findById(userId).select('email');
    if (!user) throw new Error('User not found');

    const priceEntry = PAYPAL_PRICES[plan];
    const amount = plan === 'lifetime' ? priceEntry.monthly : priceEntry[billing] || priceEntry.monthly;

    const token = await paypal.getAccessToken();
    const base = paypal.getBaseUrl();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `${userId}_${plan}_${billing}`,
          description: `B1 Prüfung - ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${billing})`,
          custom_id: JSON.stringify({ userId: String(userId), plan, billing }),
          amount: {
            currency_code: 'EUR',
            value: amount.toFixed(2),
          },
        },
      ],
      payment_source: {
        card: {
          number: card.number.replace(/\s/g, ''),
          expiry: card.expiry, // "YYYY-MM"
          security_code: card.cvv,
          billing_address: {
            address_line_1: card.address || '123 Main St',
            admin_area_2: card.city || 'Casablanca',
            postal_code: card.zip || '20000',
            country_code: card.country || 'MA',
          },
        },
      },
    };

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${userId}-${plan}-${Date.now()}`, // idempotency
      },
      body: JSON.stringify(orderPayload),
    });

    const responseBody = await res.json();

    if (!res.ok) {
      console.error('PayPal card payment failed:', res.status, JSON.stringify(responseBody));
      const detail = responseBody?.details?.[0]?.description || responseBody?.message || 'Payment declined';
      throw new Error(detail);
    }

    // With card payment source, the order is auto-captured (status = COMPLETED).
    if (responseBody.status !== 'COMPLETED') {
      console.error('PayPal card: unexpected status', responseBody.status);
      throw new Error('Payment was not completed');
    }

    // Activate the plan
    return this.activatePlan({ userId, plan, billing });
  }

  // Captures a completed PayPal order and activates the plan.
  async captureOrder({ orderId, userId }) {
    if (!paypal.isConfigured()) {
      throw new Error('Payment provider is not configured');
    }

    const token = await paypal.getAccessToken();
    const base = paypal.getBaseUrl();

    const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('PayPal capture failed:', res.status, text);
      throw new Error('Payment capture failed');
    }

    const capture = await res.json();
    if (capture.status !== 'COMPLETED') {
      throw new Error(`Payment not completed (status: ${capture.status})`);
    }

    // Extract plan info from custom_id
    const purchaseUnit = capture.purchase_units?.[0];
    let plan, billing;
    try {
      const custom = JSON.parse(purchaseUnit?.payments?.captures?.[0]?.custom_id || purchaseUnit?.custom_id || '{}');
      plan = custom.plan;
      billing = custom.billing || 'monthly';
      // Verify the userId matches
      if (custom.userId && custom.userId !== String(userId)) {
        throw new Error('User mismatch');
      }
    } catch (e) {
      // Fallback: parse from reference_id
      const ref = purchaseUnit?.reference_id || '';
      const parts = ref.split('_');
      plan = parts[1];
      billing = parts[2] || 'monthly';
    }

    if (!plan || !VALID_PAID_PLANS.includes(plan)) {
      throw new Error('Could not determine plan from payment');
    }

    // Activate the plan
    return this.activatePlan({ userId, plan, billing });
  }

  // Activate a plan for a user (reusable by both capture and direct card).
  async activatePlan({ userId, plan, billing }) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let expiresAt = null;
    if (plan !== 'lifetime') {
      const months = billing === 'yearly' ? 12 : 1;
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
    }

    user.plan = plan;
    user.subscriptionExpiresAt = expiresAt;
    await user.save();

    // Record affiliate commission if applicable.
    if (user.referredBy) {
      try {
        const basePrice = getPlanPrice(plan) * (billing === 'yearly' ? 10 : 1);
        let amountPaid = basePrice;
        const check = await affiliateService.validateCode(user.referredBy);
        if (check.valid) {
          amountPaid = Math.round(basePrice * (1 - check.discountPercent / 100) * 100) / 100;
        }
        await affiliateService.recordPurchase({
          userId: user._id,
          username: user.username,
          plan,
          amountPaid,
        });
      } catch (e) {
        console.error('Commission record failed:', e.message);
      }
    }

    return { plan: user.plan, subscriptionExpiresAt: user.subscriptionExpiresAt };
  }
}

module.exports = new BillingService();
