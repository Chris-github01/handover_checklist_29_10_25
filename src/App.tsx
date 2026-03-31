import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import ResetPasswordForm from './components/Auth/ResetPasswordForm';
import Header from './components/Layout/Header';
import ProjectList from './components/Projects/ProjectList';
import StageGrid from './components/Stages/StageGrid';
import { supabase } from './lib/supabase';
import Button from './components/ui/Button';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; bwof: boolean; isSmallProject: boolean; code?: string; client: string; status: string; smallProjectSteps?: number[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'in_progress' | 'complete' | 'closed'>('in_progress');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Check for password recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      console.log('App: Checking for recovery...', {
        hash: window.location.hash,
        search: window.location.search,
        href: window.location.href
      });

      // Supabase can send tokens in multiple formats:
      // 1. Query params: ?token_hash=...&type=recovery (recommended)
      // 2. Hash params: #access_token=...&type=recovery&refresh_token=...
      let type: string | null = null;
      let tokenHash: string | null = null;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let error: string | null = null;
      let errorDescription: string | null = null;

      // First check query params (standard Supabase format)
      const queryParams = new URLSearchParams(window.location.search);
      type = queryParams.get('type');
      tokenHash = queryParams.get('token_hash');
      error = queryParams.get('error');
      errorDescription = queryParams.get('error_description');

      // Also check hash params (alternative format)
      if (window.location.hash) {
        const hashString = window.location.hash.substring(1); // Remove the #
        const hashParams = new URLSearchParams(hashString);
        type = type || hashParams.get('type');
        tokenHash = tokenHash || hashParams.get('token_hash');
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        error = error || hashParams.get('error');
        errorDescription = errorDescription || hashParams.get('error_description');
      }

      console.log('App: Recovery params:', {
        type,
        hasTokenHash: !!tokenHash,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        error,
        errorDescription
      });

      if (error) {
        console.error('App: Auth error:', error, errorDescription);
        alert(`Authentication error: ${errorDescription || error}`);
        // Clear the URL and show login
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (type === 'recovery' && (tokenHash || accessToken)) {
        console.log('App: Recovery type with token detected');

        try {
          // If we have token_hash, use verifyOtp (recommended)
          if (tokenHash) {
            console.log('Using token_hash with verifyOtp...');
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery'
            });

            console.log('Verify OTP result:', { hasSession: !!data.session, hasUser: !!data.user, error });

            if (error) {
              console.error('Verify OTP failed:', error);
              alert(`Failed to verify reset token: ${error.message}\n\nThe link may be expired or invalid. Please request a new one.`);
              return;
            }

            if (data.session) {
              console.log('Session established via verifyOtp, showing reset form');
              setIsPasswordRecovery(true);
            }
          }
          // Fallback: if we have access_token and refresh_token, use setSession
          else if (accessToken && refreshToken) {
            console.log('Using access_token with setSession...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            console.log('SetSession result:', { hasSession: !!data.session, error });

            if (error) {
              console.error('SetSession failed:', error);
              alert(`Failed to establish session: ${error.message}\n\nThe link may be expired or invalid. Please request a new one.`);
              return;
            }

            if (data.session) {
              console.log('Session established via setSession');
              setIsPasswordRecovery(true);
            }
          }
          else {
            console.warn('Recovery type but missing refresh_token for setSession');
            alert('Password reset link is incomplete. Please request a new reset email.');
          }
        } catch (err) {
          console.error('App: Error in recovery flow:', err);
          alert(`Error processing password reset: ${err}\n\nPlease request a new reset link.`);
        }
      } else if (type === 'recovery') {
        console.warn('App: Recovery type detected but no tokens in URL');
        alert('Password reset link is missing required tokens. Please request a new reset email.');
      }
    };

    checkRecovery();

    // Listen for both hash and URL changes
    const handleURLChange = () => {
      console.log('App: URL changed, rechecking recovery');
      checkRecovery();
    };

    window.addEventListener('hashchange', handleURLChange);
    window.addEventListener('popstate', handleURLChange);

    return () => {
      window.removeEventListener('hashchange', handleURLChange);
      window.removeEventListener('popstate', handleURLChange);
    };
  }, []);

  if (loading && !isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-brp-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    if (passwordResetSuccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
            <p className="text-gray-600 mb-6">Your password has been successfully updated. You can now sign in with your new password.</p>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                setIsPasswordRecovery(false);
                setPasswordResetSuccess(false);
                window.location.hash = '';
                window.location.reload();
              }}
              variant="primary"
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      );
    }
    return <ResetPasswordForm onSuccess={() => setPasswordResetSuccess(true)} />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1">
        {selectedProject ? (
          <StageGrid
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            projectCode={selectedProject.code}
            projectClient={selectedProject.client}
            projectStatus={selectedProject.status}
            projectBwof={selectedProject.bwof}
            isSmallProject={selectedProject.isSmallProject}
            smallProjectSteps={selectedProject.smallProjectSteps}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <ProjectList
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSelectProject={(projectId, projectName, projectBwof, isSmallProject, projectCode, client, status, smallProjectSteps) => {
              setSelectedProject({ id: projectId, name: projectName, bwof: projectBwof, isSmallProject, code: projectCode, client, status, smallProjectSteps });
            }}
          />
        )}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;