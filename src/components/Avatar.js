import React, { useState } from 'react';

const AVATAR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
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

  const initial = ((user?.username || user?.firstName || user?.displayName || 'U').charAt(0) || 'U').toUpperCase();
  const colorIndex = initial.charCodeAt(0) % AVATAR_COLORS.length;
  const backgroundColor = AVATAR_COLORS[colorIndex];

  return (
    <div
      className={`avatar-initial ${className}`}
      role="img"
      aria-label={user?.firstName || user?.username || 'User'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: size * 0.45,
        flexShrink: 0
      }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
