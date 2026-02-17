import { useState, useEffect } from 'react';
import { getAdminFeedback } from '../../services/api';
import type { FeedbackDetail } from '../../types';
import { Shield, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Props {
  adminPassword: string;
}

export default function AdminDashboard({ adminPassword }: Props) {
  const [feedback, setFeedback] = useState<FeedbackDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeedback() {
      try {
        const data = await getAdminFeedback(adminPassword);
        setFeedback(data);
      } catch {
        console.error('Failed to fetch admin feedback');
      } finally {
        setLoading(false);
      }
    }
    fetchFeedback();
  }, [adminPassword]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-amber-500" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          All User Feedback
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : feedback.length === 0 ? (
          <p className="text-gray-500 py-4">No feedback has been submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Username
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Topic
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {item.username}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{item.topic}</td>
                    <td className="py-3 px-4 text-center">
                      {item.rating === 1 ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ThumbsUp className="w-3 h-3" />
                          Helpful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-1 rounded-full text-xs font-medium">
                          <ThumbsDown className="w-3 h-3" />
                          Not Helpful
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
