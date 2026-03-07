import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// --- Helper: parse days ---
function parseDays(timePeriodString: string): number {
  if (!timePeriodString) return 0;
  const text = timePeriodString.toLowerCase().trim();

  const numberWords: Record<string, number> = {
    a: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  let quantity = 0;
  const numbers = text.match(/\d+/);
  if (numbers) {
    quantity = parseInt(numbers[0], 10);
  } else {
    for (const [word, value] of Object.entries(numberWords)) {
      if (text.includes(word)) {
        quantity = value;
        break;
      }
    }
  }

  if (quantity === 0 && /day|week|month|year/.test(text)) {
    quantity = 1;
  }

  if (text.includes('month')) return quantity * 30;
  if (text.includes('week')) return quantity * 7;
  if (text.includes('year')) return quantity * 365;
  if (text.includes('day')) return quantity;
  if (quantity > 0) return quantity;
  return 0;
}

function buildPrompt(topic: string, timePeriod: string, skillLevel: string): string {
  const totalDays = parseDays(timePeriod);
  const daysToGenerate = totalDays > 0 ? Math.min(totalDays, 7) : 7;
  const normalizedTimePeriod = `${totalDays} days`;

  return `
    You are an expert instructional designer. Your task is to create a personalized, day-by-day learning path.
    **Topic:** "${topic}"
    **Total Planned Time Frame:** "${normalizedTimePeriod}"
    **Current Skill Level:** "${skillLevel}"
    
    Generate a detailed plan for ${daysToGenerate} days.
    The output must be a clean JSON object and nothing else.
    The top-level JSON object must have a single key "dailyPlan". The value should be an array of day objects.
    Each day object must have two keys: "day" (number) and "tasks" (an array).
    Each task object must have: "title" (string), "description" (string), and "exampleLink" (a real, high-quality URL).
  `;
}

function buildContinuationPrompt(
  existingPlan: any,
  skillLevel: string,
  daysToGenerate: number
): string {
  const dailyPlan = existingPlan.dailyPlan || [];
  const lastDay = dailyPlan.length > 0 ? dailyPlan[dailyPlan.length - 1].day : 0;

  return `
    You are an expert instructional designer continuing a learning plan.
    You are given an existing learning plan that covers the first ${lastDay} days.
    Your task is to generate the *next ${daysToGenerate} days* of the plan, starting from day ${lastDay + 1}.
    The new content should logically follow the existing plan.

    Here is the existing plan for context:
    \`\`\`json
    ${JSON.stringify(existingPlan, null, 2)}
    \`\`\`

    User's Skill Level: "${skillLevel}"

    Generate a JSON object for the next ${daysToGenerate} days only.
    The output must be a clean JSON object with a single key "dailyPlan", containing an array of day objects for days ${lastDay + 1} through ${lastDay + daysToGenerate}.
    Do not repeat the existing plan. Do not add any extra text.
  `;
}

function safeJsonParse(text: string): any | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    if (start === -1 || end === 0) return null;
    return JSON.parse(text.substring(start, end));
  } catch {
    return null;
  }
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
}

// POST /api/paths/generate
router.post('/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { topic, timePeriod, skillLevel } = req.body;
  const username = req.user!.username;

  if (!topic || !timePeriod) {
    res.status(400).json({ error: 'Please fill in all fields.' });
    return;
  }

  try {
    const model = getGeminiModel();
    const prompt = buildPrompt(topic, timePeriod, skillLevel || 'Beginner');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = safeJsonParse(responseText);

    if (!parsed) {
      res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
      return;
    }

    const pathId = db.savePath(username, topic, JSON.stringify(parsed), timePeriod);
    res.json({ pathId, topic, pathData: parsed, totalDurationText: timePeriod });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Generation failed.' });
  }
});

// GET /api/paths
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const username = req.user!.username;
  const paths = db.getUserPaths(username);

  const result = paths.map((p) => {
    const pathData = safeJsonParse(p.path_data);
    const taskStatuses = db.getTaskStatusesForPath(username, p.id);
    const feedback = db.getFeedback(p.id, username);

    return {
      id: p.id,
      topic: p.topic,
      pathData,
      totalDurationText: p.total_duration_text,
      taskStatuses,
      feedback,
    };
  });

  res.json(result);
});

// POST /api/paths/:id/extend
router.post('/:id/extend', authMiddleware, async (req: AuthRequest, res: Response) => {
  const pathId = parseInt(req.params.id, 10);
  const { skillLevel } = req.body;
  const username = req.user!.username;

  const paths = db.getUserPaths(username);
  const pathRow = paths.find((p) => p.id === pathId);
  if (!pathRow) {
    res.status(404).json({ error: 'Path not found.' });
    return;
  }

  const parsed = safeJsonParse(pathRow.path_data);
  if (!parsed) {
    res.status(500).json({ error: 'Failed to parse existing path data.' });
    return;
  }

  const currentDays = parsed.dailyPlan?.length || 0;
  const totalDaysRequested = parseDays(pathRow.total_duration_text);
  const remaining = totalDaysRequested - currentDays;
  const daysToGenerate = Math.min(remaining, 7);

  if (daysToGenerate <= 0) {
    res.status(400).json({ error: 'Plan is already complete.' });
    return;
  }

  try {
    const model = getGeminiModel();
    const prompt = buildContinuationPrompt(parsed, skillLevel || 'Beginner', daysToGenerate);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const newData = safeJsonParse(responseText);

    if (!newData) {
      res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
      return;
    }

    parsed.dailyPlan.push(...(newData.dailyPlan || []));
    db.updatePathData(pathId, JSON.stringify(parsed));

    const taskStatuses = db.getTaskStatusesForPath(username, pathId);
    const feedback = db.getFeedback(pathId, username);

    res.json({
      id: pathId,
      topic: pathRow.topic,
      pathData: parsed,
      totalDurationText: pathRow.total_duration_text,
      taskStatuses,
      feedback,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Extension failed.' });
  }
});

// POST /api/paths/:id/task
router.post('/:id/task', authMiddleware, (req: AuthRequest, res: Response) => {
  const pathId = parseInt(req.params.id, 10);
  const { taskIdentifier, completed } = req.body;
  const username = req.user!.username;

  db.updateTaskStatus(username, pathId, taskIdentifier, completed);
  res.json({ success: true });
});

// POST /api/paths/:id/feedback
router.post('/:id/feedback', authMiddleware, (req: AuthRequest, res: Response) => {
  const pathId = parseInt(req.params.id, 10);
  const { rating } = req.body;
  const username = req.user!.username;

  db.addFeedback(pathId, username, rating);
  res.json({ success: true });
});

export default router;
