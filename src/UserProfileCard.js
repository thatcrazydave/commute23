import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaUser, 
  FaMapMarkerAlt, 
  FaBriefcase, 
  FaGraduationCap, 
  FaEdit,
  FaLink,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaEnvelope,
  FaUserPlus,
  FaCommentAlt
} from 'react-icons/fa';
import './UserProfileCard.css';

const UserProfileCard = ({ user, currentUserId, onEditProfile, onConnect, onMessage }) => {
  if (!user) return null;

  const isCurrentUser = user.id === currentUserId;
  
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  const iconVariants = {
    hover: { 
      scale: 1.2,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className="user-profile-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="profile-header">
        <div className="profile-cover">
          <img 
            src={user.coverURL || '/images/default-cover.jpg'} 
            alt="Cover" 
            className="cover-image"
          />
          {isCurrentUser && (
            <motion.button 
              className="edit-cover-button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEditProfile && onEditProfile('cover')}
            >
              <FaEdit />
            </motion.button>
          )}
        </div>
        
        <div className="profile-avatar-container">
          <img 
            src={user.photoURL || '/images/default-avatar.png'} 
            alt={user.firstName || 'User'} 
            className="profile-avatar"
          />
          {isCurrentUser && (
            <motion.button 
              className="edit-avatar-button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEditProfile && onEditProfile('avatar')}
            >
              <FaEdit />
            </motion.button>
          )}
        </div>
      </div>
      
      <div className="profile-info">
        <h3 className="profile-name">
          {user.firstName || 'User'} {user.lastName || ''}
        </h3>
        
        {user.headline && (
          <p className="profile-headline">{user.headline}</p>
        )}
        
        {user.bio && (
          <p className="profile-bio">{user.bio}</p>
        )}
        
        <div className="profile-details">
          {user.location && (
            <div className="profile-detail">
              <FaMapMarkerAlt className="detail-icon" />
              <span>{user.location}</span>
            </div>
          )}
          
          {user.company && (
            <div className="profile-detail">
              <FaBriefcase className="detail-icon" />
              <span>{user.company}</span>
            </div>
          )}
          
          {user.education && (
            <div className="profile-detail">
              <FaGraduationCap className="detail-icon" />
              <span>{user.education}</span>
            </div>
          )}
          
          {user.email && (
            <div className="profile-detail">
              <FaEnvelope className="detail-icon" />
              <span>{user.email}</span>
            </div>
          )}
        </div>
        
        {user.skills && user.skills.length > 0 && (
          <div className="profile-skills">
            <h4 className="skills-title">Skills</h4>
            <div className="skills-container">
              {user.skills.map((skill, index) => (
                <span key={index} className="skill-tag">{skill}</span>
              ))}
            </div>
          </div>
        )}
        
        {user.socialLinks && Object.values(user.socialLinks).some(link => link) && (
          <div className="social-links">
            {user.socialLinks.website && (
              <motion.a 
                href={user.socialLinks.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-link"
                variants={iconVariants}
                whileHover="hover"
                aria-label="Website"
              >
                <FaLink />
              </motion.a>
            )}
            
            {user.socialLinks.github && (
              <motion.a 
                href={user.socialLinks.github} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-link"
                variants={iconVariants}
                whileHover="hover"
                aria-label="GitHub"
              >
                <FaGithub />
              </motion.a>
            )}
            
            {user.socialLinks.linkedin && (
              <motion.a 
                href={user.socialLinks.linkedin} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-link"
                variants={iconVariants}
                whileHover="hover"
                aria-label="LinkedIn"
              >
                <FaLinkedin />
              </motion.a>
            )}
            
            {user.socialLinks.twitter && (
              <motion.a 
                href={user.socialLinks.twitter} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="social-link"
                variants={iconVariants}
                whileHover="hover"
                aria-label="Twitter"
              >
                <FaTwitter />
              </motion.a>
            )}
          </div>
        )}
        
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{user.connectionsCount || 0}</span>
            <span className="stat-label">Connections</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.postsCount || 0}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.eventsCount || 0}</span>
            <span className="stat-label">Events</span>
          </div>
        </div>
        
        <div className="profile-actions">
          {isCurrentUser ? (
            <motion.button 
              className="edit-profile-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onEditProfile && onEditProfile('all')}
            >
              <FaEdit /> Edit Profile
            </motion.button>
          ) : (
            <div className="action-buttons">
              <motion.button 
                className="connect-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onConnect && onConnect(user.id)}
              >
                <FaUserPlus /> Connect
              </motion.button>
              
              <motion.button 
                className="message-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onMessage && onMessage(user.id)}
              >
                <FaCommentAlt /> Message
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;