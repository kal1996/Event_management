import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import NightDayToggle from './NightDayToggle';
import './Register.css';

export default function Register() {
    const [values, setValues] = useState({
        username: '',
        email: '',
        password: '',
        phonenumber: '+251' // Default prefix
    });

    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validate = () => {
        let tempErrors = {};
        
        // Username: Letters and spaces, min 3 chars
        if (!values.username.trim()) {
            tempErrors.username = "Username is required";
        } else if (values.username.length < 3) {
            tempErrors.username = "Username must be at least 3 characters";
        }

        // Email: Standard email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values.email)) {
            tempErrors.email = "Please enter a valid email address";
        }

        // Password: Min 8 chars, 1 Uppercase, 1 Special Char
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!passwordRegex.test(values.password)) {
            tempErrors.password = "Need 8+ chars, 1 Uppercase, & 1 Special character";
        }

        // Phone: Must start with +251 and have 9 digits after
        const phoneRegex = /^\+251\d{9}$/;
        if (!phoneRegex.test(values.phonenumber)) {
            tempErrors.phonenumber = "Format: +251 followed by 9 digits";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
        // Clear error as user types
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: "" });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validate()) {
            axios.post('http://localhost:3000/register', values)
                .then(res => {
                    if (res.data.Status === "Success") {
                        localStorage.clear();
                        localStorage.setItem("userId", res.data.userId || "1");
                        localStorage.setItem("username", values.username);
                        localStorage.setItem("email", values.email);
                        localStorage.setItem("role", "user");

                        alert("Registration Successful! Welcome to EventHub.");
                        navigate('/user');
                    } else {
                        alert("Error: " + res.data.Error);
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert("Server Error. Ensure your Node.js backend is running on port 3000.");
                });
        }
    };

    return (
        <div className="register-wrapper">
            <div className="register-box">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <NightDayToggle />
                </div>
                <h2>Create Account</h2>
                <p className="subtitle">Join EventHub today</p>
                
                <form onSubmit={handleSubmit} noValidate>
                   
                     <div className="input-group">
                        <label>Full Name</label>
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="enter first name"
                            className={errors.username  ? "error-input" : ""}
                            onChange={handleChange} 
                        />
                        {errors.username && <span className="error-msg">{errors.username}</span>}
                    </div>

                     

                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            name="email" 
                            placeholder="enter valid email address"
                            className={errors.email ? "error-input" : ""}
                            onChange={handleChange} 
                        />
                        {errors.email && <span className="error-msg">{errors.email}</span>}
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            placeholder="••••••••"
                            className={errors.password ? "error-input" : ""}
                            onChange={handleChange} 
                        />
                        {errors.password && <span className="error-msg">{errors.password}</span>}
                    </div>

                    

                    <div className="input-group">
                        <label>Phone Number</label>
                        <input 
                            type="text" 
                            name="phonenumber" 
                            value={values.phonenumber}
                            className={errors.phonenumber ? "error-input" : ""}
                            onChange={handleChange} 
                        />
                        {errors.phonenumber && <span className="error-msg">{errors.phonenumber}</span>}
                    </div>

                    <button type="submit" className="register-btn">Sign Up</button>
                    
                    <p className="footer-text">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}