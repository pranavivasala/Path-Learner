import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserPaths } from '../../services/api';
import type { LearningPath } from '../../types';
import Sidebar from './Sidebar';
import GeneratePathForm from './GeneratePathForm';
import LearningPathCard from './LearningPathCard';
import AdminDashboard from './AdminDashboard';
import { BookOpen } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const fetchPaths = useCallback(async () => {
    try {
      const data = await getUserPaths();
      setPaths(data);
    } catch (err) {
      console.error('Failed to fetch paths:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  const handlePathGenerated = () => {
    fetchPaths();
  };

  const handlePathUpdated = (updatedPath: LearningPath) => {
    setPaths((prev) =>
      prev.map((p) => (p.id === updatedPath.id ? updatedPath : p))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        username={user?.username || ''}
        showAdmin={showAdmin}
        setShowAdmin={setShowAdmin}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
      />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {showAdmin ? (
          <AdminDashboard adminPassword={adminPassword} />
        ) : (
          <>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">
                Generate a New Learning Path
              </h1>

              <GeneratePathForm onGenerated={handlePathGenerated} />

              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Your Saved Learning Paths
                </h2>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  </div>
                ) : paths.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-gray-500 text-lg">
                      You haven't generated any paths yet.
                    </p>
                    <p className="text-gray-400 mt-2">
                      Use the form above to create your first learning plan!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {paths.map((path) => (
                      <LearningPathCard
                        key={path.id}
                        path={path}
                        onPathUpdated={handlePathUpdated}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
