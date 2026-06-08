"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const events_1 = require("events");
class SQLiteDB extends events_1.EventEmitter {
    db = null;
    initPromise;
    dataDir = path_1.default.join(process.cwd(), 'data');
    dbPath = path_1.default.join(this.dataDir, 'cropwise.db');
    totalCount = 1;
    idleCount = 1;
    waitingCount = 0;
    constructor() {
        super();
        this.initPromise = this.init();
    }
    async init() {
        if (!fs_1.default.existsSync(this.dataDir)) {
            fs_1.default.mkdirSync(this.dataDir, { recursive: true });
        }
        const SQL = await (0, sql_js_1.default)();
        if (fs_1.default.existsSync(this.dbPath)) {
            const fileBuffer = fs_1.default.readFileSync(this.dbPath);
            this.db = new SQL.Database(fileBuffer);
            console.log(`Loaded SQLite database: ${this.dbPath}`);
        }
        else {
            this.db = new SQL.Database();
            console.log(`Created SQLite database: ${this.dbPath}`);
        }
        this.ensureSchema();
        this.save();
        this.emit('connect');
    }
    ensureSchema() {
        this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        conversationId TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        topic TEXT DEFAULT 'General',
        messageCount INTEGER DEFAULT 0,
        lastMessageAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.run(`
      CREATE TABLE IF NOT EXISTS chatMessages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        conversationId TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        fullResponse TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.run(`
      CREATE TABLE IF NOT EXISTS crop_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        ph REAL,
        moisture REAL,
        temperature REAL,
        sunlight TEXT,
        soil_type TEXT,
        recommendations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        this.run(`
      CREATE TABLE IF NOT EXISTS disease_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        image_data BLOB,
        results TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }
    save() {
        if (!this.db)
            return;
        const data = this.db.export();
        fs_1.default.writeFileSync(this.dbPath, Buffer.from(data));
    }
    run(sql, params = []) {
        if (!this.db)
            throw new Error('SQLite not initialized');
        this.db.run(sql, params);
    }
    async all(sql, params = []) {
        if (!this.db)
            throw new Error('SQLite not initialized');
        const stmt = this.db.prepare(sql, params);
        const columns = stmt.getColumnNames();
        const rows = [];
        while (stmt.step()) {
            const row = {};
            for (let i = 0; i < columns.length; i++) {
                row[columns[i]] = stmt.get(i);
            }
            rows.push(row);
        }
        stmt.free();
        return rows;
    }
    async query(sql, params = []) {
        await this.initPromise;
        if (!this.db)
            throw new Error('SQLite not initialized');
        if (/^(INSERT|UPDATE|DELETE)/i.test(sql.trim())) {
            this.db.run(sql, params);
            const rowCount = this.db.getRowsModified();
            this.save();
            return { rows: [], rowCount };
        }
        const rows = await this.all(sql, params);
        return { rows, rowCount: rows.length };
    }
    async end() {
        await this.initPromise;
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }
}
const sqliteDB = new SQLiteDB();
exports.default = sqliteDB;
//# sourceMappingURL=db-sqlite.js.map