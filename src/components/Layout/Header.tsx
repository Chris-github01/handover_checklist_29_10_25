import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Settings } from 'lucide-react';

const Header: React.FC = () => {
  const { userProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'Admin': 'bg-slate-800 text-slate-200 border border-slate-700',
      'Director': 'bg-slate-800 text-slate-200 border border-slate-700',
      'QS': 'bg-green-950 text-green-300 border border-green-800',
      'PM/SM': 'bg-orange-950 text-orange-300 border border-orange-800',
      'Estimating': 'bg-teal-950 text-teal-300 border border-teal-800',
      'Commercial': 'bg-slate-800 text-slate-200 border border-slate-700',
      'QA': 'bg-slate-800 text-slate-200 border border-slate-700',
      'H&S': 'bg-red-950 text-red-300 border border-red-800',
      'Read-only': 'bg-gray-800 text-gray-300 border border-gray-700'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-800 text-gray-300 border border-gray-700';
  };

  return (
    <header className="bg-[#1a1a1a] border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Project Handover Checklist</h1>
          <p className="text-gray-400">Optimal Fire Systems</p>
        </div>

        <div className="flex items-center space-x-4">
          {userProfile && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-medium text-gray-100">{userProfile.name}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userProfile.role)}`}>
                    {userProfile.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSignOut}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;