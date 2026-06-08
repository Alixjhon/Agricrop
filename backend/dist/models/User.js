"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const db_1 = __importDefault(require("./db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserModel {
    static async create(name, email, password) {
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // PostgreSQL uses RETURNING clause
        const query = `
      INSERT INTO users (name, email, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, email, phone, location, image_url, created_at, updated_at
    `;
        const result = await db_1.default.query(query, [name, email, passwordHash]);
        return result.rows[0];
    }
    static async findByEmail(email) {
        const query = `
      SELECT id, name, email, password_hash, phone, location, image_url, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
        const result = await db_1.default.query(query, [email]);
        return result.rows[0] || null;
    }
    static async findById(id) {
        const query = 'SELECT id, name, email, phone, location, image_url, created_at, updated_at FROM users WHERE id = $1';
        const result = await db_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    static async updateProfile(userId, data) {
        const { name, email, phone, location, image_url } = data;
        const now = new Date().toISOString();
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            params.push(email);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            params.push(phone);
        }
        if (location !== undefined) {
            updates.push(`location = $${paramIndex++}`);
            params.push(location);
        }
        if (image_url !== undefined) {
            updates.push(`image_url = $${paramIndex++}`);
            params.push(image_url);
        }
        if (updates.length === 0) {
            return this.findById(userId);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(now);
        params.push(userId);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, email, phone, location, image_url, created_at, updated_at`;
        const result = await db_1.default.query(query, params);
        return result.rows[0] || null;
    }
    static async verifyPassword(email, password) {
        const user = await this.findByEmail(email);
        if (!user || !user.password_hash)
            return null;
        const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid)
            return null;
        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map