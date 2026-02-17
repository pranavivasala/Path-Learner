import axios from 'axios';
import type { AuthResponse, LearningPath, FeedbackDetail } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
  return data;
}

export async function signup(
  username: string,
  password: string,
  secretQuestion: string,
  secretAnswer: string
): Promise<{ message: string }> {
  const { data } = await api.post('/auth/signup', {
    username,
    password,
    secretQuestion,
    secretAnswer,
  });
  return data;
}

export async function getSecretQuestion(username: string): Promise<{ question: string }> {
  const { data } = await api.post('/auth/forgot-password/question', { username });
  return data;
}

export async function verifySecretAnswer(
  username: string,
  answer: string
): Promise<{ verified: boolean }> {
  const { data } = await api.post('/auth/forgot-password/verify', { username, answer });
  return data;
}

export async function resetPassword(
  username: string,
  answer: string,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await api.post('/auth/forgot-password/reset', {
    username,
    answer,
    newPassword,
  });
  return data;
}

// Learning Paths
export async function generatePath(
  topic: string,
  timePeriod: string,
  skillLevel: string
): Promise<LearningPath> {
  const { data } = await api.post('/paths/generate', { topic, timePeriod, skillLevel });
  return data;
}

export async function getUserPaths(): Promise<LearningPath[]> {
  const { data } = await api.get<LearningPath[]>('/paths');
  return data;
}

export async function extendPath(
  pathId: number,
  skillLevel: string
): Promise<LearningPath> {
  const { data } = await api.post(`/paths/${pathId}/extend`, { skillLevel });
  return data;
}

export async function updateTaskStatus(
  pathId: number,
  taskIdentifier: string,
  completed: boolean
): Promise<void> {
  await api.post(`/paths/${pathId}/task`, { taskIdentifier, completed });
}

export async function submitFeedback(pathId: number, rating: number): Promise<void> {
  await api.post(`/paths/${pathId}/feedback`, { rating });
}

// Admin
export async function adminLogin(password: string): Promise<{ success: boolean }> {
  const { data } = await api.post('/admin/login', { password });
  return data;
}

export async function getAdminFeedback(
  adminPassword: string
): Promise<FeedbackDetail[]> {
  const { data } = await api.get<FeedbackDetail[]>('/admin/feedback', {
    headers: { 'x-admin-password': adminPassword },
  });
  return data;
}
