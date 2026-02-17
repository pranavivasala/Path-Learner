import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPassword from './ForgotPassword';
import { Rocket } from 'lucide-react';

type AuthTab = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Learning Path Generator
          </h1>
          <p className="text-gray-500 mt-2">
            Personalized day-by-day learning plans powered by AI
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {[
            { key: 'login' as AuthTab, label: 'Login' },
            { key: 'signup' as AuthTab, label: 'Sign Up' },
            { key: 'forgot' as AuthTab, label: 'Reset' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                tab === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div className="card">
          {tab === 'login' && <LoginForm />}
          {tab === 'signup' && <SignupForm onSuccess={() => setTab('login')} />}
          {tab === 'forgot' && <ForgotPassword onSuccess={() => setTab('login')} />}
        </div>
      </div>
    </div>
  );
}
