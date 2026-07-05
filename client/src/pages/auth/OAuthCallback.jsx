import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setOAuthToken, checkAuthStatus } from '../../store/authSlice';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      dispatch(setOAuthToken(token));
      dispatch(checkAuthStatus()).then((res) => {
        if (checkAuthStatus.fulfilled.match(res)) {
          toast.success('Successfully logged in with Google!');
        } else {
          toast.error('Failed to load user profile');
        }
        navigate('/', { replace: true });
      });
    } else {
      toast.error('Google authentication failed');
      navigate('/auth/login', { replace: true });
    }
  }, [dispatch, navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <span className="text-xs font-semibold text-zinc-400 mt-4">Completing Google Sign In...</span>
    </div>
  );
};

export default OAuthCallback;
