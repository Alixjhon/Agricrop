import dotenv from 'dotenv';
import pool, { testConnection } from '../models/db';

dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const createTables = async () => {
  try {
    // Test the PostgreSQL connection first
    await testConnection();

    console.log('Creating PostgreSQL database tables...');

    // Users table
    await pool.query(`
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
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS image_url TEXT`);

    // Conversations table
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS disease_detections (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id),
        image_data BYTEA,
        results JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add userId columns to existing tables if they don't exist
    await pool.query(`ALTER TABLE crop_recommendations ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id)`);
    await pool.query(`ALTER TABLE disease_detections ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id)`);

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_crop_recommendations_user ON crop_recommendations("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_crop_recommendations_user_created_at ON crop_recommendations("userId", created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_disease_detections_user ON disease_detections("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_disease_detections_user_created_at ON disease_detections("userId", created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON "chatMessages"("conversationId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_role_created ON "chatMessages"("conversationId", "role", "createdAt")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON "chatMessages"("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations("userId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message ON conversations("userId", "lastMessageAt" DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_uuid ON conversations("conversationId")`);

    // Legacy chat history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Plantation tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id),
        farm_name VARCHAR(255) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        area_sqm DOUBLE PRECISION NOT NULL,
        area_hectares DOUBLE PRECISION NOT NULL,
        polygon_geojson JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plantations (
        id SERIAL PRIMARY KEY,
        farm_id INTEGER REFERENCES farms(id),
        recommendation_id VARCHAR(64),
        crop_name VARCHAR(255) NOT NULL,
        planting_date DATE NOT NULL,
        expected_harvest_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        progress_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        plantation_id INTEGER REFERENCES plantations(id),
        event_type VARCHAR(120) NOT NULL,
        scheduled_date DATE NOT NULL,
        adjusted_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        adjustment_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS farm_costs (
        id SERIAL PRIMARY KEY,
        plantation_id INTEGER REFERENCES plantations(id),
        seed_cost NUMERIC DEFAULT 0,
        fertilizer_cost NUMERIC DEFAULT 0,
        labor_cost NUMERIC DEFAULT 0,
        irrigation_cost NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure plantation_id is unique so we can UPSERT cost rows.
    await pool.query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'farm_costs_plantation_id_key'
         ) THEN
           ALTER TABLE farm_costs
             ADD CONSTRAINT farm_costs_plantation_id_key UNIQUE (plantation_id);
         END IF;
       END $$;`
    );

    // Calendar event enhancement columns
    await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS completed_at DATE`);
    await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS skipped_at DATE`);
    await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rescheduled_to DATE`);
    await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reschedule_reason TEXT`);

    // Per-activity cost entries so users can log real spend as they complete tasks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_event_costs (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
        plantation_id INTEGER REFERENCES plantations(id) ON DELETE CASCADE,
        category VARCHAR(40) NOT NULL DEFAULT 'other',
        amount NUMERIC NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cec_event ON calendar_event_costs(event_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cec_plantation ON calendar_event_costs(plantation_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cec_category ON calendar_event_costs(category)`);

    // Indexes for plantations
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_farms_userid ON farms(userid)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_plantations_farm ON plantations(farm_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_plantation ON calendar_events(plantation_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_farm_costs_plantation ON farm_costs(plantation_id)`);

    console.log('✅ Database tables created successfully!');
    console.log('📋 Tables created: users, conversations, chatMessages, crop_recommendations, disease_detections, chat_history, farms, plantations, calendar_events, farm_costs');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

createTables().catch(console.error);
