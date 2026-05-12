import React from 'react';
import { render, act, waitFor } from '@testing-library/react';

// react-router-dom is auto-mocked via src/__mocks__/react-router-dom.js
jest.mock('../firebase', () => ({
  auth: {},
}));
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  GithubAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
}));

jest.mock('../services/api', () => {
  const m = { get: jest.fn(), post: jest.fn() };
  m.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  m.defaults = { headers: { common: {} } };
  return m;
});

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import API from '../services/api';

const AuthConsumer = ({ onRender }) => {
  const auth = useAuth();
  onRender(auth);
  return null;
};

const renderWithAuth = (onRender) =>
  render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('throws if useAuth is called outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<AuthConsumer onRender={() => {}} />)
    ).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });

  it('starts unauthenticated when no tokens in sessionStorage', async () => {
    let capturedAuth;
    await act(async () => {
      renderWithAuth((auth) => { capturedAuth = auth; });
    });

    await waitFor(() => {
      expect(capturedAuth.isAuthenticated).toBe(false);
    });
  });

  it('calls the backend on login and updates auth state', async () => {
    const userData = {
      id: '123',
      email: 'test@example.com',
      firstName: 'Test',
      role: 'user',
    };
    API.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: 'access-tok',
          refreshToken: 'refresh-tok',
          user: userData,
        },
      },
    });

    let capturedAuth;
    await act(async () => {
      renderWithAuth((auth) => { capturedAuth = auth; });
    });

    await act(async () => {
      await capturedAuth.login('test@example.com', 'password123');
    });

    expect(API.post).toHaveBeenCalledWith('/auth/login', expect.any(Object));
    await waitFor(() => {
      expect(capturedAuth.isAuthenticated).toBe(true);
    });
  });

  it('logout clears auth state', async () => {
    API.post.mockResolvedValue({ data: { success: true, data: {} } });

    let capturedAuth;
    await act(async () => {
      renderWithAuth((auth) => { capturedAuth = auth; });
    });

    await act(async () => {
      await capturedAuth.logout();
    });

    await waitFor(() => {
      expect(capturedAuth.isAuthenticated).toBe(false);
      expect(capturedAuth.user).toBeNull();
    });
  });
});
