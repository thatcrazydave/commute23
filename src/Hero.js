import React from 'react';

function Hero() {
  const greeting = getGreeting();

  return (
    <section className="hero">
      <div className="hero-content">
        <h1>{greeting}, Welcome to Our Community!</h1>
        <p>Join us in creating something amazing together. Let's build, learn, and grow!</p>
        <button onClick={() => scrollToNewsletter()}>Get Started</button>
      </div>
    </section>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good Morning';
  } else if (hour < 18) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
}

function scrollToNewsletter() {
  const newsletterSection = document.getElementById('newsletter');
  newsletterSection.scrollIntoView({ behavior: 'smooth' });
}

export default Hero;