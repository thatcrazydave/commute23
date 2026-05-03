import React, { useState } from 'react';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', // Red/Orange
  'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)', // Green
  'linear-gradient(135deg, #f83600 0%, #f9d423 100%)', // Orange/Yellow
  'linear-gradient(135deg, #13547a 0%, #80d0c7 100%)', // Deep blue/teal
  'linear-gradient(135deg, #b224ef 0%, #7579ff 100%)', // Pink/Blue
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', // Bright blue
  'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', // Coral
];

const Avatar = ({ user, size = 40, className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const hasCustomPhoto = !imgError && user?.photoURL && !user.photoURL.includes('default-avatar.png');

  if (hasCustomPhoto) {
    return (
      <img
        src={user.photoURL}
        alt={user?.firstName || 'User'}
        className={`avatar-image ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        onError={() => setImgError(true)}
      />
    );
  }

  const nameString = user?.username || user?.firstName || user?.displayName || 'User';
  const initial = nameString.charAt(0).toUpperCase();
  
  // Calculate a simple hash based on a stable identifier to ensure consistent colors
  const idString = String(user?._id || user?.id || user?.email || nameString).toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = idString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % AVATAR_GRADIENTS.length;
  const background = AVATAR_GRADIENTS[colorIndex];

  return (
    <div
      className={`avatar-initial ${className}`}
      role="img"
      aria-label={user?.firstName || user?.username || 'User'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '500',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: size * 0.4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
