const userService = require('./user.service');

class UserController {
  async getAll(req, res) {
    try {
      const { page, limit } = req.query;
      const users = await userService.getAllUsers({ page, limit });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Activate a subscription (called after successful payment).
  async subscribe(req, res) {
    try {
      const { plan, billing } = req.body;
      if (!plan) return res.status(400).json({ error: 'Plan is required' });
      const result = await userService.subscribe(req.user.userId, { plan, billing });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await userService.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      // Users can only update their own profile
      const user = await userService.updateUser(req.user.userId, req.body);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      // Users can only delete their own account
      const user = await userService.deleteUser(req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async completeTour(req, res) {
    try {
      const user = await userService.updateUser(req.user.userId, { firstTour: true });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'Tour completed' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPlan(req, res) {
    try {
      const { getEffectivePlan, getPlanLimits } = require('../../config/plans');
      const user = await userService.getUserById(req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const effectivePlan = getEffectivePlan(user);
      const limits = getPlanLimits(effectivePlan);

      res.json({
        plan: effectivePlan,
        limits,
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new UserController();
