import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { sk } from '../utils/storageKeys';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

const AuthStorage = {
  getUser: () => {
    try {
      const raw = sessionStorage.getItem(sk('user'));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => sessionStorage.setItem(sk('user'), JSON.stringify(user)),
  clear: () => sessionStorage.removeItem(sk('user')),
};

const buildUserWithRole = (data) => ({
  ...data,
  role: data?.role || 'user',
  isAdmin: !!(data?.isAdmin || data?.role === 'admin' || data?.role === 'superadmin'),
  isSuperAdmin: !!(data?.isSuperAdmin || data?.role === 'superadmin'),
  isModerator: !!(['moderator', 'admin', 'superadmin'].includes(data?.role)),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      AuthStorage.setUser(next);
      return next;
    });
  }, []);

  const persistSession = useCallback((tokens, userData) => {
    if (tokens?.accessToken) sessionStorage.setItem(sk('authToken'), tokens.accessToken);
    if (tokens?.refreshToken) sessionStorage.setItem(sk('refreshToken'), tokens.refreshToken);
    const merged = buildUserWithRole(userData);
    AuthStorage.setUser(merged);
    setUser(merged);
    return merged;
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(sk('authToken'));
    sessionStorage.removeItem(sk('refreshToken'));
    AuthStorage.clear();
    setUser(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const accessToken = sessionStorage.getItem(sk('authToken'));
        const refreshToken = sessionStorage.getItem(sk('refreshToken'));

        if (!accessToken && !refreshToken) {
          setUser(null);
          setIsInitialized(true);
          setLoading(false);
          return;
        }

        // Fast path: hydrate from sessionStorage immediately, then verify in background
        const cached = AuthStorage.getUser();
        if (cached) setUser(buildUserWithRole(cached));

        try {
          const { data } = await API.get('/auth/verify');
          if (data.success) {
            const verified = buildUserWithRole(data.data.user);
            AuthStorage.setUser(verified);
            setUser(verified);
          }
        } catch (verifyErr) {
          // 401 already handled by interceptor (refresh attempted). If still failing, clear.
          if (verifyErr?.response?.status === 401) {
            clearSession();
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        clearSession();
      } finally {
        setIsInitialized(true);
        setLoading(false);
      }
    };
    init();
  }, [clearSession]);

  const clearError = () => setError(null);

  const signup = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await API.post('/auth/signup', formData);
      if (!data.success) throw new Error(data.error?.message || 'Signup failed');
      const merged = persistSession(
        { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken },
        data.data.user
      );
      setIsInitialized(true);
      return { success: true, user: merged };
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Signup failed';
      const details = err.response?.data?.error?.details;
      setError(msg);
      return { success: false, error: msg, details };
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await API.post('/auth/login', { emailOrUsername, password });
      if (!data.success) throw new Error(data.error?.message || 'Login failed');
      const merged = persistSession(
        { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken },
        data.data.user
      );
      setIsInitialized(true);
      return {
        success: true,
        user: merged,
        redirectTo: merged.isAdmin ? '/admin' : '/Dashboard',
      };
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Login failed';
      const code = err.response?.data?.error?.code;
      setError(msg);
      return { success: false, error: msg, code };
    } finally {
      setLoading(false);
    }
  };

  const exchangeFirebaseToken = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken(true);
    const { data } = await API.post('/auth/firebase-login', {
      firebaseToken: idToken,
      email: firebaseUser.email,
      fullname: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    });
    if (!data.success) throw new Error(data.error?.message || 'OAuth login failed');
    const merged = persistSession(
      { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken },
      data.data.user
    );
    setIsInitialized(true);
    return merged;
  };

  const loginWithProvider = async (providerName) => {
    try {
      setLoading(true);
      setError(null);
      const provider =
        providerName === 'github' ? new GithubAuthProvider() : new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const merged = await exchangeFirebaseToken(result.user);
      // Sign out of Firebase locally — backend now owns the session
      try {
        await firebaseSignOut(auth);
      } catch (_) {}
      return {
        success: true,
        user: merged,
        redirectTo: merged.isAdmin ? '/admin' : '/Dashboard',
      };
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'OAuth login failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const refreshToken = sessionStorage.getItem(sk('refreshToken'));
      try {
        await API.post('/auth/logout', refreshToken ? { refreshToken } : {});
      } catch (_) {}
      try {
        await firebaseSignOut(auth);
      } catch (_) {}
      clearSession();
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const { data } = await API.get('/auth/verify');
      if (data.success) {
        const merged = buildUserWithRole(data.data.user);
        AuthStorage.setUser(merged);
        setUser(merged);
        return merged;
      }
    } catch (err) {
      console.error('refreshUserData failed:', err);
    }
    return null;
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAuthenticated = !!user;

  // Convenience display fields — solves the "username/profile not showing everywhere" bug
  const displayName =
    user?.fullname ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    user?.email?.split('@')[0] ||
    '';

  const value = {
    user,
    loading,
    error,
    isInitialized,
    isAuthenticated,

    // Actions
    signup,
    login,
    loginWithProvider,
    logout,
    clearError,
    setUser,
    updateUser,
    refreshUserData,

    // Roles
    role: user?.role || 'user',
    isUser: hasRole('user', 'moderator', 'admin', 'superadmin'),
    isModerator: hasRole('moderator', 'admin', 'superadmin'),
    isAdmin: hasRole('admin', 'superadmin'),
    isSuperAdmin: hasRole('superadmin'),
    hasRole,

    // Display
    displayName,
    photoURL: user?.photoURL || '/images/default-avatar.png',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || '',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
