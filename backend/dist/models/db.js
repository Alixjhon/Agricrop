"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSQLite = exports.db = void 0;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const connectionString = process.env.DATABASE_URL;
const shouldLogPoolEvents = process.env.DEBUG_DB_LOGS === 'true';
if (!connectionString) {
    console.error('DATABASE_URL is required. Please set the DATABASE_URL environment variable.');
    console.error('Example: DATABASE_URL=postgresql://user:password@localhost:5432/cropwise');
    process.exit(1);
}
// Parse the connection string to handle Neon pooler properly
const url = new URL(connectionString);
const isNeonPooler = url.hostname.includes('-pooler');
// Clean connection string - remove sslmode as pg pool handles SSL separately
let cleanConnectionString = connectionString;
if (connectionString.includes('sslmode=')) {
    const urlObj = new URL(connectionString);
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('channel_binding');
    cleanConnectionString = urlObj.toString();
    console.log('Removed sslmode from connection string for explicit SSL handling');
}
// Configure pool settings
const poolConfig = {
    connectionString: cleanConnectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
    max: isNeonPooler ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false,
};
if (isNeonPooler) {
    console.log('Using optimized settings for Neon pooler endpoint');
}
// Create the pool
const pool = new pg_1.Pool(poolConfig);
// Track connection health
let connectionAttempts = 0;
const maxRetries = 3;
pool.on('connect', () => {
    if (shouldLogPoolEvents) {
        console.log('Connected to PostgreSQL database');
    }
    connectionAttempts = 0;
});
pool.on('acquire', () => {
    if (shouldLogPoolEvents) {
        console.log('Client acquired from pool');
    }
});
pool.on('remove', () => {
    if (shouldLogPoolEvents) {
        console.log('Client removed from pool');
    }
});
pool.on('error', (err) => {
    connectionAttempts++;
    console.error(`PostgreSQL pool error (attempt ${connectionAttempts}/${maxRetries}):`, err.message);
    if (connectionAttempts >= maxRetries) {
        console.error(`PostgreSQL connection failed after ${maxRetries} attempts.`);
        console.error('Please check your DATABASE_URL and ensure the database is accessible.');
    }
});
// Helper function to test connection with timeout
async function testConnection() {
    try {
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            connectionAttempts = 0;
            return true;
        }
        catch (error) {
            connectionAttempts++;
            console.error(`PostgreSQL connection test failed (attempt ${connectionAttempts}):`, error);
            return false;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        connectionAttempts++;
        console.error(`Failed to get PostgreSQL client (attempt ${connectionAttempts}):`, error);
        return false;
    }
}
// Wrapper that provides a unified interface
exports.db = {
    async query(sql, params = []) {
        const client = await pool.connect();
        try {
            const result = await client.query(sql, params);
            connectionAttempts = 0;
            return { rows: result.rows, rowCount: result.rowCount ?? 0 };
        }
        catch (error) {
            connectionAttempts++;
            console.error('PostgreSQL query failed:', error.message);
            throw error;
        }
        finally {
            client.release();
        }
    },
    get totalCount() { return pool.totalCount; },
    get idleCount() { return pool.idleCount; },
    get waitingCount() { return pool.waitingCount; },
    on: (event, listener) => {
        return pool.on(event, listener);
    },
    isUsingSQLite: () => false,
    isUsingPostgreSQL: () => true,
    async end() {
        return pool.end();
    }
};
exports.useSQLite = false;
// Export the wrapper as default for backward compatibility
exports.default = exports.db;
//# sourceMappingURL=db.js.map