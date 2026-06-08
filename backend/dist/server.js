"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importStar(require("./models/db"));
const cropRoutes_1 = require("./routes/cropRoutes");
const diseaseRoutes_1 = require("./routes/diseaseRoutes");
const chatRoutes_1 = require("./routes/chatRoutes");
const historyRoutes_1 = require("./routes/historyRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const locationRoutes_1 = require("./routes/locationRoutes");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5001;
const localDevOrigins = [
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8082',
    'http://127.0.0.1:8082',
];
const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = Array.from(new Set([...localDevOrigins, ...envOrigins]));
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health/db', async (_req, res) => {
    try {
        const connected = await (0, db_1.testConnection)();
        const dbType = 'PostgreSQL';
        if (connected) {
            return res.json({
                status: 'OK',
                database: 'connected',
                type: dbType,
                timestamp: new Date().toISOString(),
            });
        }
        return res.status(500).json({
            status: 'ERROR',
            database: 'disconnected',
            type: dbType,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('DB health error:', error);
        return res.status(500).json({
            status: 'ERROR',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        });
    }
});
const checkDbConnection = (req, _res, next) => {
    if (req.path === '/health' || req.path === '/health/db')
        return next();
    if (db_1.default.waitingCount && db_1.default.waitingCount > 0) {
        console.warn(`Database pool warning: ${db_1.default.waitingCount} requests waiting`);
    }
    return next();
};
app.use(checkDbConnection);
app.use('/api', cropRoutes_1.cropRoutes);
app.use('/api', diseaseRoutes_1.diseaseRoutes);
app.use('/api', chatRoutes_1.chatRoutes);
app.use('/api', historyRoutes_1.historyRoutes);
app.use('/api', authRoutes_1.authRoutes);
app.use('/api', locationRoutes_1.locationRoutes);
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    if (err?.message?.startsWith('CORS blocked')) {
        return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong!' });
});
const startServer = async () => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Health check available at /health');
        console.log('DB health check available at /health/db');
        console.log('Allowed CORS origins:', allowedOrigins);
    });
    try {
        const connected = await (0, db_1.testConnection)();
        if (connected) {
            console.log('Database connected successfully using PostgreSQL');
        }
        else {
            console.warn('Database connection test failed.');
            console.warn('Check your DATABASE_URL environment variable.');
        }
    }
    catch (error) {
        console.error('Failed to connect to database:', error);
        console.warn('Server is running without confirmed DB connection.');
        console.warn('Please verify your DATABASE_URL is correct and the database is accessible.');
    }
};
startServer();
//# sourceMappingURL=server.js.map