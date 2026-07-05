import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../../store/authSlice';
import { Mail, Lock, Loader2, Play, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter all credentials');
      return;
    }
    
    dispatch(clearError());
    const resultAction = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(resultAction)) {
      toast.success(`Welcome back, ${resultAction.payload.displayName || 'User'}!`);
      navigate(from, { replace: true });
    } else {
      toast.error(resultAction.payload || 'Invalid credentials');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full bg-[#16161980] backdrop-blur-xl border border-[#27272acc] rounded-2xl p-8 shadow-2xl z-10 animate-slideUp">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/kalyra-logo.png" alt="Kalyra" className="w-16 h-16 object-contain mb-3" />
          <h2 className="text-2xl tracking-[0.25em] uppercase text-[#e8c547]" style={{ fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
            Kalyra
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-semibold">
            Sign in to start your streaming experience
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase px-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl pl-10 pr-4 text-sm text-white outline-none transition-colors"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Password</label>
              <Link to="/auth/forgot-password" className="text-[11px] font-semibold text-accent hover:text-accent">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl pl-10 pr-4 text-sm text-white outline-none transition-colors"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-semibold text-white transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6 gap-3">
          <div className="flex-1 h-[1px] bg-[#27272a99]" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Or continue with</span>
          <div className="flex-1 h-[1px] bg-[#27272a99]" />
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full h-11 bg-[#2d2d3099] hover:bg-[#2d2d30e6] border border-border rounded-xl font-semibold text-xs text-white transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Google Account
        </button>

        <p className="text-xs text-zinc-400 text-center mt-8 font-semibold">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-accent hover:text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
