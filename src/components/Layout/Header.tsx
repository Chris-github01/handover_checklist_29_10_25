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
      'Admin': 'bg-brp-primarySoft text-brp-primary',
      'Director': 'bg-brp-primarySoft text-brp-primary',
      'QS': 'bg-green-100 text-green-800',
      'PM/SM': 'bg-orange-100 text-orange-800',
      'Estimating': 'bg-teal-100 text-teal-800',
      'Commercial': 'bg-slate-100 text-slate-800',
      'QA': 'bg-slate-100 text-slate-800',
      'H&S': 'bg-red-100 text-red-800',
      'Read-only': 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Handover Checklist</h1>
          <p className="text-gray-600">Optimal Fire Systems</p>
        </div>

        <div className="flex items-center space-x-4">
          {userProfile && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{userProfile.name}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userProfile.role)}`}>
                    {userProfile.role}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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