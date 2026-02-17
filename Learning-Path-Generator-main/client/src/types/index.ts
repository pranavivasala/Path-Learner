// --- API Types ---
export interface Task {
  title: string;
  description: string;
  exampleLink: string;
}

export interface DayPlan {
  day: number;
  tasks: Task[];
}

export interface PathData {
  dailyPlan: DayPlan[];
}

export interface LearningPath {
  id: number;
  topic: string;
  pathData: PathData | null;
  totalDurationText: string;
  taskStatuses: Record<string, number>;
  feedback: number | null;
}

export interface FeedbackDetail {
  username: string;
  topic: string;
  rating: number;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface User {
  username: string;
}
