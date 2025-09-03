const express = require('express');
const { PORT } = require('./config.js');
const logger = require('./utils/logger.js');

let app = express();

// Add request logging middleware
app.use(logger.requestLogger());

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('wwwroot'));

// API routes
app.use('/api', require('./routes/auth.js'));
app.use('/api', require('./routes/models.js'));

// Global error handler
app.use(logger.errorHandler());

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: { message: 'API endpoint not found' } });
});

// Start server
const server = app.listen(PORT, function () { 
    logger.info(`Server started successfully`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT signal, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason: reason, promise: promise });
    process.exit(1);
});
