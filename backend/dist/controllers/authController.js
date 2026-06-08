"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: zod_1.z.string().email('Invalid email address').optional(),
    phone: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    image_url: zod_1.z.string().optional(),
});
class AuthController {
    static getAuthenticatedUser(req, res) {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return null;
        }
        return req.user;
    }
    static async register(req, res) {
        try {
            const { name, email, password } = registerSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await User_1.UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: 'User with this email already exists' });
            }
            // Create user in database
            const user = await User_1.UserModel.create(name, email, password);
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
            res.status(201).json({
                message: 'User created successfully',
                user: { id: user.id, name: user.name, email: user.email },
                token
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            // Verify user credentials from database
            const user = await User_1.UserModel.verifyPassword(email, password);
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });
            // Map image_url to image for frontend compatibility
            const { image_url, ...userWithoutImageUrl } = user;
            const userResponse = {
                ...userWithoutImageUrl,
                image: image_url || null
            };
            res.json({
                message: 'Login successful',
                user: userResponse,
                token
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getProfile(req, res) {
        try {
            const authUser = AuthController.getAuthenticatedUser(req, res);
            if (!authUser)
                return;
            const userId = authUser.userId;
            const user = await User_1.UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({ user });
        }
        catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async updateProfile(req, res) {
        try {
            const authUser = AuthController.getAuthenticatedUser(req, res);
            if (!authUser)
                return;
            const userId = authUser.userId;
            const data = updateProfileSchema.parse(req.body);
            const updatedUser = await User_1.UserModel.updateProfile(userId, data);
            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({
                message: 'Profile updated successfully',
                user: updatedUser
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async uploadProfileImage(req, res) {
        try {
            const authUser = AuthController.getAuthenticatedUser(req, res);
            if (!authUser)
                return;
            const userId = authUser.userId;
            const { image_url } = req.body;
            if (!image_url || typeof image_url !== 'string') {
                return res.status(400).json({ error: 'Image URL is required' });
            }
            const updatedUser = await User_1.UserModel.updateProfile(userId, { image_url });
            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json({
                message: 'Profile image updated successfully',
                user: updatedUser
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors[0].message });
            }
            console.error('Upload profile image error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map