const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getNotifications, markAsRead } = require('../controllers/notificationController');

router.use(auth);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
