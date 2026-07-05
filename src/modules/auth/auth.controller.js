const authService = require('./auth.service');
const { signupSchema, loginSchema } = require('./auth.validation');

class AuthController {
  async signup(req, res) {
    try {
      const { error, value } = signupSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const result = await authService.signup(value);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      const result = await authService.verifyEmail(token);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await authService.resendVerification(email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
      if (error) {
        const messages = error.details.map(d => d.message);
        return res.status(400).json({ errors: messages });
      }

      const result = await authService.login(value);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  async logout(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      await authService.logout(userId);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const result = await authService.resetPassword(token, password);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();
