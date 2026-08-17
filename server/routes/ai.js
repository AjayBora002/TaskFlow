const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  decomposeTask,
  parseCommandAndCreateTask,
  auditProject,
  generateSpec,
  generateStandupDigest,
} = require('../controllers/aiController');

router.use(auth);

router.post('/decompose', decomposeTask);
router.post('/parse-command', parseCommandAndCreateTask);
router.get('/audit/:projectId', auditProject);
router.post('/generate-spec', generateSpec);
router.get('/digest/:projectId', generateStandupDigest);

module.exports = router;
