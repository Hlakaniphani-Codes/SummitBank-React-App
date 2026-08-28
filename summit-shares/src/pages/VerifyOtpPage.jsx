import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { verifyLoginOtp, resendLoginOtp } from '../api';

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // The email survives a refresh via sessionStorage (router state alone would
  // strand the user on reload with no way to know who they're verifying).
  const [email] = useState(() => location.state?.email || sessionStorage.getItem('otpEmail') || '');
  const [maskedEmail] = useState(() => location.state?.maskedEmail || sessionStorage.getItem('otpMaskedEmail') || '');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const cooldownRef = useRef(null);

  useEffect(() => {
    if (!email) {
      navigate('/', { replace: true });
      return;
    }
    sessionStorage.setItem('otpEmail', email);
    if (maskedEmail) sessionStorage.setItem('otpMaskedEmail', maskedEmail);
  }, [email, maskedEmail, navigate]);

  useEffect(() => {
    cooldownRef.current = window.setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(cooldownRef.current);
  }, []);

  const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => setCooldown(seconds);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (verifying || !code.trim()) return;
    setError('');
    setInfo('');
    setVerifying(true);
    try {
      const data = await verifyLoginOtp(email, code.trim());
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('otpEmail');
      sessionStorage.removeItem('otpMaskedEmail');
      setInfo('Email verified successfully. Redirecting…');
      const role = data.user?.role || 'customer';
      window.location.href = role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/dashboard';
    } catch (err) {
      setError(err.message || 'Incorrect verification code. Please try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setError('');
    setInfo('');
    setResending(true);
    try {
      const data = await resendLoginOtp(email);
      setInfo(data.message || 'A new verification code has been sent to your email.');
      setCode('');
      startCooldown();
    } catch (err) {
      if (err.code === 'OTP_COOLDOWN' && err.waitSeconds) {
        startCooldown(err.waitSeconds);
      }
      setError(err.message || 'Unable to send a new code right now.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f2ef] px-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mb-4">
          <i className="fas fa-shield-halved text-[#C9A84C] text-lg"></i>
        </div>
        <h2 className="text-2xl font-bold text-[#0B0B0B] mb-1">Verify Your Identity</h2>
        <p className="text-sm text-gray-600 mb-6">
          We've sent a verification code to{' '}
          <span className="font-semibold text-[#0B0B0B]">{maskedEmail || email}</span>.
          Enter it below to finish signing in.
        </p>

        {error && (
          <div className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}
        {info && !error && (
          <div className="text-emerald-700 text-sm mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{info}</div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••••"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-[0.4em] focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || !code.trim()}
            className="w-full bg-[#0B0B0B] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-sm font-semibold text-[#C9A84C] hover:text-[#A8893A] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {resending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-gray-500 hover:text-[#C9A84C]">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
