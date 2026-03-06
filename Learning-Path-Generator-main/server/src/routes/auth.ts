import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../database';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// --- Password Validation ---
function isPasswordStrong(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true, message: '' };
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { username, password, secretQuestion, secretAnswer } = req.body;

  if (!username || !password || !secretQuestion || !secretAnswer) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  if (db.userExists(username)) {
    res.status(409).json({ error: 'Username already exists.' });
    return;
  }

  const strength = isPasswordStrong(password);
  if (!strength.valid) {
    res.status(400).json({ error: strength.message });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const hashedAnswer = await bcrypt.hash(secretAnswer.toLowerCase(), 10);

  const success = db.addUser(username, hashedPassword, secretQuestion, hashedAnswer);
  if (success) {
    res.status(201).json({ message: 'Account created successfully.' });
  } else {
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const user = db.getUser(username);
  if (!user) {
    res.status(401).json({ error: 'Incorrect username or password.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect username or password.' });
    return;
  }

  const token = generateToken(username);
  res.json({ token, username });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ username: req.user!.username });
});

// POST /api/auth/forgot-password/question
router.post('/forgot-password/question', (req: Request, res: Response) => {
  const { username } = req.body;
  const question = db.getSecretQuestion(username);
  if (!question) {
    res.status(404).json({ error: 'Username not found.' });
    return;
  }
  res.json({ question });
});

// POST /api/auth/forgot-password/verify
router.post('/forgot-password/verify', async (req: Request, res: Response) => {
  const { username, answer } = req.body;
  const storedHash = db.getSecretAnswer(username);
  if (!storedHash) {
    res.status(404).json({ error: 'Username not found.' });
    return;
  }

  const valid = await bcrypt.compare(answer.toLowerCase(), storedHash);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect answer.' });
    return;
  }
  res.json({ verified: true });
});

// POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', async (req: Request, res: Response) => {
  const { username, answer, newPassword } = req.body;

  // Re-verify the answer for security
  const storedHash = db.getSecretAnswer(username);
  if (!storedHash) {
    res.status(404).json({ error: 'Username not found.' });
    return;
  }
  const valid = await bcrypt.compare(answer.toLowerCase(), storedHash);
  if (!valid) {
    res.status(401).json({ error: 'Verification failed.' });
    return;
  }

  const strength = isPasswordStrong(newPassword);
  if (!strength.valid) {
    res.status(400).json({ error: strength.message });
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.resetPassword(username, hashedPassword);
  res.json({ message: 'Password has been reset successfully.' });
});

export default router;
