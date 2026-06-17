const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../utils/supabase');
const { logger } = require('../utils/logger');

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, source: 'web' }
    }
  });

  if (error) {
    logger.error('Registration error', { error: error.message });
    return res.status(400).json({ error: error.message });
  }

  // Create user record
  if (data.user) {
    await supabaseAdmin.from('users').upsert({
      id: data.user.id,
      email,
      name: name || '',
      source: 'web',
      notification_enabled: true,
      created_at: new Date().toISOString()
    });
  }

  res.status(201).json({
    message: 'Registration successful. Please check your email to verify your account.',
    user: { id: data.user?.id, email: data.user?.email }
  });
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name
    },
    expires_at: data.session.expires_at
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await supabase.auth.signOut();
  }
  res.json({ success: true });
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error) return res.status(401).json({ error: 'Invalid refresh token' });

  res.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    expires_at: data.session?.expires_at
  });
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password reset link sent to your email' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  res.json({ user: data.user });
});

module.exports = router;
