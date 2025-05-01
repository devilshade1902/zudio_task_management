import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import 'boxicons/css/boxicons.min.css';
import '../../pages/LoginSignup/LoginSignup.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/api/users/forgot-password', { email });
      if (res.data.exists) {
        setSuccess('OTP sent to your email. Please check your inbox.');
        setTimeout(() => navigate('/verify-otp', { state: { email } }), 2000);
      } else {
        setError('Email does not exist. Please create an account.');
        setTimeout(() => navigate('/', { state: { showSignup: true } }), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-signup-wrapper">
      <div className="container">
        <div className="form-box forgot-password">
          <form onSubmit={handleSubmit}>
            <h1>Forgot Password</h1>
            <p>Enter your email to receive a one-time password (OTP).</p>
            <div className="input-box">
              <input
                type="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="Email"
                required
              />
              <i className="bx bxs-envelope"></i>
            </div>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="back-to-login">
              <Link to="/">Back to Login</Link>
            </div>
          </form>
        </div>
        {(error || success) && (
          <div className="error-popup-overlay">
            <div className="error-popup">
              <h3>{error ? 'Error' : 'Success'}</h3>
              <p>{error || success}</p>
              <button
                className="close-btn"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;