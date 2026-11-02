import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import NightDayToggle from './NightDayToggle';
import './Home.css';

export default function Home() {
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Check user auth state
    const username = localStorage.getItem('username');

    // Default Fallback Events if database is connecting
    const defaultEvents = [
        {
            id: 1,
            title: "Addis Tech & Innovation Expo 2026",
            location: "Millennium Hall, Addis Ababa",
            event_date: "2026-09-15 09:00:00",
            ticket_price: 49.99,
            category: "Tech & Innovation"
        },
        {
            id: 2,
            title: "Grand Ethiopian Music Festival",
            location: "Ghion Hotel Open Grounds, Addis Ababa",
            event_date: "2026-10-02 18:00:00",
            ticket_price: 25.00,
            category: "Concert & Music"
        },
        {
            id: 3,
            title: "Great Ethiopian Run & Fitness Gala",
            location: "Meskel Square, Addis Ababa",
            event_date: "2026-11-20 06:30:00",
            ticket_price: 15.00,
            category: "Sports & Fitness"
        }
    ];

    // Fetch Events from Backend
    useEffect(() => {
        axios.get('http://localhost:3000/public/events')
            .then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setEvents(res.data);
                } else {
                    setEvents(defaultEvents);
                }
            })
            .catch(err => {
                console.log("Using fallback home events:", err);
                setEvents(defaultEvents);
            });
    }, []);

    // Smooth Scroll Function
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Filtered events based on search input
    const displayEvents = events.length > 0 ? events : defaultEvents;
    const filteredEvents = displayEvents.filter(event => 
        (event.title && event.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Book Now Button Handler
    const handleBookNow = (eventId) => {
        const loggedInUser = localStorage.getItem('username');
        if (loggedInUser) {
            // Direct to booking checkout page for this event
            navigate(`/book/${eventId}`);
        } else {
            // Direct to registration first
            navigate('/register');
        }
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="home-wrapper">
            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <div className="nav-logo" onClick={() => scrollToSection('home')}>
                    Event<span>Hub</span>
                </div>
                <ul className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    <li onClick={() => { scrollToSection('home'); setIsMobileMenuOpen(false); }}>Home</li>
                    <li onClick={() => { scrollToSection('about'); setIsMobileMenuOpen(false); }}>About</li>
                    <li onClick={() => { scrollToSection('services'); setIsMobileMenuOpen(false); }}>Services</li>
                    <li onClick={() => { scrollToSection('contact'); setIsMobileMenuOpen(false); }}>Contact</li>
                </ul>
                <div className="nav-auth">
                    <NightDayToggle />
                    {username ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--clr-text-muted)' }} className="user-nav-name">👋 {username}</span>
                            <Link to="/user" className="btn-signup">My Dashboard</Link>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="btn-login">Login</Link>
                            <Link to="/register" className="btn-signup">Sign Up</Link>
                        </>
                    )}
                    <button 
                        type="button" 
                        className="mobile-hamburger" 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header id="home" className="hero-section">
                <div className="hero-overlay">
                    <h1>Online Event Booking & Ticketing</h1>
                    <p>Your gateway to the most exciting events in the city.</p>
                    <div className="search-container">
                        <input 
                            type="text" 
                            className="search-input"
                            placeholder="Search events, cities, or venues..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="search-btn" onClick={() => scrollToSection('events-section')}>
                            Search
                        </button>
                    </div>
                </div>
            </header>

            {/* --- EVENTS SECTION --- */}
            <main id="events-section" className="main-content">
                <h2 className="section-title">Upcoming Events</h2>
                <div className="event-grid">
                    {filteredEvents.length > 0 ? (
                        filteredEvents.map(event => (
                            <div className="event-card" key={event.id}>
                                <div 
                                    className="card-image"
                                    style={{
                                        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.85)), url(${event.image_url || [
                                            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80',
                                            'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=800&q=80'
                                        ][(typeof event.id === 'number' ? event.id : (event.id ? String(event.id).charCodeAt(0) : 0)) % 10]})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <div className="date-tag">
                                        {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                <div className="card-body">
                                    <h3>{event.title}</h3>
                                    <p className="loc">📍 {event.location}</p>
                                    <div className="card-footer">
                                        <span className="price">${event.ticket_price}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleBookNow(event.id)} 
                                            className="btn-book"
                                        >
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-data">No upcoming events found.</p>
                    )}
                </div>
            </main>

            {/* --- ABOUT SECTION --- */}
            <section id="about" className="info-section">
                <div className="container">
                    <h2>About EventHub</h2>
                    <p>We are the leading platform for digital ticketing. Whether it's a concert, a tech conference, or a local workshop, we connect you to the experiences that matter most.</p>
                </div>
            </section>

            {/* --- SERVICES SECTION --- */}
            <section id="services" className="services-section">
                <div className="container">
                    <h2 className="section-title">Our Services</h2>
                    <div className="service-grid">
                        <div className="service-card">
                            <div className="icon">🎫</div>
                            <h3>Easy Booking</h3>
                            <p>Select your seat and get your ticket in seconds.</p>
                        </div>
                        <div className="service-card">
                            <div className="icon">🛡️</div>
                            <h3>Secure Payment</h3>
                            <p>Multiple payment methods with high-end encryption.</p>
                        </div>
                        <div className="service-card">
                            <div className="icon">📱</div>
                            <h3>Digital Tickets</h3>
                            <p>No printing needed. Just show your phone at the gate.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CONTACT SECTION (FOOTER) --- */}
            <footer id="contact" className="home-footer">
                <div className="footer-container">
                    <div className="footer-top">
                        <div className="footer-info">
                            <h3>Contact Us</h3>
                            <p>Have questions? Reach out to our 24/7 support team.</p>
                            <div className="contact-details">
                                <p>📧 support@eventhub.com</p>
                                <p>📞 +251 900 000 000</p>
                                <p>📍 Wollo / Kombolcha, Ethiopia</p>
                            </div>
                        </div>

                        <div className="footer-social">
                            <h3>Follow Us</h3>
                            <div className="social-icons">
                                <span>Facebook </span>
                                <span>Twitter </span>
                                <span>Instagram</span>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>&copy; 2026 Online Event Booking & Ticketing System. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}