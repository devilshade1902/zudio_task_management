import React, { useState, useEffect } from 'react';
import './LoginSignup.css';
import 'boxicons/css/boxicons.min.css';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { auth, provider, signInWithPopup } from '../../firebaseConfig';

const LoginSignup = () => {
  const [isActive, setIsActive] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.showSignup) {
      setIsActive(true);
    }
  }, [location.state]);

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignupChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5001/api/users/login', loginData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/api/users/signup', {
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsActive(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem('token', result.user.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setError('Google Sign-In failed.');
    }
  };

  const handleSignupClick = () => {
    setIsActive(true);
    setError(null);
  };

  const handleLoginClick = () => {
    setIsActive(false);
    setError(null);
  };

  return (
    <div className="login-signup-wrapper">
      <div className={`container ${isActive ? 'active' : ''}`}>
        {/* Login Box */}
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>
            <div className="input-box">
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                placeholder="Email"
                required
              />
              <i className="bx bxs-envelope"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                placeholder="Password"
                required
              />
              <i className="bx bxs-lock-alt"></i>
            </div>
            <div className="forgot-link">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <p>or login with social platforms</p>
            <div className="social-icons">
              <button type="button" onClick={handleGoogleLogin}>
                <i className="bx bxl-google"></i>
              </button>
              <button type="button">
                <i className="bx bxl-github"></i>
              </button>
              <button type="button">
                <i className="bx bxl-linkedin"></i>
              </button>
            </div>
          </form>
        </div>

        {/* Signup Box */}
        <div className="form-box signup">
          <form onSubmit={handleSignupSubmit}>
            <h1>Signup</h1>
            <div className="input-box">
              <input
                type="text"
                name="name"
                value={signupData.name}
                onChange={handleSignupChange}
                placeholder="Username"
                required
              />
              <i className="bx bxs-user"></i>
            </div>
            <div className="input-box">
              <input
                type="email"
                name="email"
                value={signupData.email}
                onChange={handleSignupChange}
                placeholder="Email"
                required
              />
              <i className="bx bxs-envelope"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="password"
                value={signupData.password}
                onChange={handleSignupChange}
                placeholder="Password"
                required
              />
              <i className="bx bxs-lock-alt"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="confirmPassword"
                value={signupData.confirmPassword}
                onChange={handleSignupChange}
                placeholder="Confirm Password"
                required
              />
              <i className="bx bxs-lock"></i>
            </div>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Signup'}
            </button>
            <p>or signup with social platforms</p>
            <div className="social-icons">
              <button type="button" onClick={handleGoogleLogin}>
                <i className="bx bxl-google"></i>
              </button>
              <button type="button">
                <i className="bx bxl-github"></i>
              </button>
              <button type="button">
                <i className="bx bxl-linkedin"></i>
              </button>
            </div>
          </form>
        </div>

        {/* Toggle Panel */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <img src="/main-logo.png" alt="Main Logo" className="logo-image" />
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <button className="btn signup-btn" onClick={handleSignupClick}>
              Signup
            </button>
          </div>
          <div className="toggle-panel toggle-right">
            <img src="/main-logo.png" alt="Main Logo" className="logo-image" />
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button className="btn login-btn" onClick={handleLoginClick}>
              Login
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-popup-overlay">
            <div className="error-popup">
              <h3>Error</h3>
              <p>{error}</p>
              <button className="close-btn" onClick={() => setError(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginSignup;