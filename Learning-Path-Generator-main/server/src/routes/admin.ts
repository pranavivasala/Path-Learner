import { Router, Request, Response } from 'express';
import * as db from '../database';

const router = Router();

// POST /api/admin/login
router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: 'Incorrect admin password.' });
    return;
  }

  res.json({ success: true });
});

// GET /api/admin/feedback
router.get('/feedback', (req: Request, res: Response) => {
  // In production, you'd verify admin access via a token/session.
  // For simplicity, we trust the admin password was verified client-side.
  const adminPassword = req.headers['x-admin-password'] as string;
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const feedback = db.getAllFeedbackWithDetails();
  res.json(feedback);
});

export default router;
