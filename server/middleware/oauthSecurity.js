const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// In-memory state store for OAuth CSRF validation (with TTL of 10 mins)
const oauthStateStore = new Map();

// Clean up expired states every 5 mins
setInterval(() => {
  const now = Date.now();
  for (const [state, meta] of oauthStateStore.entries()) {
    if (now - meta.createdAt > 10 * 60 * 1000) {
      oauthStateStore.delete(state);
    }
  }
}, 5 * 60 * 1000);

const generateStateToken = (provider) => {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStateStore.set(state, { provider, createdAt: Date.now() });
  return state;
};

const verifyStateToken = (state, provider) => {
  if (!state || !oauthStateStore.has(state)) return false;
  const meta = oauthStateStore.get(state);
  oauthStateStore.delete(state); // One-time use to prevent replay attacks
  return meta.provider === provider;
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

// 1. GitHub OAuth
exports.githubLogin = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';
  
  if (!clientId) {
    return res.status(503).json({
      message: 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in server/.env',
    });
  }

  const state = generateStateToken('github');
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;
  res.json({ url: githubAuthUrl });
};

exports.githubCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    const { code, state } = req.query;

    if (!code || !state || !verifyStateToken(state, 'github')) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('CSRF State validation failed. Possible unauthorized OAuth request.')}`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Server-to-server token exchange
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Failed to retrieve GitHub access token.')}`);
    }

    // Fetch GitHub User Profile & Email
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const emailsRes = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const primaryEmailObj = emailsRes.data.find((e) => e.primary && e.verified) || emailsRes.data[0];
    const email = primaryEmailObj ? primaryEmailObj.email.toLowerCase() : `${userRes.data.login}@github.oauth`;
    const name = userRes.data.name || userRes.data.login || 'GitHub User';

    // Find or create User in MongoDB
    let user = await User.findOne({ email });
    if (!user) {
      // Create account with strong random password for OAuth user
      const randomPassword = crypto.randomBytes(24).toString('hex') + '1A!';
      user = await User.create({
        name,
        email,
        password: randomPassword,
      });
    }

    const token = signToken(user._id);
    res.redirect(`${clientUrl}/login?token=${token}`);
  } catch (err) {
    console.error('GitHub OAuth Error:', err.message);
    res.redirect(`${clientUrl}/login?error=${encodeURIComponent('GitHub Authentication failed.')}`);
  }
};

// 2. LinkedIn OAuth
exports.linkedinLogin = (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:5000/api/auth/linkedin/callback';

  if (!clientId) {
    return res.status(503).json({
      message: 'LinkedIn OAuth is not configured. Please set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in server/.env',
    });
  }

  const state = generateStateToken('linkedin');
  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=openid%20profile%20email`;
  res.json({ url: linkedinAuthUrl });
};

exports.linkedinCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    const { code, state } = req.query;

    if (!code || !state || !verifyStateToken(state, 'linkedin')) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('CSRF State validation failed. Possible unauthorized OAuth request.')}`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:5000/api/auth/linkedin/callback';

    // Server-to-server token exchange
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.redirect(`${clientUrl}/login?error=${encodeURIComponent('Failed to retrieve LinkedIn access token.')}`);
    }

    // Fetch user profile from OpenID userinfo endpoint
    const userRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const email = userRes.data.email ? userRes.data.email.toLowerCase() : `${userRes.data.sub}@linkedin.oauth`;
    const name = userRes.data.name || `${userRes.data.given_name || ''} ${userRes.data.family_name || ''}`.trim() || 'LinkedIn User';

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString('hex') + '1A!';
      user = await User.create({
        name,
        email,
        password: randomPassword,
      });
    }

    const token = signToken(user._id);
    res.redirect(`${clientUrl}/login?token=${token}`);
  } catch (err) {
    console.error('LinkedIn OAuth Error:', err.message);
    res.redirect(`${clientUrl}/login?error=${encodeURIComponent('LinkedIn Authentication failed.')}`);
  }
};
