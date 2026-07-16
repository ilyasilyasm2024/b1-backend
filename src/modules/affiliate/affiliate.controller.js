const affiliateService = require('./affiliate.service');
const { createInfluencerSchema, loginSchema } = require('./affiliate.validation');

class AffiliateController {
  // --- Admin: create influencer ---
  async createInfluencer(req, res) {
    try {
      const { error, value } = createInfluencerSchema.validate(req.body, { abortEarly: false });
      if (error) return res.status(400).json({ errors: error.details.map((d) => d.message) });
      const influencer = await affiliateService.createInfluencer(value);
      res.status(201).json(influencer);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Admin: list influencers ---
  async listInfluencers(req, res) {
    try {
      const list = await affiliateService.listInfluencers();
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  // --- Admin: payout an influencer ---
  async payout(req, res) {
    try {
      const { influencerId } = req.params;
      const { period } = req.body; // optional "YYYY-MM"
      const result = await affiliateService.payout(influencerId, period);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Admin: update influencer settings ---
  async updateInfluencer(req, res) {
    try {
      const { influencerId } = req.params;
      const result = await affiliateService.updateInfluencer(influencerId, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Influencer login ---
  async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
      if (error) return res.status(400).json({ errors: error.details.map((d) => d.message) });
      const result = await affiliateService.login(value);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  // --- Influencer dashboard ---
  async dashboard(req, res) {
    try {
      const data = await affiliateService.getDashboard(req.influencer.influencerId);
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Public: validate referral code (used on signup page) ---
  async validateCode(req, res) {
    try {
      const { code } = req.params;
      const result = await affiliateService.validateCode(code);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Influencer: generate promo code ---
  async generatePromo(req, res) {
    try {
      const { plan, durationDays } = req.body;
      const result = await affiliateService.generatePromoCode(req.influencer.influencerId, { plan, durationDays });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // --- Influencer: list promo codes ---
  async listPromos(req, res) {
    try {
      const codes = await affiliateService.listPromoCodes(req.influencer.influencerId);
      res.json(codes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  }

  // --- Public: redeem a promo code (requires user auth) ---
  async redeemPromo(req, res) {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code is required' });
      const result = await affiliateService.redeemPromoCode(code, req.user.userId, req.user.username);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new AffiliateController();
