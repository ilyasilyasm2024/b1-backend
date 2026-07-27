const billingService = require('./billing.service');

class BillingController {
  // POST /billing/create-order  (authenticated)
  async createOrder(req, res) {
    try {
      const { plan, billing } = req.body;
      if (!plan) return res.status(400).json({ error: 'Plan is required' });

      const result = await billingService.createOrder({
        userId: req.user.userId,
        plan,
        billing,
      });

      res.json(result);
    } catch (err) {
      console.error('Create order error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  // POST /billing/capture  (authenticated)
  async captureOrder(req, res) {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: 'orderId is required' });

      const result = await billingService.captureOrder({
        orderId,
        userId: req.user.userId,
      });

      res.json(result);
    } catch (err) {
      console.error('Capture error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  // POST /billing/pay-card  (authenticated)
  // Processes a credit card payment entirely server-side via PayPal.
  // The card number is sent to PayPal immediately and never stored.
  async payWithCard(req, res) {
    try {
      const { plan, billing, card } = req.body;
      if (!plan) return res.status(400).json({ error: 'Plan is required' });
      if (!card || !card.number || !card.expiry || !card.cvv) {
        return res.status(400).json({ error: 'Card details are required' });
      }

      const result = await billingService.payWithCard({
        userId: req.user.userId,
        plan,
        billing,
        card,
      });

      res.json(result);
    } catch (err) {
      console.error('Card payment error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new BillingController();
