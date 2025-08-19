import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { useUser } from '../contexts/UserContext';
import { Clock, Eye, EyeOff, Mail, Lock } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isFocusedRef = useRef(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const { setUserProfile } = useUser();

  // 🔁 Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

        // The user profile is already included in the session from our API
        const userProfile = session.user;
        setUserProfile(userProfile);

        setTimeout(() => {
          if (userProfile?.role === 'superadmin') {
            navigate('/superadmin', { replace: true });
          } else if (userProfile?.role === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 100);
      }
    };
    checkSession();
  }, [navigate, setUser, setUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid User')) {
          setError('Invalid User, Please Check Your Email and Password');
        } else {
          throw signInError;
        }
      } else if (authData?.user) {
        setUser(authData.user);

        // The user profile is already included in the auth response from our API
        const userProfile = authData.user;

        // Store user metadata for persistence (our auth service already handles tokens)
        localStorage.setItem('user_id', authData.user.id);
        localStorage.setItem('user_email', authData.user.email || '');

        if (!userProfile || !userProfile.role) {
          setError('User role not found. Please contact support.');
          navigate('/', { replace: true });
          return;
        }

        setTimeout(() => {
          if (userProfile.role === 'superadmin') {
            navigate('/superadmin', { replace: true });
          } else if (userProfile.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (userProfile.role === "user") {
            navigate('/user', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 100);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred during authentication'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://avatars.mds.yandex.net/i?id=5aee71fcbb31f020b766ad152170c866e737b410-5734461-images-thumbs&n=13')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-[#23272b]/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/40 p-8 space-y-8">
          {/* Logo and Welcome Section */}
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-100">
                Welcome back
              </h2>
              <p className="mt-2 text-gray-300">
                Sign in to your account to continue
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/80 border border-red-700 text-red-200 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-800/80"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={passwordVisible ? 'text' : 'password'}
                    required
                    value={password}
                    ref={passwordref}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => {
                      isFocusedRef.current = true;
                    }}
                    onBlur={() => {
                      isFocusedRef.current = false;
                    }}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-800/80"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!isFocusedRef.current && passwordref.current) {
                        passwordref.current.focus();
                      }
                      setPasswordVisible(!passwordVisible);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {passwordVisible ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-gray-900 p-[2px] transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative bg-gradient-to-r from-blue-700 to-gray-900 rounded-xl py-3 px-6 text-white font-medium transition-all duration-300 group-hover:bg-opacity-90">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </div>
            </button>
          </form>
        </div>

        {/* Additional Info */}
        <p className="mt-8 text-center text-xs text-gray-400">
          By signing in, you agree to our{' '}
          <a href="#" className="underline hover:text-white transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-white transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;