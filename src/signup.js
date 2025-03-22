import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';
import './signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check password strength in real-time
  const checkPasswordStrength = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength({ score, requirements });
  };

  const validateForm = () => {
    const newErrors = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!/^[a-zA-Z\s]{2,30}$/.test(formData.firstName.trim())) {
      newErrors.firstName = 'Please enter a valid first name';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z\s]{2,30}$/.test(formData.lastName.trim())) {
      newErrors.lastName = 'Please enter a valid last name';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.score < 4) {
      newErrors.password = 'Password does not meet all requirements';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms agreement validation
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    
    // Check password strength when password field changes
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: ''
      }));
    }
  };

  const handleFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        setErrors({ email: 'This email is already registered' });
        break;
      case 'auth/invalid-email':
        setErrors({ email: 'Invalid email address' });
        break;
      case 'auth/operation-not-allowed':
        setErrors({ submit: 'Email/password accounts are not enabled. Please contact support.' });
        break;
      case 'auth/weak-password':
        setErrors({ password: 'Password is too weak' });
        break;
      default:
        setErrors({ submit: 'Registration failed. Please try again.' });
    }
  };

  const createUserDocument = async (user) => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        createdAt: Timestamp.now(),
        isProfileComplete: false,
        emailVerified: false,
        lastLogin: null,
        accountStatus: 'pending_verification'
      });
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Update user profile with full name
        await updateProfile(userCredential.user, {
          displayName: `${formData.firstName} ${formData.lastName}`
        });

        // Send email verification
        await sendEmailVerification(userCredential.user);

        // Store additional user data in Firestore
        await createUserDocument(userCredential.user);

        // Sign out the user immediately after account creation
        await signOut(auth);

        // Show success message
        setRegistrationSuccess(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Registration error:', error);
        handleFirebaseError(error);
        setIsLoading(false);
      }
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
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
          {registrationSuccess ? (
            <motion.div 
              className="success-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="success-icon">
                <FaCheck />
              </div>
              <h2>Account Created Successfully!</h2>
              <p>A verification email has been sent to <strong>{formData.email}</strong></p>
              <div className="verification-instructions">
                <h3>Next Steps:</h3>
                <ol>
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>After verification, return to the login page to sign in</li>
                </ol>
                <div className="verification-note">
                  <FaInfoCircle />
                  <p>You must verify your email before you can log in to your account.</p>
                </div>
                
                <div className="help-section">
                  <motion.button 
                    className="instructions-button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    whileHover={{ scale: 1.02 }}
                  >
                    {showInstructions ? "Hide Verification Help" : "Need help with verification?"}
                  </motion.button>
                  
                  {showInstructions && (
                    <motion.div 
                      className="verification-help"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p>If you don't see the verification email:</p>
                      <ul>
                        <li>Check your spam or junk folder</li>
                        <li>Make sure you entered the correct email address</li>
                        <li>Allow a few minutes for the email to arrive</li>
                        <li>If you still don't see it, you can request a new verification email from the login page</li>
                      </ul>
                    </motion.div>
                  )}
                </div>
              </div>
              <motion.button 
                className="continue-button"
                onClick={handleGoToLogin}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Go to Login
              </motion.button>
            </motion.div>
          ) : (
            <motion.div 
              className="signup-form-container"
              variants={containerVariants}
            >
              <motion.h2 variants={itemVariants} className="form-title">Create Account</motion.h2>
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
                        maxLength={30}
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
                        maxLength={30}
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
                  <span className="field-hint">You'll need to verify this email before logging in</span>
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
                            backgroundColor: getPasswordStrengthColor()
                          }}
                        ></div>
                      </div>
                      <div className="password-requirements">
                        <div className={`requirement ${passwordStrength.requirements.length ? 'met' : ''}`}>
                          {passwordStrength.requirements.length ? <FaCheck /> : <FaTimes />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`requirement ${passwordStrength.requirements.uppercase ? 'met' : ''}`}>
                          {passwordStrength.requirements.uppercase ? <FaCheck /> : <FaTimes />}
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`requirement ${passwordStrength.requirements.lowercase ? 'met' : ''}`}>
                          {passwordStrength.requirements.lowercase ? <FaCheck /> : <FaTimes />}
                          <span>Lowercase letter</span>
                        </div>
                        <div className={`requirement ${passwordStrength.requirements.number ? 'met' : ''}`}>
                          {passwordStrength.requirements.number ? <FaCheck /> : <FaTimes />}
                          <span>Number</span>
                        </div>
                        <div className={`requirement ${passwordStrength.requirements.special ? 'met' : ''}`}>
                          {passwordStrength.requirements.special ? <FaCheck /> : <FaTimes />}
                          <span>Special character</span>
                        </div>
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
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>

                {/* <div className="email-verification-notice"> */}
                  {/* <FaInfoCircle /> */}
                  {/* <p>You will need to verify your email address before you can log in to your account.</p> */}
                {/* </div> */}

                <div className="form-group terms-container">
                  <label className="terms-checkbox">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => {
                        setAgreeToTerms(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      disabled={isLoading}
                    />
                    <span>
                      I agree to the <Link to="/terms" className="terms-link">Terms of Service</Link> and <Link to="/privacy" className="terms-link">Privacy Policy</Link>
                    </span>
                  </label>
                  {errors.terms && <span className="error-message">{errors.terms}</span>}
                </div>

                {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img src="/images/google.svg" alt="Google" />
                    Google
                  </motion.button>
                  <motion.button 
                    type="button" 
                    className="social-button github"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img src="/images/github.svg" alt="GitHub" />
                    GitHub
                  </motion.button>
                </div>

                <p className="login-prompt">
                  Already have an account?{' '}
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link to="/login" className="login-link">Sign in</Link>
                  </motion.span>
                </p>
              </motion.form>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
