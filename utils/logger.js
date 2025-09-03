const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    constructor() {
        this.level = process.env.LOG_LEVEL || 'INFO';
        this.logToFile = process.env.LOG_TO_FILE !== 'false';
        this.logToConsole = process.env.LOG_TO_CONSOLE !== 'false';
        
        // Create log file paths
        const today = new Date().toISOString().split('T')[0];
        this.errorLogFile = path.join(logsDir, `error-${today}.log`);
        this.combinedLogFile = path.join(logsDir, `combined-${today}.log`);
    }

    shouldLog(level) {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    }

    writeToFile(logFile, formattedMessage) {
        if (this.logToFile) {
            fs.appendFileSync(logFile, formattedMessage + '\n');
        }
    }

    writeToConsole(level, formattedMessage) {
        if (this.logToConsole) {
            switch (level) {
                case 'ERROR':
                    console.error(formattedMessage);
                    break;
                case 'WARN':
                    console.warn(formattedMessage);
                    break;
                case 'DEBUG':
                    console.debug(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
    }

    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Write to console
        this.writeToConsole(level, formattedMessage);
        
        // Write to files
        this.writeToFile(this.combinedLogFile, formattedMessage);
        
        // Write errors to separate error log
        if (level === 'ERROR') {
            this.writeToFile(this.errorLogFile, formattedMessage);
        }
    }

    error(message, meta = {}) {
        this.log('ERROR', message, meta);
    }

    warn(message, meta = {}) {
        this.log('WARN', message, meta);
    }

    info(message, meta = {}) {
        this.log('INFO', message, meta);
    }

    debug(message, meta = {}) {
        this.log('DEBUG', message, meta);
    }

    // Express middleware for request logging
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();
            
            // Log request
            this.info('HTTP Request', {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            });

            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function(...args) {
                const duration = Date.now() - start;
                
                logger.info('HTTP Response', {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`
                });
                
                originalEnd.apply(this, args);
            };

            next();
        };
    }

    // Error handling middleware
    errorHandler() {
        return (err, req, res, next) => {
            this.error('Unhandled Error', {
                message: err.message,
                stack: err.stack,
                url: req.url,
                method: req.method,
                body: req.body,
                params: req.params,
                query: req.query
            });

            // Don't expose internal errors in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            const errorResponse = {
                error: {
                    message: isDevelopment ? err.message : 'Internal Server Error',
                    ...(isDevelopment && { stack: err.stack })
                }
            };

            res.status(err.status || 500).json(errorResponse);
        };
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;