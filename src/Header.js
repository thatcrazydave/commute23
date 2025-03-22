import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';


function Header({ isLoggedIn, handleLogout }) {
  return (
    <header>
      <nav>
        <ul>
          {isLoggedIn ? (
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          ) : (
            <li>
              <Link to="/login">Login</Link>
            </li>
          )}
          <li>
            <Link to="/register">Register</Link>
          </li>
          {isLoggedIn && (
            <li>
              <button onClick={handleLogout}>Logout</button>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;