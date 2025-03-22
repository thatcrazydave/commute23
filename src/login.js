import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaGoogle, FaGithub } from 'react-icons/fa';
import './login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [socialLoginLoading, setSocialLoginLoading] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated and redirect to dashboard
  useEffect(() => {
    console.log("Checking authentication status...");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is already logged in, redirecting to dashboard");
        // Add a small delay to ensure smooth transition
        setTimeout(() => {
          navigate('/Dashboard', { replace: true });
        }, 300);
      } else {
        console.log("No authenticated user found");
        setCheckingAuth(false);
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Check for success message from signup
  useEffect(() => {
    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Check if account is locked from localStorage
  useEffect(() => {
    const lockoutTime = localStorage.getItem('loginLockoutTime');
    if (lockoutTime) {
      const timeLeft = parseInt(lockoutTime) - Date.now();
      if (timeLeft > 0) {
        setIsLocked(true);
        setLockTimer(Math.ceil(timeLeft / 1000));
      } else {
        localStorage.removeItem('loginLockoutTime');
        localStorage.removeItem('loginAttempts');
      }
    }
    
    // Check for saved login attempts
    const savedAttempts = localStorage.getItem('loginAttempts');
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts));
    }
    
    // Check for remember me
    const remembered = localStorage.getItem('rememberMe');
    if (remembered === 'true') {
      setRememberMe(true);
    }
  }, []);

  // Timer for account lockout
  useEffect(() => {
    let interval;
    if (isLocked && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            localStorage.removeItem('loginLockoutTime');
            localStorage.removeItem('loginAttempts');
            clearInterval(interval);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockTimer]);

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLockout = () => {
    const attempts = loginAttempts + 1;
    setLoginAttempts(attempts);
    localStorage.setItem('loginAttempts', attempts);

    if (attempts >= 5) {
      const lockoutDuration = 5 * 60 * 1000; // 5 minutes
      const lockoutTime = Date.now() + lockoutDuration;
      setIsLocked(true);
      setLockTimer(lockoutDuration / 1000);
      localStorage.setItem('loginLockoutTime', lockoutTime.toString());
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: ''
      }));
    }
  };

  const updateUserLastLogin = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update last login time
        await setDoc(userRef, {
          lastLogin: Timestamp.now()
        }, { merge: true });
        console.log("Updated user's last login timestamp");
      } else {
        console.log("User document doesn't exist in Firestore");
        // Create a basic profile if none exists
        await setDoc(userRef, {
          firstName: "User",
          lastName: "",
          email: auth.currentUser.email,
          photoURL: auth.currentUser.photoURL || '/images/default-avatar.png',
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now()
        });
        console.log("Created new user profile");
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    if (validateForm()) {
      setIsLoading(true);
      try {
        console.log("Attempting to sign in with email and password");
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        console.log("Login successful for user:", userCredential.user.uid);
        
        // Reset login attempts on successful login
        localStorage.removeItem('loginAttempts');
        setLoginAttempts(0);
        
        // Store user preference for remember me
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Update last login timestamp
        await updateUserLastLogin(userCredential.user.uid);
        
        // Clear any existing errors
        setErrors({});
        
        // Show loading state before redirecting
        setIsLoading(true);
        
        // Navigate to dashboard with replace to prevent going back to login
        console.log("Redirecting to dashboard...");
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific Firebase auth errors
        let errorMessage = 'Login failed. Please try again.';
        
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password';
            handleLockout();
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          default:
            errorMessage = 'An error occurred during login. Please try again.';
        }
        
        setErrors({ submit: errorMessage });
        setIsLoading(false);
      }
    }
  };

  const handleSocialLogin = async (provider) => {
    if (isLocked) return;
    
    let authProvider;
    if (provider === 'google') {
      setSocialLoginLoading('google');
      authProvider = new GoogleAuthProvider();
    } else if (provider === 'github') {
      setSocialLoginLoading('github');
      authProvider = new GithubAuthProvider();
    }
    
    try {
      console.log(`Attempting to sign in with ${provider}`);
      const result = await signInWithPopup(auth, authProvider);
      const user = result.user;
      
      console.log(`${provider} login successful for user:`, user.uid);
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log("Creating new user document in Firestore");
        // Create new user document if first time login
        await setDoc(userRef, {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          photoURL: user.photoURL || '/images/default-avatar.png',
          createdAt: Timestamp.now(),
          lastLogin: Timestamp.now(),
          isEmailVerified: user.emailVerified,
          authProvider: provider
        });
      } else {
        console.log("Updating existing user's last login");
        // Update last login time
        await setDoc(userRef, {
          lastLogin: Timestamp.now()
        }, { merge: true });
      }
      
      // Show loading state before redirecting
      setSocialLoginLoading(`${provider}-redirecting`);
      
      // Navigate to dashboard with replace to prevent going back to login
      console.log("Redirecting to dashboard...");
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      
      let errorMessage = `${provider} login failed. Please try again.`;
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      }
      
      setErrors({ submit: errorMessage });
      setSocialLoginLoading('');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setErrors({ resetEmail: 'Please enter your email address' });
      return;
    }
    
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(resetEmail)) {
      setErrors({ resetEmail: 'Please enter a valid email address' });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Sending password reset email to:", resetEmail);
      await sendPasswordResetEmail(auth, resetEmail);
      setResetEmailSent(true);
      setErrors({});
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      }
      
      setErrors({ resetEmail: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword(!showForgotPassword);
    setErrors({});
    setResetEmailSent(false);
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

  // Show loading spinner while checking authentication
  if (checkingAuth) {
    return (
      <div className="loading-container">
        <motion.div 
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "linear" 
          }}
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
                
                <motion.h2 variants={itemVariants} className="form-title">Reset Password</motion.h2>
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
                    <p>Help is on the way.
                       Please check your email</p>
                    <button 
                      className="back-to-login-button"
                      onClick={toggleForgotPassword}
                    >
                      Return to Login
                    </button>
                  </motion.div>
                ) : (
                  <motion.form onSubmit={handleForgotPassword} variants={itemVariants} autoComplete="off" noValidate>
                    <div className="form-group">
                      <label htmlFor="resetEmail">Email Address</label>
                      <div className="input-with-icon">
                        {/* <FaEnvelope className="input-icon" /> */}
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
                      {errors.resetEmail && <span className="error-message">{errors.resetEmail}</span>}
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
                <motion.h2 variants={itemVariants} className="form-title">Welcome Back</motion.h2>
                <motion.p variants={itemVariants} className="form-subtitle">
                  Sign in to access your account
                </motion.p>
                
                {isLocked ? (
                  <motion.div 
                    className="lockout-message"
                    variants={itemVariants}
                  >
                    <p>Too many failed login attempts.</p>
                    <p>Please try again in {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}</p>
                  </motion.div>
                ) : (
                  <motion.form onSubmit={handleSubmit} variants={itemVariants} autoComplete="off" noValidate>
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <div className="input-with-icon">
                        {/* <FaEnvelope className="input-icon" /> */}
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
                      <label htmlFor="password">Password</label>
                      <div className="input-with-icon">
                        {/* <FaLock className="input-icon" /> */}
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
                      {errors.password && <span className="error-message">{errors.password}</span>}
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

                    {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}

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
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link to="/signup" className="signup-link">Sign up</Link>
                      </motion.span>
                    </p>
                  </motion.form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
