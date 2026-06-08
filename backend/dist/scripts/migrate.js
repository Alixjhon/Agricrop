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
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importStar(require("../models/db"));
dotenv_1.default.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const createTables = async () => {
    try {
        // Test the PostgreSQL connection first
        await (0, db_1.testConnection)();
        console.log('Creating PostgreSQL database tables...');
        // Users table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        location VARCHAR(255),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Add new columns if they don't exist
        await db_1.default.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
        await db_1.default.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
        await db_1.default.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url TEXT`);
        // Conversations table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id),
        "conversationId" UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        topic VARCHAR(100) DEFAULT 'General',
        "messageCount" INTEGER DEFAULT 0,
        "lastMessageAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Chat messages table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS "chatMessages" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id),
        "conversationId" UUID NOT NULL,
        "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
        "content" TEXT NOT NULL,
        "fullResponse" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Crop recommendations table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS crop_recommendations (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id),
        ph FLOAT,
        moisture FLOAT,
        temperature FLOAT,
        sunlight VARCHAR(50),
        soil_type VARCHAR(50),
        recommendations JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Disease detections table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS disease_detections (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id),
        image_data BYTEA,
        results JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Add userId columns to existing tables if they don't exist
        await db_1.default.query(`ALTER TABLE crop_recommendations ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id)`);
        await db_1.default.query(`ALTER TABLE disease_detections ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id)`);
        // Indexes
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_crop_recommendations_user ON crop_recommendations("userId")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_crop_recommendations_user_created_at ON crop_recommendations("userId", created_at DESC)`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_disease_detections_user ON disease_detections("userId")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_disease_detections_user_created_at ON disease_detections("userId", created_at DESC)`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON "chatMessages"("conversationId")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_role_created ON "chatMessages"("conversationId", "role", "createdAt")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON "chatMessages"("userId")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations("userId")`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message ON conversations("userId", "lastMessageAt" DESC)`);
        await db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_conversations_uuid ON conversations("conversationId")`);
        // Legacy chat history table
        await db_1.default.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Database tables created successfully!');
        console.log('📋 Tables created: users, conversations, chatMessages, crop_recommendations, disease_detections, chat_history');
    }
    catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};
createTables().catch(console.error);
//# sourceMappingURL=migrate.js.map