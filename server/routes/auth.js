const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', auth, getMe);
router.post('/change-password', auth, changePassword);

module.exports = router;
