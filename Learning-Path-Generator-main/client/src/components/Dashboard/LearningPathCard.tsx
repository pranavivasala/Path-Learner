import { useState } from 'react';
import type { LearningPath, DayPlan } from '../../types';
import {
  updateTaskStatus,
  submitFeedback,
  extendPath,
  getUserPaths,
} from '../../services/api';
import ProgressGauge from './ProgressGauge';
import {
  Calendar,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
  Info,
} from 'lucide-react';

interface Props {
  path: LearningPath;
  onPathUpdated: (path: LearningPath) => void;
}

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
      if (text.includes(word)) { quantity = value; break; }
    }
  }

  if (quantity === 0 && /day|week|month|year/.test(text)) quantity = 1;
  if (text.includes('month')) return quantity * 30;
  if (text.includes('week')) return quantity * 7;
  if (text.includes('year')) return quantity * 365;
  if (text.includes('day')) return quantity;
  if (quantity > 0) return quantity;
  return 0;
}

export default function LearningPathCard({ path, onPathUpdated }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [extending, setExtending] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<string, number>>(
    path.taskStatuses || {}
  );
  const [localFeedback, setLocalFeedback] = useState<number | null>(path.feedback);
  const [error, setError] = useState('');

  const dailyPlan: DayPlan[] = path.pathData?.dailyPlan || [];

  // Compute all task identifiers & progress
  const allTaskIds = dailyPlan.flatMap((day) =>
    day.tasks.map((task) => `day${day.day}-${task.title}`)
  );
  const completedCount = allTaskIds.filter((id) => localStatuses[id] === 1).length;
  const totalTasks = allTaskIds.length;

  // Extension logic
  const currentDays = dailyPlan.length;
  const totalDaysRequested = parseDays(path.totalDurationText);
  const canExtend = totalDaysRequested > currentDays;
  const daysToGenerateNext = canExtend ? Math.min(totalDaysRequested - currentDays, 7) : 0;

  const handleToggleTask = async (taskIdentifier: string, currentlyCompleted: boolean) => {
    const newCompleted = !currentlyCompleted;
    setLocalStatuses((prev) => ({
      ...prev,
      [taskIdentifier]: newCompleted ? 1 : 0,
    }));

    try {
      await updateTaskStatus(path.id, taskIdentifier, newCompleted);
    } catch {
      // Revert on failure
      setLocalStatuses((prev) => ({
        ...prev,
        [taskIdentifier]: currentlyCompleted ? 1 : 0,
      }));
    }
  };

  const handleFeedback = async (rating: number) => {
    setLocalFeedback(rating);
    try {
      await submitFeedback(path.id, rating);
    } catch {
      setLocalFeedback(path.feedback);
    }
  };

  const handleExtend = async () => {
    setExtending(true);
    setError('');
    try {
      const updatedPath = await extendPath(path.id, 'Beginner');
      setLocalStatuses(updatedPath.taskStatuses || {});
      onPathUpdated(updatedPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to extend the plan.');
    } finally {
      setExtending(false);
    }
  };

  if (!path.pathData) {
    return (
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">
            Could not parse or display the path for: {path.topic}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-xl font-bold text-gray-900">{path.topic}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Goal: {path.totalDurationText} &middot; {currentDays} days generated
          </p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-6">
          {/* Progress Gauge */}
          {totalTasks > 0 && (
            <div className="mb-8 flex justify-center">
              <ProgressGauge completed={completedCount} total={totalTasks} />
            </div>
          )}

          {/* Daily Plans */}
          <div className="space-y-6">
            {dailyPlan.map((day) => (
              <div key={day.day}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-900">
                    Day {day.day}
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent ml-2" />
                </div>

                <div className="space-y-3 ml-7">
                  {day.tasks.map((task) => {
                    const taskId = `day${day.day}-${task.title}`;
                    const isCompleted = localStatuses[taskId] === 1;

                    return (
                      <div
                        key={taskId}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleToggleTask(taskId, isCompleted)}
                            className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <h5
                              className={`font-semibold ${
                                isCompleted
                                  ? 'text-green-800 line-through'
                                  : 'text-gray-900'
                              }`}
                            >
                              {task.title}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">
                              {task.description}
                            </p>
                            {task.exampleLink && (
                              <a
                                href={task.exampleLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Resource Link
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Extend Button */}
          {canExtend && (
            <div className="mt-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <button
                onClick={handleExtend}
                disabled={extending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {extending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate Next {daysToGenerateNext} Days
                  </>
                )}
              </button>
            </div>
          )}

          {/* Feedback */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Was this path helpful?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleFeedback(1)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  localFeedback === 1
                    ? 'bg-green-100 text-green-800 border-2 border-green-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 border-2 border-transparent'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                Helpful
              </button>
              <button
                onClick={() => handleFeedback(-1)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  localFeedback === -1
                    ? 'bg-red-100 text-red-800 border-2 border-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700 border-2 border-transparent'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                Not Helpful
              </button>
            </div>
            {localFeedback !== null && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                <Info className="w-4 h-4 flex-shrink-0" />
                You rated this path as:{' '}
                <strong>{localFeedback === 1 ? 'Helpful' : 'Not Helpful'}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
