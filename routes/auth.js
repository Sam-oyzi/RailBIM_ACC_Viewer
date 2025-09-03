const express = require('express');
const { getViewerToken } = require('../services/aps.js');
const logger = require('../utils/logger.js');

let router = express.Router();

router.get('/auth/token', async function (req, res, next) {
    try {
        logger.debug('Requesting viewer token from APS');
        const token = await getViewerToken();
        logger.info('Viewer token retrieved successfully');
        res.json(token);
    } catch (err) {
        logger.error('Failed to get viewer token', { error: err.message, stack: err.stack });
        err.status = 401;
        next(err);
    }
});

module.exports = router;
