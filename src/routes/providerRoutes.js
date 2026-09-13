const express = require('express');
const router = express.Router();
const { getProviders, getProviderById, getCategoryCounts } = require('../controllers/providerController');

router.get('/counts', getCategoryCounts);  // ← MUST be before /:id
router.get('/', getProviders);
router.get('/:id', getProviderById);

module.exports = router;