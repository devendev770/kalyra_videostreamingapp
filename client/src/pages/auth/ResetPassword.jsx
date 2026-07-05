import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api';
import { Lock, Loader2, Play, Key, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) {
      toast.error('Please fill in all details');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      toast.success('Password updated successfully! Redirecting to Login.');
      navigate('/auth/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full bg-[#16161980] backdrop-blur-xl border border-[#27272acc] rounded-2xl p-8 shadow-2xl z-10 animate-slideUp">
        <Link to="/auth/forgot-password" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Change Email
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/35 mb-3">
            <Play className="w-6 h-6 fill-white text-white translate-x-0.5" />
          </div>
          <h2 className="text-2xl font-bold tracking-wider gradient-text font-sans">
            Verify Code
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-semibold text-center leading-relaxed">
            Enter the 6-digit OTP sent to {email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email input (hidden or readOnly for security context) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase px-1">Verify Email</label>
            <input
              type="email"
              readOnly
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 bg-surface/30 border border-border/60 rounded-xl px-4 text-sm text-zinc-400 outline-none cursor-not-allowed"
            />
          </div>

          {/* OTP Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase px-1">6-Digit Code</label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl pl-10 pr-4 text-sm text-white tracking-[0.3em] font-mono outline-none transition-colors"
              />
              <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* New Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase px-1">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-11 bg-[#09090b99] border border-border focus:border-primary rounded-xl pl-10 pr-4 text-sm text-white outline-none transition-colors"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-semibold text-white transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
