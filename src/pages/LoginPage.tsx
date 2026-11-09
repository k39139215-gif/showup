import React, { useState } from 'react';
import { LG_DOTS, streak } from '../data';
import { SocialButton } from '../components/base/social-button/social-button';
import { supabase } from '../lib/supabase';
import { toast } from '../components/base/toast/toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleOAuth = async (provider: 'google' | 'github' | 'apple' | 'twitter') => {
    setIsLoading(true);
    setAuthError('');
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}#today`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setAuthError(error.message);
        toast.error('Authentication Error', { description: error.message });
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate');
      toast.error('Sign-in failed', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      if (password) {
        // Sign in with email + password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If user doesn't exist, try auto sign-up
          if (error.message.includes('Invalid login credentials')) {
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
            });
            if (signUpError) {
              setAuthError(signUpError.message);
              toast.error('Sign-in failed', { description: signUpError.message });
              return;
            } else {
              toast.success('Account created!', { description: 'Logged in successfully.' });
              window.location.hash = '#today';
              return;
            }
          }
          setAuthError(error.message);
          toast.error('Sign-in failed', { description: error.message });
        } else {
          toast.success('Signed in successfully');
          window.location.hash = '#today';
        }
      } else {
        // Magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}#today`,
          },
        });
        if (error) {
          setAuthError(error.message);
          toast.error('Magic link error', { description: error.message });
        } else {
          toast.success('Magic link sent!', {
            description: 'Check your email inbox for the sign-in link.',
          });
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="login" id="login">
      <div className="lf">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <b>ShowUp</b>
            <small>Social Radar</small>
          </div>
        </div>
        <form
          className="lform bui-auth-card bg-white p-8 rounded-2xl border border-[var(--line)] shadow-[var(--shadow-dropdown)] max-w-[420px] w-full"
          onSubmit={handleEmailSignIn}
        >
          <h2 className="text-xl font-semibold text-[#111827]">Sign in to your workspace</h2>
          <p className="text-[13px] text-[#6b7280] mt-1 mb-4">
            Track your social presence, daily targets and audience metrics.
          </p>

          {authError && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {authError}
            </div>
          )}

          <div className="flex flex-col gap-2 my-2">
            <SocialButton
              brand="google"
              appearance="white"
              fullWidth
              className="h-[40px] rounded-xl border border-[var(--line)] hover:bg-[#faf9f6] text-[13px] font-medium"
              onClick={() => handleOAuth('google')}
              disabled={isLoading}
            >
              Continue with Google
            </SocialButton>
            <SocialButton
              brand="github"
              appearance="white"
              fullWidth
              className="h-[40px] rounded-xl border border-[var(--line)] hover:bg-[#faf9f6] text-[13px] font-medium"
              onClick={() => handleOAuth('github')}
              disabled={isLoading}
            >
              Continue with GitHub
            </SocialButton>
            <SocialButton
              brand="apple"
              appearance="white"
              fullWidth
              className="h-[40px] rounded-xl border border-[var(--line)] hover:bg-[#faf9f6] text-[13px] font-medium"
              onClick={() => handleOAuth('apple')}
              disabled={isLoading}
            >
              Continue with Apple
            </SocialButton>
            <SocialButton
              brand="x"
              appearance="white"
              fullWidth
              className="h-[40px] rounded-xl border border-[var(--line)] hover:bg-[#faf9f6] text-[13px] font-medium"
              onClick={() => handleOAuth('twitter')}
              disabled={isLoading}
            >
              Continue with X
            </SocialButton>
          </div>

          <div className="or2 text-[11px] text-[#9ca3af] my-3">OR WITH EMAIL</div>

          <label className="fld">
            Email
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>
          <label className="fld">
            Password <span className="text-[11px] text-[#9ca3af] font-normal">(optional for magic link)</span>
            <input
              type="password"
              placeholder="Enter password or leave blank for magic link"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <button className="btn w-full mt-2" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : password ? 'Sign in' : 'Send Magic Link'}
          </button>

          <button
            type="button"
            className="btn ghost mt-2 w-full text-center"
            onClick={() => {
              window.location.hash = '#today';
            }}
          >
            Enter preview workspace (Guest mode)
          </button>

          <p className="muted" style={{ fontSize: '11.5px', textAlign: 'center', marginTop: '12px' }}>
            Protected by Supabase Auth with PKCE and end-to-end Row-Level Security.
          </p>
        </form>
      </div>
      <div className="lr">
        <div className="b1"></div>
        <div className="b2"></div>
        <div className="b3"></div>
        <div className="b4">
          <small>Daily target pacing</small>
          <div className="dg" id="lg">
            {LG_DOTS.map((s, i) => (
              <i
                key={i}
                style={
                  s === 'background:#161616'
                    ? { background: '#161616' }
                    : s === 'background:#f26a1b'
                    ? { background: '#f26a1b' }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
        <div className="tagl">Show up daily. Compound quietly.</div>
        <div className="b5">
          <b id="ls">{streak()}</b>
          <span>day streak</span>
        </div>
      </div>
    </section>
  );
};
