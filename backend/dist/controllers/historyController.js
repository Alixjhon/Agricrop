"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDiseaseDetection = exports.deleteRecommendation = exports.deleteConversation = exports.getHistory = exports.getStats = void 0;
const db_1 = __importDefault(require("../models/db"));
const queryHelpers_1 = require("../utils/queryHelpers");
const getStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const statsQuery = userId
            ? `
          SELECT
            (SELECT COUNT(*) FROM crop_recommendations WHERE "userId" = $1) AS "cropCount",
            (SELECT COUNT(*) FROM disease_detections WHERE "userId" = $1) AS "diseaseCount",
            (SELECT COUNT(*) FROM conversations WHERE "userId" = $1) AS "chatCount"
        `
            : `
          SELECT
            (SELECT COUNT(*) FROM crop_recommendations) AS "cropCount",
            (SELECT COUNT(*) FROM disease_detections) AS "diseaseCount",
            (SELECT COUNT(*) FROM conversations) AS "chatCount"
        `;
        const statsResult = await db_1.default.query(statsQuery, userId ? [userId] : []);
        const statsRow = statsResult.rows[0];
        const cropCount = (0, queryHelpers_1.toNumber)(statsRow?.cropCount);
        const diseaseCount = (0, queryHelpers_1.toNumber)(statsRow?.diseaseCount);
        const chatCount = (0, queryHelpers_1.toNumber)(statsRow?.chatCount);
        // Calculate yield improvement (mock based on activity)
        const totalActivity = cropCount + diseaseCount + chatCount;
        const yieldImprovement = totalActivity > 0 ? Math.min(Math.round(totalActivity * 1.5), 50) : 0;
        res.json({
            cropsAnalyzed: cropCount,
            diseasesDetected: diseaseCount,
            aiConversations: chatCount,
            yieldImprovement: yieldImprovement
        });
    }
    catch (error) {
        console.error('Error in getStats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
exports.getStats = getStats;
const getHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const historyQuery = userId
            ? `
          SELECT * FROM (
            SELECT
              cr.id,
              NULL::uuid AS "conversationId",
              'recommendation'::text AS type,
              cr.created_at,
              'completed'::text AS status,
              json_build_object('recommendations', cr.recommendations) AS data
            FROM crop_recommendations cr
            WHERE cr."userId" = $1
            ORDER BY cr.created_at DESC
            LIMIT 20
          ) crop_history
          UNION ALL
          SELECT * FROM (
            SELECT
              dd.id,
              NULL::uuid AS "conversationId",
              'disease'::text AS type,
              dd.created_at,
              'completed'::text AS status,
              json_build_object('results', dd.results) AS data
            FROM disease_detections dd
            WHERE dd."userId" = $1
            ORDER BY dd.created_at DESC
            LIMIT 20
          ) disease_history
          UNION ALL
          SELECT * FROM (
            SELECT
              c.id,
              c."conversationId",
              'chat'::text AS type,
              c."lastMessageAt" AS created_at,
              'completed'::text AS status,
              json_build_object(
                'title', c.title,
                'messageCount', c."messageCount",
                'topic', c.topic,
                'preview', cm.content
              ) AS data
            FROM conversations c
            LEFT JOIN LATERAL (
              SELECT content
              FROM "chatMessages"
              WHERE "conversationId" = c."conversationId" AND "role" = 'user'
              ORDER BY "createdAt" ASC
              LIMIT 1
            ) cm ON true
            WHERE c."userId" = $1
            ORDER BY c."lastMessageAt" DESC
            LIMIT 20
          ) chat_history
          ORDER BY created_at DESC
          LIMIT 50
        `
            : `
          SELECT * FROM (
            SELECT
              cr.id,
              NULL::uuid AS "conversationId",
              'recommendation'::text AS type,
              cr.created_at,
              'completed'::text AS status,
              json_build_object('recommendations', cr.recommendations) AS data
            FROM crop_recommendations cr
            ORDER BY cr.created_at DESC
            LIMIT 20
          ) crop_history
          UNION ALL
          SELECT * FROM (
            SELECT
              dd.id,
              NULL::uuid AS "conversationId",
              'disease'::text AS type,
              dd.created_at,
              'completed'::text AS status,
              json_build_object('results', dd.results) AS data
            FROM disease_detections dd
            ORDER BY dd.created_at DESC
            LIMIT 20
          ) disease_history
          UNION ALL
          SELECT * FROM (
            SELECT
              c.id,
              c."conversationId",
              'chat'::text AS type,
              c."lastMessageAt" AS created_at,
              'completed'::text AS status,
              json_build_object(
                'title', c.title,
                'messageCount', c."messageCount",
                'topic', c.topic,
                'preview', cm.content
              ) AS data
            FROM conversations c
            LEFT JOIN LATERAL (
              SELECT content
              FROM "chatMessages"
              WHERE "conversationId" = c."conversationId" AND "role" = 'user'
              ORDER BY "createdAt" ASC
              LIMIT 1
            ) cm ON true
            ORDER BY c."lastMessageAt" DESC
            LIMIT 20
          ) chat_history
          ORDER BY created_at DESC
          LIMIT 50
        `;
        const historyResult = await db_1.default.query(historyQuery, userId ? [userId] : []);
        res.json({ history: historyResult.rows });
    }
    catch (error) {
        console.error('Error in getHistory:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};
exports.getHistory = getHistory;
const deleteConversation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // First verify the conversation belongs to this user
        const convCheck = await db_1.default.query('SELECT 1 FROM conversations WHERE "conversationId" = $1 AND "userId" = $2', [conversationId, userId]);
        if (convCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        // Delete the conversation (messages will be deleted via cascade if set up, or delete manually)
        await db_1.default.query('DELETE FROM "chatMessages" WHERE "conversationId" = $1', [conversationId]);
        await db_1.default.query('DELETE FROM conversations WHERE "conversationId" = $1', [conversationId]);
        res.json({ success: true, message: 'Conversation deleted' });
    }
    catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
};
exports.deleteConversation = deleteConversation;
const deleteRecommendation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const check = await db_1.default.query('SELECT 1 FROM crop_recommendations WHERE id = $1 AND "userId" = $2', [id, userId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found' });
        }
        await db_1.default.query('DELETE FROM crop_recommendations WHERE id = $1 AND "userId" = $2', [id, userId]);
        res.json({ success: true, message: 'Recommendation deleted' });
    }
    catch (error) {
        console.error('Error deleting recommendation:', error);
        res.status(500).json({ error: 'Failed to delete recommendation' });
    }
};
exports.deleteRecommendation = deleteRecommendation;
const deleteDiseaseDetection = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const check = await db_1.default.query('SELECT 1 FROM disease_detections WHERE id = $1 AND "userId" = $2', [id, userId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Disease detection not found' });
        }
        await db_1.default.query('DELETE FROM disease_detections WHERE id = $1 AND "userId" = $2', [id, userId]);
        res.json({ success: true, message: 'Disease detection deleted' });
    }
    catch (error) {
        console.error('Error deleting disease detection:', error);
        res.status(500).json({ error: 'Failed to delete disease detection' });
    }
};
exports.deleteDiseaseDetection = deleteDiseaseDetection;
//# sourceMappingURL=historyController.js.map