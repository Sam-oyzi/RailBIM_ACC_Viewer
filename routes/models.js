const express = require('express');
const formidable = require('express-formidable');
const { listObjects, uploadObject, translateObject, getManifest, urnify } = require('../services/aps.js');
const logger = require('../utils/logger.js');

let router = express.Router();

router.get('/models', async function (req, res, next) {
    try {
        logger.debug('Listing available models');
        const objects = await listObjects();
        const models = objects.map(o => ({
            name: o.objectKey,
            urn: urnify(o.objectId)
        }));
        logger.info('Models listed successfully', { count: models.length });
        res.json(models);
    } catch (err) {
        logger.error('Error listing models', { error: err.message, stack: err.stack });
        err.status = 500;
        next(err);
    }
});

router.get('/models/:urn/status', async function (req, res, next) {
    try {
        const { urn } = req.params;
        
        // Basic URN validation
        if (!urn || typeof urn !== 'string') {
            logger.warn('Invalid URN parameter provided', { urn });
            return res.status(400).json({ error: { message: 'Invalid URN parameter' } });
        }
        
        logger.debug('Getting model status', { urn });
        const manifest = await getManifest(urn);
        if (manifest) {
            let messages = [];
            if (manifest.derivatives) {
                for (const derivative of manifest.derivatives) {
                    messages = messages.concat(derivative.messages || []);
                    if (derivative.children) {
                        for (const child of derivative.children) {
                            messages = messages.concat(child.messages || []);
                        }
                    }
                }
            }
            logger.debug('Model status retrieved', { urn, status: manifest.status, progress: manifest.progress });
            res.json({ status: manifest.status, progress: manifest.progress, messages });
        } else {
            logger.debug('No manifest found for model', { urn });
            res.json({ status: 'n/a' });
        }
    } catch (err) {
        logger.error('Error getting model status', { urn: req.params.urn, error: err.message, stack: err.stack });
        err.status = 500;
        next(err);
    }
});

router.post('/models', formidable({ 
    maxFileSize: 100 * 1024 * 1024, // 100MB limit
    keepExtensions: true 
}), async function (req, res, next) {
    try {
        const file = req.files['model-file'];
        
        // Validate file upload
        if (!file) {
            logger.warn('File upload attempted without file');
            return res.status(400).json({ 
                error: { message: 'The required field "model-file" is missing.' } 
            });
        }
        
        logger.info('File upload started', { 
            filename: file.name, 
            size: file.size,
            mimetype: file.type 
        });
        
        // Validate file type
        const allowedExtensions = ['.rvt', '.dwg', '.ifc', '.nwd', '.3ds', '.fbx', '.obj', '.step', '.iges', '.zip'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedExtensions.includes(fileExtension)) {
            logger.warn('Unsupported file type uploaded', { filename: file.name, extension: fileExtension });
            return res.status(400).json({ 
                error: { 
                    message: `Unsupported file type: ${fileExtension}. Allowed types: ${allowedExtensions.join(', ')}` 
                } 
            });
        }
        
        // Validate file size (additional check)
        if (file.size > 100 * 1024 * 1024) {
            logger.warn('File too large uploaded', { filename: file.name, size: file.size, maxSize: 100 * 1024 * 1024 });
            return res.status(400).json({ 
                error: { message: 'File size exceeds 100MB limit.' } 
            });
        }
        
        logger.debug('Uploading file to APS', { filename: file.name });
        
        const obj = await uploadObject(file.name, file.path);
        
        logger.debug('Starting model translation', { objectId: obj.objectId });
        await translateObject(urnify(obj.objectId), req.fields['model-zip-entrypoint']);
        
        const result = {
            name: obj.objectKey,
            urn: urnify(obj.objectId)
        };
        
        logger.info('Model uploaded and translation started successfully', result);
        res.status(201).json(result);
        
    } catch (err) {
        logger.error('Error uploading model', { 
            filename: req.files?.['model-file']?.name,
            error: err.message, 
            stack: err.stack 
        });
        err.status = 500;
        next(err);
    }
});

module.exports = router;
