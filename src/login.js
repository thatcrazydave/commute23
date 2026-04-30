import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaEyeSlash, FaArrowLeft, FaGoogle, FaGithub } from 'react-icons/fa';
import { useAuth } from './contexts/AuthContext';
import API from './services/api';
import './login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithProvider, isAuthenticated, isAdmin, isInitialized } = useAuth();

  const [formData, setFormData] = useState({ emailOrUsername: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [socialLoginLoading, setSocialLoginLoading] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/Dashboard', { replace: true });
    }
  }, [isInitialized, isAuthenticated, isAdmin, navigate]);

  // Show signup success message
  useEffect(() => {
    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message);
      const t = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // Remember-me preference
  useEffect(() => {
    if (localStorage.getItem('rememberMe') === 'true') setRememberMe(true);
  }, []);

  const validateForm = () => {
    const next = {};
    if (!formData.emailOrUsername) next.emailOrUsername = 'Email or username is required';
    if (!formData.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await login(formData.emailOrUsername.trim(), formData.password);
      if (result.success) {
        if (rememberMe) localStorage.setItem('rememberMe', 'true');
        else localStorage.removeItem('rememberMe');
        setErrors({});
        navigate(result.redirectTo || '/Dashboard', { replace: true });
        return;
      }

      let msg = result.error || 'Login failed';
      if (result.code === 'ACCOUNT_LOCKED') msg = result.error;
      if (result.code === 'INVALID_CREDENTIALS') msg = 'Invalid email/username or password';
      setErrors({ submit: msg });
    } catch (err) {
      setErrors({ submit: err.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerName) => {
    setSocialLoginLoading(providerName);
    setErrors({});
    try {
      const result = await loginWithProvider(providerName);
      if (result.success) {
        navigate(result.redirectTo || '/Dashboard', { replace: true });
        return;
      }
      setErrors({ submit: result.error || `${providerName} login failed` });
    } catch (err) {
      setErrors({ submit: err.message || `${providerName} login failed` });
    } finally {
      setSocialLoginLoading('');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) return setErrors({ resetEmail: 'Please enter your email address' });
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(resetEmail)) {
      return setErrors({ resetEmail: 'Please enter a valid email address' });
    }

    setIsLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: resetEmail });
      setResetEmailSent(true);
      setErrors({});
    } catch (err) {
      setErrors({
        resetEmail: err.response?.data?.error?.message || 'Failed to send reset email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword((s) => !s);
    setErrors({});
    setResetEmailSent(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5, when: 'beforeChildren', staggerChildren: 0.1 },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="spinner-inner"></div>
        </motion.div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <motion.div
        className="login-container"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <div className="login-card">
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                className="success-message global"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {successMessage}
              </motion.div>
            )}

            {showForgotPassword ? (
              <motion.div
                key="forgot-password"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="forgot-password-form"
              >
                <motion.button
                  className="back-button"
                  onClick={toggleForgotPassword}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaArrowLeft /> Login
                </motion.button>

                <motion.h2 variants={itemVariants} className="form-title">
                  Reset Password
                </motion.h2>
                <motion.p variants={itemVariants} className="form-subtitle">
                  Enter your email address and we'll send you a link to reset your password.
                </motion.p>

                {resetEmailSent ? (
                  <motion.div
                    className="success-message"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>Help is on the way. Please check your email.</p>
                    <button className="back-to-login-button" onClick={toggleForgotPassword}>
                      Return to Login
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    onSubmit={handleForgotPassword}
                    variants={itemVariants}
                    autoComplete="off"
                    noValidate
                  >
                    <div className="form-group">
                      <label htmlFor="resetEmail">Email Address</label>
                      <div className="input-with-icon">
                        <input
                          type="email"
                          id="resetEmail"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="Enter your email"
                          className={errors.resetEmail ? 'error' : ''}
                          disabled={isLoading}
                          autoComplete="off"
                        />
                      </div>
                      {errors.resetEmail && (
                        <span className="error-message">{errors.resetEmail}</span>
                      )}
                    </div>

                    <motion.button
                      type="submit"
                      className="submit-button"
                      disabled={isLoading}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </motion.button>
                  </motion.form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="login-form-container"
              >
                <motion.h2 variants={itemVariants} className="form-title">
                  Welcome Back
                </motion.h2>
                <motion.p variants={itemVariants} className="form-subtitle">
                  Sign in to access your account
                </motion.p>

                <motion.form
                  onSubmit={handleSubmit}
                  variants={itemVariants}
                  autoComplete="off"
                  noValidate
                >
                  <div className="form-group">
                    <label htmlFor="emailOrUsername">Email or Username</label>
                    <div className="input-with-icon">
                      <input
                        type="text"
                        id="emailOrUsername"
                        name="emailOrUsername"
                        value={formData.emailOrUsername}
                        onChange={handleChange}
                        placeholder="Enter email or username"
                        className={errors.emailOrUsername ? 'error' : ''}
                        disabled={isLoading}
                        autoComplete="off"
                      />
                    </div>
                    {errors.emailOrUsername && (
                      <span className="error-message">{errors.emailOrUsername}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        className={errors.password ? 'error' : ''}
                        disabled={isLoading}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex="-1"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="error-message">{errors.password}</span>
                    )}
                  </div>

                  <div className="form-options">
                    <label className="remember-me">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        autoComplete="off"
                      />
                      <span>Remember me</span>
                    </label>
                    <motion.button
                      type="button"
                      className="forgot-password-link"
                      onClick={toggleForgotPassword}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Forgot password?
                    </motion.button>
                  </div>

                  {errors.submit && (
                    <div className="error-message submit-error">{errors.submit}</div>
                  )}

                  <motion.button
                    type="submit"
                    className="submit-button"
                    disabled={isLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </motion.button>

                  <div className="social-divider">
                    <span>or continue with</span>
                  </div>

                  <div className="social-login">
                    <motion.button
                      type="button"
                      className="social-button google"
                      onClick={() => handleSocialLogin('google')}
                      disabled={isLoading || socialLoginLoading !== ''}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaGoogle />
                      {socialLoginLoading === 'google' ? 'Connecting...' : 'Google'}
                    </motion.button>
                    <motion.button
                      type="button"
                      className="social-button github"
                      onClick={() => handleSocialLogin('github')}
                      disabled={isLoading || socialLoginLoading !== ''}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaGithub />
                      {socialLoginLoading === 'github' ? 'Connecting...' : 'GitHub'}
                    </motion.button>
                  </div>

                  <p className="signup-prompt">
                    Don't have an account?{' '}
                    <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to="/signup" className="signup-link">
                        Sign up
                      </Link>
                    </motion.span>
                  </p>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
