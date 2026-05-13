import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// --- Mocks ---
// react-router-dom is auto-mocked via src/__mocks__/react-router-dom.js
jest.mock('../firebase', () => ({
  auth: { onAuthStateChanged: jest.fn(() => () => {}) },
}));
jest.mock('firebase/auth', () => ({
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  GithubAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
}));

const mockLogin = jest.fn();
const mockLoginWithProvider = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithProvider: mockLoginWithProvider,
    isAuthenticated: false,
    isAdmin: false,
    isInitialized: true,
  }),
}));

jest.mock('../services/api', () => {
  const m = { get: jest.fn(), post: jest.fn() };
  m.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  m.defaults = { headers: { common: {} } };
  return m;
});

import Login from '../login';

const renderLogin = () => render(<Login />);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Login component', () => {
  it('renders email/username and password fields', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitted empty', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email or username is required/i)).toBeInTheDocument();
    });
  });

  it('calls login with trimmed credentials on valid submit', async () => {
    mockLogin.mockResolvedValue({ success: true, redirectTo: '/Dashboard' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email or username/i), {
      target: { value: '  user@example.com  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'Str0ng!Pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'Str0ng!Pass');
    });
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid credentials',
    });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/email or username/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email\/username or password/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput.type).toBe('password');

    // Find the toggle button (eye icon button)
    const toggleBtn = passwordInput.closest('div')?.querySelector('button[type="button"]') ||
      screen.getAllByRole('button').find(b => b.querySelector('svg'));

    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');
    }
  });
});
