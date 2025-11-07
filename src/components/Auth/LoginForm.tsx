import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff, UserPlus, X } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createAccountData, setCreateAccountData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { signIn, signUp } = useAuth();

  const departments = [
    { value: 'Admin', label: 'Admin', access: 'All steps' },
    { value: 'Director', label: 'Director', access: 'All steps (same as Admin)' },
    { value: 'QS', label: 'QS (Quantity Surveyor)', access: 'Step 4' },
    { value: 'PM/SM', label: 'PM/SM (Project/Site Manager)', access: 'Step 10' },
    { value: 'Estimating', label: 'Estimating', access: 'Steps 1, 6' },
    { value: 'Commercial', label: 'Commercial', access: 'Step 5' },
    { value: 'QA', label: 'QA (Quality Assurance)', access: 'Step 8' },
    { value: 'H&S', label: 'H&S (Health & Safety)', access: 'Step 11' },
    { value: 'Read-only', label: 'Read-only', access: 'View only access' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error('Login error:', error);
        
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountLoading(true);
    setError('');

    console.log('=== CREATE ACCOUNT FORM SUBMISSION ===');
    console.log('Form data:', createAccountData);

    // Validate email domain
    const emailDomain = createAccountData.email.split('@')[1]?.toLowerCase();
    if (emailDomain !== 'optimalfire.co.nz') {
      setError('Registration is restricted to @optimalfire.co.nz email addresses only');
      setCreateAccountLoading(false);
      return;
    }

    // Validation
    if (createAccountData.password !== createAccountData.confirmPassword) {
      setError('Passwords do not match');
      setCreateAccountLoading(false);
      return;
    }

    if (createAccountData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setCreateAccountLoading(false);
      return;
    }

    if (!createAccountData.role) {
      setError('Please select a department');
      setCreateAccountLoading(false);
      return;
    }

    console.log('Validation passed, calling signUp...');
    try {
      const { error } = await signUp(
        createAccountData.email,
        createAccountData.password,
        createAccountData.name,
        createAccountData.role
      );
      
      console.log('SignUp completed, error:', error);
      
      if (error) {
        console.error('SignUp error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        setError(error.message);
      } else {
        // Success - close modal and show success message
        setShowCreateAccount(false);
        setError('');
        console.log('✅ Account created successfully!');
        alert('Account created successfully! Please check the console for details, then you can sign in.');
        // Reset form
        setCreateAccountData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: ''
        });
      }
    } catch (err) {
      console.error('Unexpected error in handleCreateAccount:', err);
      setError('An unexpected error occurred');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const handleCreateAccountInputChange = (field: string, value: string) => {
    setCreateAccountData(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');

    try {
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Handover</h1>
          <p className="text-gray-600 mt-2">Sign in to manage your projects</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Forgot your password?
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowCreateAccount(true)}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-2 mx-auto transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetEmail('');
                  setError('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{resetEmail}</strong>. Please check your inbox and follow the instructions to reset your password.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Enter the email address associated with your account and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {resetLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
              <button
                onClick={() => setShowCreateAccount(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createAccountData.name}
                  onChange={(e) => handleCreateAccountInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={createAccountData.email}
                  onChange={(e) => handleCreateAccountInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.name@optimalfire.co.nz"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Must use @optimalfire.co.nz email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={createAccountData.role}
                  onChange={(e) => handleCreateAccountInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select your department</option>
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {createAccountData.role && (
                  <p className="text-xs text-gray-600 mt-1">
                    Access: {departments.find(d => d.value === createAccountData.role)?.access}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={createAccountData.password}
                  onChange={(e) => handleCreateAccountInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={createAccountData.confirmPassword}
                  onChange={(e) => handleCreateAccountInputChange('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAccount(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAccountLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {createAccountLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;