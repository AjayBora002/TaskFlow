const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const { githubLogin, githubCallback, linkedinLogin, linkedinCallback } = require('../middleware/oauthSecurity');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', auth, getMe);
router.post('/change-password', auth, changePassword);

// OAuth 2.0 Security Endpoints
router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/linkedin', linkedinLogin);
router.get('/linkedin/callback', linkedinCallback);

module.exports = router;
