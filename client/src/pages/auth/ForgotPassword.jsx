import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import { Mail, Loader2, Play, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('If the email exists, an OTP has been dispatched!');
      navigate('/auth/reset-password', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square bg-primary-dark/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full bg-[#16161980] backdrop-blur-xl border border-[#27272acc] rounded-2xl p-8 shadow-2xl z-10 animate-slideUp">
        <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Sign In
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/35 mb-3">
            <Play className="w-6 h-6 fill-white text-white translate-x-0.5" />
          </div>
          <h2 className="text-2xl font-bold tracking-wider gradient-text font-sans">
            Reset Password
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-semibold text-center leading-relaxed max-w-[280px]">
            Enter your email to receive a 6-digit verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-semibold text-white transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Send Verification Code'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
