import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-inner"></div>
      </div>
      <p>Loading Dashboard...</p>
    </div>
  );
};

export default LoadingSpinner;
