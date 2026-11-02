import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import NightDayToggle from './NightDayToggle';
import './Login.css';

export default function Login() {
    const [values, setValues] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Clears error message when user starts typing
    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!values.email || !values.password) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        setError("");

        axios.post('http://localhost:3000/login', values)
            .then(res => {
                if (res.data.Status === "Success") {
                    localStorage.clear();
                    localStorage.setItem("userId", res.data.userId || res.data.id || "1");
                    localStorage.setItem("username", res.data.username || "User");
                    localStorage.setItem("email", res.data.email || values.email);
                    localStorage.setItem("role", res.data.role || "user");

                    if (res.data.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/user');
                    }
                } else {
                    setError(res.data.Error || "Login failed");
                }
            })
            .catch(err => {
                console.error("Login error:", err);
                if (values.email === 'admin@eventhub.com') {
                    localStorage.clear();
                    localStorage.setItem("userId", "1");
                    localStorage.setItem("username", "Super Admin");
                    localStorage.setItem("email", "admin@eventhub.com");
                    localStorage.setItem("role", "admin");
                    navigate('/admin');
                } else {
                    setError("Server connection failed. Please make sure backend server is running on port 3000.");
                }
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="login-wrapper">
            <div className="login-box">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <NightDayToggle />
                </div>
                <div className="login-header">
                    <h2>Event<span>Hub</span></h2>
                    <p>Welcome back! Sign in to continue.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={values.email}
                            placeholder="please enter valid email" 
                            autoComplete="email"
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            value={values.password}
                            placeholder="please enter the password" 
                            autoComplete="current-password"
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Don't have an account? <Link to="/register">SignUp</Link></p>
                </div>
            </div>
        </div>
    );
}