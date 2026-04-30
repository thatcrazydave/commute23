import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaGoogle, FaGithub } from 'react-icons/fa';
import { useAuth } from './contexts/AuthContext';
import './signup.css';

const slugifyUsername = (firstName, lastName, email) => {
  const base = (firstName || email?.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const tail = (lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const stem = (base + (tail ? `_${tail}` : '')).slice(0, 20) || 'user';
  return `${stem}_${Date.now().toString(36).slice(-4)}`;
};

const Signup = () => {
  const navigate = useNavigate();
  const { signup, loginWithProvider } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    requirements: { length: false, uppercase: false, lowercase: false, number: false, special: false },
  });
  const [socialLoading, setSocialLoading] = useState('');

  const checkPasswordStrength = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  };

  const validateForm = () => {
    const next = {};
    if (!formData.firstName.trim()) next.firstName = 'First name is required';
    else if (!/^[\p{L}\p{M}\s'.-]{1,40}$/u.test(formData.firstName.trim()))
      next.firstName = 'Please enter a valid first name';

    if (!formData.lastName.trim()) next.lastName = 'Last name is required';
    else if (!/^[\p{L}\p{M}\s'.-]{1,40}$/u.test(formData.lastName.trim()))
      next.lastName = 'Please enter a valid last name';

    if (!formData.email) next.email = 'Email is required';
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email))
      next.email = 'Please enter a valid email address';

    if (formData.username && !/^[a-zA-Z0-9_-]{3,30}$/.test(formData.username)) {
      next.username = 'Username must be 3-30 chars, letters/numbers/underscore/hyphen';
    }

    if (!formData.password) next.password = 'Password is required';
    else if (passwordStrength.score < 4)
      next.password = 'Password does not meet all requirements';

    if (!formData.confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      next.confirmPassword = 'Passwords do not match';

    if (!agreeToTerms) next.terms = 'You must agree to the Terms of Service and Privacy Policy';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === 'password') checkPasswordStrength(value);
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const username =
        formData.username.trim() || slugifyUsername(formData.firstName, formData.lastName, formData.email);

      const result = await signup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        username: username.toLowerCase(),
        password: formData.password,
      });

      if (result.success) {
        setErrors({});
        navigate('/Dashboard', { replace: true });
        return;
      }

      // Map server error to fields where possible
      const code = result?.error?.code;
      if (code === 'USER_EXISTS') {
        setErrors({ email: 'An account with this email or username already exists' });
      } else if (result.details && Array.isArray(result.details)) {
        setErrors({ submit: result.details.join(' • ') });
      } else {
        setErrors({ submit: result.error || 'Registration failed' });
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (providerName) => {
    setSocialLoading(providerName);
    setErrors({});
    try {
      const result = await loginWithProvider(providerName);
      if (result.success) {
        navigate(result.redirectTo || '/Dashboard', { replace: true });
        return;
      }
      setErrors({ submit: result.error || `${providerName} sign up failed` });
    } catch (err) {
      setErrors({ submit: err.message || `${providerName} sign up failed` });
    } finally {
      setSocialLoading('');
    }
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

  const getPasswordStrengthLabel = () => {
    const { score } = passwordStrength;
    if (score === 0) return '';
    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    const { score } = passwordStrength;
    if (score < 2) return '#ef4444';
    if (score < 4) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="signup-page">
      <motion.div
        className="signup-container"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
      >
        <div className="signup-card">
          <motion.div className="signup-form-container" variants={containerVariants}>
            <motion.h2 variants={itemVariants} className="form-title">
              Create Account
            </motion.h2>
            <motion.p variants={itemVariants} className="form-subtitle">
              Join our tech community today
            </motion.p>

            <motion.form
              onSubmit={handleSubmit}
              variants={itemVariants}
              autoComplete="off"
              noValidate
            >
              <div className="name-fields">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className={errors.firstName ? 'error' : ''}
                      disabled={isLoading}
                      maxLength={40}
                      autoComplete="off"
                    />
                  </div>
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <div className="input-with-icon">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      className={errors.lastName ? 'error' : ''}
                      disabled={isLoading}
                      maxLength={40}
                      autoComplete="off"
                    />
                  </div>
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={errors.email ? 'error' : ''}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="username">Username (optional)</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Auto-generated if blank"
                    className={errors.username ? 'error' : ''}
                    disabled={isLoading}
                    maxLength={30}
                    autoComplete="off"
                  />
                </div>
                {errors.username && <span className="error-message">{errors.username}</span>}
                <span className="field-hint">3-30 chars; letters, numbers, _ or -</span>
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
                    placeholder="Create password"
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
                {errors.password && <span className="error-message">{errors.password}</span>}

                {formData.password && (
                  <div className="password-strength-container">
                    <div className="password-strength-label">
                      <span>Password Strength:</span>
                      <span style={{ color: getPasswordStrengthColor() }}>
                        {getPasswordStrengthLabel()}
                      </span>
                    </div>
                    <div className="password-strength-meter">
                      <div
                        className="password-strength-progress"
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(),
                        }}
                      ></div>
                    </div>
                    <div className="password-requirements">
                      {[
                        ['length', 'At least 8 characters'],
                        ['uppercase', 'Uppercase letter'],
                        ['lowercase', 'Lowercase letter'],
                        ['number', 'Number'],
                        ['special', 'Special character'],
                      ].map(([key, label]) => (
                        <div
                          key={key}
                          className={`requirement ${passwordStrength.requirements[key] ? 'met' : ''}`}
                        >
                          {passwordStrength.requirements[key] ? <FaCheck /> : <FaTimes />}
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-with-icon">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={errors.confirmPassword ? 'error' : ''}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>

              <div className="form-group terms-container">
                <label className="terms-checkbox">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => {
                      setAgreeToTerms(e.target.checked);
                      if (errors.terms) setErrors((p) => ({ ...p, terms: '' }));
                    }}
                    disabled={isLoading}
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" className="terms-link">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="terms-link">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.terms && <span className="error-message">{errors.terms}</span>}
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </motion.button>

              <div className="social-divider">
                <span>or sign up with</span>
              </div>

              <div className="social-login">
                <motion.button
                  type="button"
                  className="social-button google"
                  onClick={() => handleSocialSignup('google')}
                  disabled={isLoading || socialLoading !== ''}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaGoogle />
                  {socialLoading === 'google' ? 'Connecting...' : 'Google'}
                </motion.button>
                <motion.button
                  type="button"
                  className="social-button github"
                  onClick={() => handleSocialSignup('github')}
                  disabled={isLoading || socialLoading !== ''}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaGithub />
                  {socialLoading === 'github' ? 'Connecting...' : 'GitHub'}
                </motion.button>
              </div>

              <p className="login-prompt">
                Already have an account?{' '}
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link to="/login" className="login-link">
                    Sign in
                  </Link>
                </motion.span>
              </p>
            </motion.form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
