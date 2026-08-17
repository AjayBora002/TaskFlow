const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { getComments, createComment, deleteComment } = require('../controllers/commentController');

router.use(auth);

router.get('/', getComments);
router.post('/', createComment);
router.delete('/:commentId', deleteComment);

module.exports = router;
