import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router";
import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import Login from "./login";
import Signup from "./signup";
import Dashboard from "./Dashboard";
import { FaGithub, FaTwitter, FaLinkedin, FaDiscord, FaCode, FaLaptopCode, FaUsers, FaRocket, 
         FaBars, FaTimes, FaSignOutAlt, FaUser, FaCog, FaBell, FaBookmark } from 'react-icons/fa';
import Events from "./events";
import EventDetail from "./eventDetail";
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
// import DashboardNetworkTest from './DashboardNetworkTest';

// Navbar component with animations and auth state
const Navbar = ({ isLoggedIn, userProfile, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll event to add shadow to navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.nav-menu') && !event.target.closest('.menu-toggle')) {
        setIsMenuOpen(false);
      }
      
      // Close dropdown when clicking outside
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isDropdownOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <motion.nav 
      className={`navbar ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="logo-container"
          >
            <FaCode className="logo-icon" /> 
            <span>Commute</span>
          </motion.div>
        </Link>
        
        <motion.button 
          className="menu-toggle"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </motion.button>

        <AnimatePresence>
          {(isMenuOpen || window.innerWidth > 768) && (
            <motion.div 
              className={`nav-menu ${isMenuOpen ? 'active' : ''}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div className="nav-links">
                <NavLink to="/events" label="Events" currentPath={location.pathname} />
                <NavLink to="/resources" label="Resources" currentPath={location.pathname} />
                <NavLink to="/community" label="Community" currentPath={location.pathname} />
                {isLoggedIn && <NavLink to="/Dashboard" label="Dashboard" currentPath={location.pathname} />}
              </motion.div>
              <motion.div className="auth-buttons">
                {isLoggedIn ? (
                  <div 
                    className="user-profile-menu" 
                    ref={dropdownRef}
                  >
                    <div 
                      className="user-avatar"
                      onClick={toggleDropdown}
                    >
                      <img 
                        src={userProfile?.photoURL || '/images/default-avatar.png'} 
                        alt={userProfile?.firstName || 'User'} 
                      />
                    </div>
                    
                    <div className="user-dropdown">
                      <Link to="/Dashboard" className="dropdown-item">
                        <FaUser /> Profile
                      </Link>
                      <Link to="/settings" className="dropdown-item">
                        <FaCog /> Settings
                      </Link>
                      <Link to="/notifications" className="dropdown-item">
                        <FaBell /> Notifications
                      </Link>
                      <Link to="/bookmarks" className="dropdown-item">
                        <FaBookmark /> Saved Items
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button 
                        onClick={handleLogout} 
                        className="logout-button"
                      >
                        <FaSignOutAlt /> Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to="/login" className="login-button">Login</Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to="/signup" className="signup-button">Join Us</Link>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

// NavLink component with animations and active state
const NavLink = ({ to, label, currentPath }) => {
  const isActive = currentPath === to || 
                  (to !== '/' && currentPath.startsWith(to));
  
  return (
  <motion.div
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
  >
      <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
        {label}
      </Link>
  </motion.div>
);
};

// Hero section with animations
const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero-title"
        >
          Connect. Learn. Build.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hero-subtitle"
        >
          Join our tech community of developers, designers, and innovators.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="hero-buttons"
        >
          <motion.button 
            className="cta-button primary"
            onClick={() => navigate('/signup')}
            whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.95 }}
          >
            Join the Community
          </motion.button>
          
          <motion.button 
            className="cta-button secondary"
            onClick={() => navigate('/events')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Events
          </motion.button>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="hero-stats"
        >
          <StatItem number="200K+" label="Members" delay={0} />
          <StatItem number="500+" label="Events" delay={0.1} />
          <StatItem number="200+" label="Projects" delay={0.2} />
        </motion.div>
      </div>
      
      <motion.div
        className="hero-image"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <img src="/images/community.svg" alt="Tech community illustration" />
      </motion.div>
    </section>
  );
};

// Stat item with animation
const StatItem = ({ number, label, delay }) => (
  <motion.div 
    className="stat-item"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.6 + delay }}
  >
    <span className="stat-number">{number}</span>
    <span className="stat-label">{label}</span>
  </motion.div>
);

// Features section with animations
const Features = () => {
  const features = [
    {
      icon: <FaUsers />,
      title: "Networking",
      description: "Connect with like-minded professionals and expand your network in the tech industry."
    },
    {
      icon: <FaLaptopCode />,
      title: "Learning Resources",
      description: "Access exclusive tutorials, workshops, and learning materials to enhance your skills."
    },
    {
      icon: <FaRocket />,
      title: "Career Growth",
      description: "Discover job opportunities, mentorship programs, and career advancement resources."
    }
  ];

  return (
    <section className="features-section">
      <motion.h2 
        className="section-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        Why Join Our Community?
      </motion.h2>
      
      <div className="features-container">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            index={index}
          />
        ))}
      </div>
    </section>
  );
};

// Feature card with animation
const FeatureCard = ({ icon, title, description, index }) => (
  <motion.div 
    className="feature-card shadow-hover"
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ 
      y: -10, 
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2 }
    }}
  >
    <motion.div 
      className="feature-icon"
      initial={{ scale: 0.8 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
    >
      {icon}
    </motion.div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
  </motion.div>
);

// Upcoming events section with animations
const UpcomingEvents = () => {
  const navigate = useNavigate();
  const events = [
    {
      title: "Web Development Workshop",
      date: "June 15, 2023",
      time: "6:00 PM - 8:00 PM",
      location: "Virtual",
      image: "/images/webdev.jpg"
    },
    {
      title: "AI & Machine Learning Meetup",
      date: "June 22, 2023",
      time: "5:30 PM - 7:30 PM",
      location: "Tech Hub, Downtown",
      image: "/images/ai-ml.jpg"
    },
    {
      title: "Hackathon 2023",
      date: "July 8-9, 2023",
      time: "48 Hours",
      location: "Innovation Center",
      image: "/images/hackathon.jpg"
    }
  ];

  return (
    <section className="events-section">
      <motion.h2 
        className="section-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        Upcoming Events
      </motion.h2>
      
      <div className="events-container">
        {events.map((event, index) => (
          <EventCard 
            key={index}
            event={event}
            index={index}
          />
        ))}
      </div>
      
      <motion.div 
        className="view-more"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.button
          className="view-all-events-button"
          onClick={() => navigate('/events')}
          whileHover={{ scale: 1.05, x: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          View All Events →
        </motion.button>
      </motion.div>
    </section>
  );
};

// Event card with animation
const EventCard = ({ event, index }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      className="event-card shadow-hover"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ 
        y: -10, 
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2 }
      }}
    >
      <div className="event-image">
        <img src={event.image} alt={event.title} />
      </div>
      <div className="event-details">
        <h3 className="event-title">{event.title}</h3>
        <p className="event-date">{event.date} • {event.time}</p>
        <p className="event-location">{event.location}</p>
        <motion.button 
          className="event-button"
          onClick={() => navigate('/events')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Register
        </motion.button>
      </div>
    </motion.div>
  );
};

// Newsletter section with animations
const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send the email to your backend
      console.log('Subscribing email:', email);
      setIsSubmitted(true);
      setEmail('');
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <section className="newsletter-section">
      <motion.div 
        className="newsletter-container"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h2 
          className="newsletter-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Stay Updated
        </motion.h2>
        
        <motion.p 
          className="newsletter-description"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Subscribe to our newsletter for the latest tech news, events, and resources.
        </motion.p>
        
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div 
              className="success-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Thank you for subscribing! Check your email for confirmation.
            </motion.div>
          ) : (
            <motion.form 
              onSubmit={handleSubmit} 
              className="newsletter-form"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                aria-label="Email subscription input"
              />
              <motion.button 
                type="submit" 
                className="subscribe-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Subscribe
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

// Testimonials section with animations
const Testimonials = () => {
  const testimonials = [
    {
      quote: "Joining this community has been a game-changer for my career. The networking opportunities and resources are invaluable.",
      author: "Sarah Johnson",
      role: "Frontend Developer",
      avatar: "/images/avatar1.jpg"
    },
    {
      quote: "The workshops and events have helped me stay updated with the latest tech trends. Highly recommend for any tech professional!",
      author: "Michael Chen",
      role: "Data Scientist",
      avatar: "/images/avatar2.jpg"
    },
    {
      quote: "I found my current job through this community. The support from fellow members during my job search was amazing.",
      author: "Jessica Williams",
      role: "UX Designer",
      avatar: "/images/avatar3.jpg"
    }
  ];

  return (
    <section className="testimonials-section">
      <motion.h2 
        className="section-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        What Our Members Say
      </motion.h2>
      
      <div className="testimonials-container">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard 
            key={index}
            testimonial={testimonial}
            index={index}
          />
        ))}
      </div>
    </section>
  );
};

// Testimonial card with animation
const TestimonialCard = ({ testimonial, index }) => (
  <motion.div 
    className="testimonial-card shadow-hover"
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileHover={{ 
      y: -10, 
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
      transition: { duration: 0.2 }
    }}
  >
    <div className="quote-icon">"</div>
    <p className="testimonial-quote">{testimonial.quote}</p>
    <div className="testimonial-author">
      <img src={testimonial.avatar} alt={testimonial.author} className="author-avatar" />
      <div className="author-info">
        <h4 className="author-name">{testimonial.author}</h4>
        <p className="author-role">{testimonial.role}</p>
      </div>
    </div>
  </motion.div>
);

// Footer component with animations
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <motion.div 
          className="footer-logo"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <FaCode className="logo-icon" /> Commute
        </motion.div>
        
        <div className="footer-links">
          <FooterColumn 
            title="Community" 
            links={[
              { label: "About Us", url: "/about" },
              { label: "Our Team", url: "/team" },
              { label: "Partners", url: "/partners" },
              { label: "Careers", url: "/careers" }
            ]}
            delay={0}
          />
          
          <FooterColumn 
            title="Resources" 
            links={[
              { label: "Blog", url: "/blog" },
              { label: "Tutorials", url: "/tutorials" },
              { label: "Webinars", url: "/webinars" },
              { label: "Podcasts", url: "/podcasts" }
            ]}
            delay={0.1}
          />
          
          <FooterColumn 
            title="Support" 
            links={[
              { label: "FAQ", url: "/faq" },
              { label: "Contact Us", url: "/contact" },
              { label: "Help Center", url: "/help" },
              { label: "Feedback", url: "/feedback" }
            ]}
            delay={0.2}
          />
          
          <FooterColumn 
            title="Legal" 
            links={[
              { label: "Terms of Service", url: "/terms" },
              { label: "Privacy Policy", url: "/privacy" },
              { label: "Cookie Policy", url: "/cookies" },
              { label: "Community Guidelines", url: "/guidelines" }
            ]}
            delay={0.3}
          />
        </div>
        
        <motion.div 
          className="footer-social"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <SocialIcon href="https://github.com" icon={<FaGithub />} />
          <SocialIcon href="https://twitter.com" icon={<FaTwitter />} />
          <SocialIcon href="https://linkedin.com" icon={<FaLinkedin />} />
          <SocialIcon href="https://discord.com" icon={<FaDiscord />} />
        </motion.div>
        
        <motion.div 
          className="footer-bottom"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p>&copy; {new Date().getFullYear()} Commute. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
};

// Footer column with animation
const FooterColumn = ({ title, links, delay }) => (
  <motion.div 
    className="footer-column"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.2 + delay }}
  >
    <h3>{title}</h3>
    <ul>
      {links.map((link, index) => (
        <motion.li 
          key={index}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.3 + delay + (index * 0.05) }}
        >
          <Link to={link.url}>{link.label}</Link>
        </motion.li>
      ))}
    </ul>
  </motion.div>
);

// Social icon with animation
const SocialIcon = ({ href, icon }) => (
  <motion.a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    whileHover={{ scale: 1.2, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
  >
    {icon}
  </motion.a>
);

// Home component combining all sections
const Home = () => {
  return (
    <>
      <Hero />
      <Features />
      <UpcomingEvents />
      <Testimonials />
      <Newsletter />
    </>
  );
};

// Page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="page-transition"
  >
    {children}
  </motion.div>
);

// Loading spinner component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner">
      <div className="spinner-inner"></div>
    </div>
    <p>Welcome to Commute</p>
  </div>
);

// Placeholder pages for new dropdown menu items
const PlaceholderPage = ({ title }) => (
  <div className="page-container">
    <h1>{title}</h1>
    <p>This page is coming soon.</p>
  </div>
);

// Main App component with auth state
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication state
  useEffect(() => {
    console.log("Checking auth state in App component");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User is logged in:", user.uid);
        setIsLoggedIn(true);
        
        // You could fetch user profile data here if needed
        // For now, we'll just use basic info from auth
        setUserProfile({
          firstName: user.displayName?.split(' ')[0] || 'User',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          photoURL: user.photoURL || '/images/default-avatar.png'
        });
      } else {
        console.log("No user logged in");
        setIsLoggedIn(false);
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      console.log("Logging out user");
      await signOut(auth);
      console.log("User logged out successfully");
      // Navigate to home page is handled by the auth state change
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="*" element={
            <>
              <Navbar 
                isLoggedIn={isLoggedIn} 
                userProfile={userProfile} 
                handleLogout={handleLogout} 
              />
        <main className="main-content">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={
                <PageTransition>
                  <Home />
                </PageTransition>
              } />
              <Route path="/login" element={
                <PageTransition>
                  <Login />
                </PageTransition>
              } />
              <Route path="/signup" element={
                <PageTransition>
                  <Signup />
                </PageTransition>
              } />
              <Route path="/events" element={
                <PageTransition>
                  <Events />
                </PageTransition>
              } />
              <Route path="/events/:eventId" element={
                <PageTransition>
                  <EventDetail />
                </PageTransition>
              } />
                    <Route path="/Dashboard" element={
                      <PageTransition>
                        <Dashboard />
                      </PageTransition>
                    } />
                    <Route path="/settings" element={
                      <PageTransition>
                        <PlaceholderPage title="Settings" />
                      </PageTransition>
                    } />
                    <Route path="/notifications" element={
                      <PageTransition>
                        <PlaceholderPage title="Notifications" />
                      </PageTransition>
                    } />
                    <Route path="/bookmarks" element={
                      <PageTransition>
                        <PlaceholderPage title="Saved Items" />
                      </PageTransition>
                    } />
                    <Route path="/resources" element={
                      <PageTransition>
                        <PlaceholderPage title="Resources" />
                      </PageTransition>
                    } />
                    <Route path="/community" element={
                      <PageTransition>
                        <PlaceholderPage title="Community" />
                      </PageTransition>
                    } />
                    <Route path="/about" element={
                      <PageTransition>
                        <PlaceholderPage title="About Us" />
                      </PageTransition>
                    } />
                    <Route path="/team" element={
                      <PageTransition>
                        <PlaceholderPage title="Our Team" />
                      </PageTransition>
                    } />
                    <Route path="/partners" element={
                      <PageTransition>
                        <PlaceholderPage title="Partners" />
                      </PageTransition>
                    } />
                    <Route path="/careers" element={
                      <PageTransition>
                        <PlaceholderPage title="Careers" />
                      </PageTransition>
                    } />
                    <Route path="/blog" element={
                      <PageTransition>
                        <PlaceholderPage title="Blog" />
                      </PageTransition>
                    } />
                    <Route path="/tutorials" element={
                      <PageTransition>
                        <PlaceholderPage title="Tutorials" />
                      </PageTransition>
                    } />
                    <Route path="/webinars" element={
                      <PageTransition>
                        <PlaceholderPage title="Webinars" />
                      </PageTransition>
                    } />
                    <Route path="/podcasts" element={
                      <PageTransition>
                        <PlaceholderPage title="Podcasts" />
                      </PageTransition>
                    } />
                    <Route path="/faq" element={
                      <PageTransition>
                        <PlaceholderPage title="FAQ" />
                      </PageTransition>
                    } />
                    <Route path="/contact" element={
                      <PageTransition>
                        <PlaceholderPage title="Contact Us" />
                      </PageTransition>
                    } />
                    <Route path="/help" element={
                      <PageTransition>
                        <PlaceholderPage title="Help Center" />
                      </PageTransition>
                    } />
                    <Route path="/feedback" element={
                      <PageTransition>
                        <PlaceholderPage title="Feedback" />
                      </PageTransition>
                    } />
                    <Route path="/terms" element={
                      <PageTransition>
                        <PlaceholderPage title="Terms of Service" />
                      </PageTransition>
                    } />
                    <Route path="/privacy" element={
                      <PageTransition>
                        <PlaceholderPage title="Privacy Policy" />
                      </PageTransition>
                    } />
                    <Route path="/cookies" element={
                      <PageTransition>
                        <PlaceholderPage title="Cookie Policy" />
                      </PageTransition>
                    } />
                    <Route path="/guidelines" element={
                      <PageTransition>
                        <PlaceholderPage title="Community Guidelines" />
                      </PageTransition>
                    } />
                    <Route path="/dashboard-test" element={<DashboardNetworkTest />} />
                    <Route path="*" element={
                      <PageTransition>
                        <div className="page-container">
                          <h1>404 - Page Not Found</h1>
                          <p>The page you are looking for does not exist.</p>
                          <Link to="/" className="cta-button primary">
                            Return to Home
                          </Link>
                        </div>
                      </PageTransition>
                    } />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

// Add scroll to top functionality when navigating between pages
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Add this to detect overflow issues during development
if (process.env.NODE_ENV === 'development') {
document.addEventListener('DOMContentLoaded', function() {
  const findOverflows = () => {
    const docWidth = document.documentElement.offsetWidth;
    const elements = document.querySelectorAll('*');
    
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const elWidth = el.offsetWidth;
      
      if (elWidth > docWidth) {
        console.log('Overflowing element:', el, `Width: ${elWidth}px`);
      }
    }
  };
  
  findOverflows();
});
}

export default App;

