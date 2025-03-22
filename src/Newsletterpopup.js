import React from 'react';
import './Newsletterpopup.css';


function NewsletterPopup({ csrfToken, handleClosePopup }) {
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const isValidEmail = validateEmail(email);
    if (isValidEmail) {
      // Send email to server
      fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, csrfToken }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setSuccessMessage('Thank you for subscribing!');
          } else {
            setErrorMessage('Error subscribing to newsletter.');
          }
        })
        .catch((error) => {
          setErrorMessage('Error subscribing to newsletter.');
        });
    } else {
      setErrorMessage('Invalid email address.');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  return (
    <div className="newsletter-popup">
      <span className="close-btn" onClick={handleClosePopup}>
        &times;
      </span>
      <h3>Subscribe to Our Newsletter</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          required
        />
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <button type="submit">Subscribe</button>
      </form>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <p>
        <small>
          By subscribing, you agree to our{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            privacy policy
          </a>
          .
        </small>
      </p>
    </div>
  );
}

export default NewsletterPopup;