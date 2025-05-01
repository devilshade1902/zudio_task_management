import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import 'boxicons/css/boxicons.min.css';
import '../../pages/LoginSignup/LoginSignup.css';

const VerifyOtp = () => {
  const [formData, setFormData] = useState({
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post('http://localhost:5001/api/users/verify-otp', {
        email,
        otp: formData.otp,
        password: formData.password,
      });
      setSuccess('Password reset successfully. Redirecting to login...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-signup-wrapper">
      <div className="container">
        <div className="form-box verify-otp">
          <form onSubmit={handleSubmit}>
            <h1>Verify OTP</h1>
            <p>Enter the OTP sent to {email} and your new password.</p>
            <div className="input-box">
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder="6-Digit OTP"
                required
              />
              <i className="bx bxs-key"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="New Password"
                required
              />
              <i className="bx bxs-lock-alt"></i>
            </div>
            <div className="input-box">
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                required
              />
              <i className="bx bxs-lock"></i>
            </div>
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify OTP & Reset Password'}
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

export default VerifyOtp;