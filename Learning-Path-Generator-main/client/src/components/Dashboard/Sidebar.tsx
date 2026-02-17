import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { adminLogin } from '../../services/api';
import { LogOut, Shield, Rocket, AlertCircle } from 'lucide-react';

interface Props {
  username: string;
  showAdmin: boolean;
  setShowAdmin: (show: boolean) => void;
  adminPassword: string;
  setAdminPassword: (password: string) => void;
}

export default function Sidebar({
  username,
  showAdmin,
  setShowAdmin,
  adminPassword,
  setAdminPassword,
}: Props) {
  const { logout } = useAuth();
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminExpanded, setAdminExpanded] = useState(false);

  const handleAdminLogin = async () => {
    setAdminError('');
    try {
      await adminLogin(adminInput);
      setAdminPassword(adminInput);
      setShowAdmin(true);
    } catch {
      setAdminError('Incorrect password.');
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Learning Path</span>
        </div>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-gray-200">
        <p className="text-sm text-gray-500">Logged in as</p>
        <p className="font-semibold text-gray-900 mt-1">{username}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={() => setShowAdmin(false)}
          className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            !showAdmin
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          My Learning Paths
        </button>

        {/* Admin Section */}
        <div className="mt-4">
          <button
            onClick={() => setAdminExpanded(!adminExpanded)}
            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Admin Dashboard
          </button>

          {adminExpanded && !showAdmin && (
            <div className="px-4 mt-2 space-y-2">
              <input
                type="password"
                className="input-field text-sm"
                placeholder="Admin password"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
              />
              {adminError && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {adminError}
                </div>
              )}
              <button onClick={handleAdminLogin} className="btn-primary w-full text-sm py-2">
                Access
              </button>
            </div>
          )}

          {showAdmin && (
            <div className="px-4 mt-1">
              <span className="text-xs text-green-600 font-medium">Admin access active</span>
            </div>
          )}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
