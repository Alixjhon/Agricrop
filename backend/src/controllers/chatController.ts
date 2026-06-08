import { Request, Response } from 'express';
import pool from '../models/db';
import { generateFarmingAdvice } from '../services/chatService';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const convId = req.params.convId;
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const result = await pool.query(
      `SELECT role, content
       FROM "chatMessages"
       WHERE "conversationId" = $1 AND "userId" = $2
       ORDER BY "createdAt" ASC`,
      [convId, userId]
    );

    return res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error('Error fetching chat history:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch chat history' });
  }
};

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { message, conversationId } = req.body;
    const userId = (req as unknown as { user?: { userId: string } }).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanMessage = message.trim();

    // Generate AI response using your farming service
    const aiReply = await generateFarmingAdvice(cleanMessage);

    let finalId = conversationId;

    if (!finalId) {
      // Create new conversation with gen_random_uuid()
      const newConv = await pool.query(
        `INSERT INTO conversations ("userId", "conversationId", title, topic, "messageCount", "lastMessageAt")
         VALUES ($1, gen_random_uuid(), $2, 'General', 0, NOW())
         RETURNING "conversationId"`,
        [userId, cleanMessage.substring(0, 30) + '...']
      );
      finalId = newConv.rows[0].conversationId;
    }

    // Insert user message
    await pool.query(
      `INSERT INTO "chatMessages" ("userId", "conversationId", "role", "content")
       VALUES ($1, $2, 'user', $3)`,
      [userId, finalId, cleanMessage]
    );

    // Insert assistant response
    await pool.query(
      `INSERT INTO "chatMessages" ("userId", "conversationId", "role", "content", "fullResponse")
       VALUES ($1, $2, 'assistant', $3, $4)`,
      [userId, finalId, aiReply, JSON.stringify({ reply: aiReply })]
    );

    // Update conversation message count
    await pool.query(
      `UPDATE conversations
       SET "messageCount" = "messageCount" + 2,
           "lastMessageAt" = NOW()
       WHERE "conversationId" = $1`,
      [finalId]
    );

    return res.json({ reply: aiReply, conversationId: finalId });
  } catch (error) {
    console.error('Error in askQuestion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to generate response: ${errorMessage}` });
  }
};