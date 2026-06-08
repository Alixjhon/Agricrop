import pool from './db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  location?: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  image_url?: string;
}

export class UserModel {
  static async create(name: string, email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);

    // PostgreSQL uses RETURNING clause
    const query = `
      INSERT INTO users (name, email, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, email, phone, location, image_url, created_at, updated_at
    `;
    const result = await pool.query(query, [name, email, passwordHash]);
    return result.rows[0] as unknown as User;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, name, email, password_hash, phone, location, image_url, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return (result.rows[0] as unknown as User) || null;
  }

  static async findById(id: number): Promise<User | null> {
    const query = 'SELECT id, name, email, phone, location, image_url, created_at, updated_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rows[0] as unknown as User) || null;
  }

  static async updateProfile(userId: number, data: UpdateProfileData): Promise<User | null> {
    const { name, email, phone, location, image_url } = data;
    const now = new Date().toISOString();

    const updates: string[] = [];
    const params: unknown[] = [];
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
    const result = await pool.query(query, params);
    return (result.rows[0] as unknown as User) || null;
  }

  static async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
