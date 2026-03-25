import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Chrome, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/api/auth/google';
  };

  const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <div className="login-card-wrapper animate-in">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <span>M</span>
                        </div>
                        <h1 className="login-brand">MarketScout</h1>
                    </div>

                    <div className="login-content">
                        <h2 className="login-title">Welcome Back</h2>
                        <p className="login-subtitle">Sign in to access MarketScout analytics</p>

                        {error && (
                            <div className="login-error animate-shake">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" size={18} />
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="admin@marketscout.net"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="password">Password</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type="password"
                                        id="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="login-actions">
                                <Link to="/forgot-password" title="Under development" onClick={(e) => e.preventDefault()} className="forgot-password">
                                    Forgot password?
                                </Link>
                            </div>

                            <button type="submit" className="login-submit" disabled={isLoading}>
                                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                                {!isLoading && <ArrowRight size={18} />}
                            </button>
                        </form>

                        <div className="login-divider">
                            <span>OR</span>
                        </div>

                        <button type="button" className="google-login" onClick={handleGoogleLogin}>
                            <Chrome size={20} />
                            <span>Continue with Google</span>
                        </button>

                        <p className="login-footer">
                            New to MarketScout? <Link to="/register">Create Account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
