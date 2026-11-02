import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NightDayToggle from './NightDayToggle';
import './UserDashboard.css';

export default function UserDashboard() {
    const navigate = useNavigate();

    // User Identity State
    const [userId, setUserId] = useState('');
    const [authName, setAuthName] = useState('');
    const [authEmail, setAuthEmail] = useState('');

    // Dashboard State
    const [activeTab, setActiveTab] = useState('events'); // 'events', 'tickets', 'saved', 'history', 'profile'
    const [events, setEvents] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('date');
    const [loading, setLoading] = useState(true);

    // Bookmarked / Saved Events State
    const [savedEventIds, setSavedEventIds] = useState(() => {
        const localSaved = localStorage.getItem('savedEvents');
        return localSaved ? JSON.parse(localSaved) : [];
    });

    // Announcement Banner Dismiss State
    const [showBanner, setShowBanner] = useState(true);

    // Event Quick Details Modal State
    const [viewEventDetail, setViewEventDetail] = useState(null);

    // Booking Modal State
    const [bookingEvent, setBookingEvent] = useState(null);
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [ticketTier, setTicketTier] = useState('Regular');
    const [paymentMethod, setPaymentMethod] = useState('Telebirr');
    const [isBooking, setIsBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(null);

    // Payment Gateway Input States
    const [telebirrPhone, setTelebirrPhone] = useState('');
    const [cbePhone, setCbePhone] = useState('');
    const [chapaPhone, setChapaPhone] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExp, setCardExp] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [bankRef, setBankRef] = useState('');
    const [copiedAccount, setCopiedAccount] = useState('');

    // QR Ticket Pass Modal State
    const [selectedTicket, setSelectedTicket] = useState(null);

    // Refund Modal State
    const [refundBooking, setRefundBooking] = useState(null);
    const [refundReason, setRefundReason] = useState('');
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

    // Profile Settings Form State
    const [profileData, setProfileData] = useState({
        username: '',
        phonenumber: '+251911223344',
        password: '',
        confirmPassword: ''
    });
    const [profileMsg, setProfileMsg] = useState('');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Time-based Greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    // Authentication Guard & Initial Data Fetch
    useEffect(() => {
        const name = localStorage.getItem('username');
        const uid = localStorage.getItem('userId');
        const email = localStorage.getItem('email');

        if (!name || !uid) {
            navigate('/login');
            return;
        }

        setAuthName(name);
        setUserId(uid);
        setAuthEmail(email || '');
        setProfileData(prev => ({ ...prev, username: name }));

        loadUserDashboardData(uid);
    }, [navigate]);

    const loadUserDashboardData = (uid) => {
        setLoading(true);
        // Fetch all active events
        axios.get('http://localhost:3000/user/events')
            .then(res => {
                setEvents(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error("Error loading events:", err));

        // Fetch user's bookings and digital tickets
        axios.get(`http://localhost:3000/user/bookings/${uid}`)
            .then(res => {
                setMyBookings(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error("Error loading user bookings:", err))
            .finally(() => setLoading(false));
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // Toggle Favorite / Bookmarked Event
    const toggleSaveEvent = (eventId, e) => {
        if (e) e.stopPropagation();
        setSavedEventIds(prev => {
            const updated = prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId];
            localStorage.setItem('savedEvents', JSON.stringify(updated));
            return updated;
        });
    };

    // Calculate Analytics Counters
    const activeTicketsCount = myBookings.filter(b => b.ticket_status !== 'refunded' && b.ticket_status !== 'revoked').length;
    const totalSpent = myBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
    const refundRequestsCount = myBookings.filter(b => b.ticket_status === 'refund_pending').length;

    // Filter Events by Category, Saved tab, and Search Query
    let filteredEvents = events.filter(ev => {
        const isSavedTab = activeTab === 'saved';
        const matchesCategory = isSavedTab ? savedEventIds.includes(ev.id) : (selectedCategory === 'All' || ev.category === selectedCategory);
        const matchesSearch = ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              ev.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Apply Sorting Rules
    filteredEvents.sort((a, b) => {
        if (sortBy === 'price_asc') return parseFloat(a.ticket_price) - parseFloat(b.ticket_price);
        if (sortBy === 'price_desc') return parseFloat(b.ticket_price) - parseFloat(a.ticket_price);
        if (sortBy === 'availability') return (b.available_tickets ?? b.total_tickets) - (a.available_tickets ?? a.total_tickets);
        return new Date(a.event_date) - new Date(b.event_date);
    });

    // Handle Open Booking Modal
    const handleOpenBooking = (event) => {
        setBookingEvent(event);
        setTicketQuantity(1);
        setTicketTier('Regular');
        setPaymentMethod('Telebirr');
        setBookingSuccess(null);
        setViewEventDetail(null);
    };

    // Calculate Ticket Price
    const calculateTotalPrice = () => {
        if (!bookingEvent) return 0;
        let base = parseFloat(bookingEvent.ticket_price || 0);
        if (ticketTier === 'VIP') base *= 1.5;
        if (ticketTier === 'VVIP') base *= 2.5;
        if (ticketTier === 'Early Bird') base *= 0.85;
        return (base * ticketQuantity).toFixed(2);
    };

    // Process Ticket Booking
    const handleConfirmBooking = (e) => {
        e.preventDefault();
        setIsBooking(true);

        if (paymentMethod === 'Bank Transfer') {
            axios.post('http://localhost:3000/user/book', {
                userId,
                eventId: bookingEvent.id,
                quantity: ticketQuantity,
                ticketType: ticketTier,
                paymentMethod
            })
            .then(res => {
                if (res.data.Status === "Success") {
                    setBookingSuccess(res.data);
                    loadUserDashboardData(userId);
                } else {
                    alert("Booking error: " + (res.data.Error || "Could not complete transaction"));
                }
            })
            .catch(err => {
                console.error("Booking error:", err);
                alert("Transaction failed. Please check network connection.");
            })
            .finally(() => setIsBooking(false));
            return;
        }

        // Chapa Payment Gateway Initialization (Telebirr, CBE Birr, Card, Chapa Direct)
        const userEmail = authEmail || localStorage.getItem('email') || `${authName || 'user'}@eventhub.et`;
        const phone = telebirrPhone || cbePhone || chapaPhone || '+251911223344';
        const nameParts = (cardName || authName || 'Attendee').trim().split(' ');

        axios.post('http://localhost:3000/api/payment/chapa/initialize', {
            userId,
            eventId: bookingEvent.id,
            quantity: ticketQuantity,
            ticketTier: ticketTier,
            email: userEmail,
            firstName: nameParts[0] || 'Valued',
            lastName: nameParts.slice(1).join(' ') || 'Customer',
            phoneNumber: phone,
            paymentMethod: paymentMethod
        })
        .then(res => {
            if (res.data && res.data.Status === "Success" && res.data.checkoutUrl) {
                window.location.href = res.data.checkoutUrl;
            } else {
                alert("Payment Gateway Error: " + (res.data.Error || "Could not initialize checkout"));
                setIsBooking(false);
            }
        })
        .catch(err => {
            console.error("Chapa init error:", err);
            // Fallback direct simulator
            const fallbackTx = `EH-CHAPA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            navigate(`/chapa-checkout/${fallbackTx}`);
            setIsBooking(false);
        });
    };

    // Process Refund Request
    const handleSubmitRefund = (e) => {
        e.preventDefault();
        if (!refundBooking) return;
        setIsSubmittingRefund(true);

        axios.post(`http://localhost:3000/user/cancel-booking/${refundBooking.booking_id}`, {
            userId,
            reason: refundReason
        })
        .then(res => {
            if (res.data.Status === "Success") {
                alert("Refund request submitted successfully! An admin will review your request shortly.");
                setRefundBooking(null);
                setRefundReason('');
                loadUserDashboardData(userId);
            } else {
                alert("Refund request error: " + (res.data.Error || "Submission failed"));
            }
        })
        .catch(err => console.error(err))
        .finally(() => setIsSubmittingRefund(false));
    };

    // Handle Profile Update
    const handleUpdateProfile = (e) => {
        e.preventDefault();
        setProfileMsg('');

        if (profileData.password && profileData.password !== profileData.confirmPassword) {
            setProfileMsg('❌ Passwords do not match');
            return;
        }

        setIsUpdatingProfile(true);

        axios.put(`http://localhost:3000/user/update-profile/${userId}`, {
            username: profileData.username,
            phonenumber: profileData.phonenumber,
            password: profileData.password || undefined
        })
        .then(res => {
            if (res.data.Status === "Success") {
                localStorage.setItem('username', profileData.username);
                setAuthName(profileData.username);
                setProfileMsg('✨ Profile settings updated successfully!');
                setTimeout(() => setProfileMsg(''), 3000);
            } else {
                setProfileMsg('❌ Error updating profile');
            }
        })
        .catch(err => console.error(err))
        .finally(() => setIsUpdatingProfile(false));
    };

    // Print / Download Ticket Pass
    const handlePrintTicket = () => {
        window.print();
    };

    return (
        <div className="user-dashboard-wrapper">
            
            {/* --- SYSTEM ANNOUNCEMENT TICKER BANNER --- */}
            {showBanner && (
                <div style={{
                    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                    color: '#ffffff',
                    padding: '8px 2rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 10px rgba(79, 70, 229, 0.2)'
                }}>
                    <span>⚡ <strong>Special Announcement:</strong> Get 15% OFF Early Bird ticket passes on select live events this month!</span>
                    <button onClick={() => setShowBanner(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>✕</button>
                </div>
            )}

            {/* --- TOP NAVIGATION BAR --- */}
            <header className="user-nav">
                <div className="nav-brand" onClick={() => setActiveTab('events')}>
                    <div className="brand-logo"></div>
                    <div className="brand-text">Event<span>Hub</span></div>
                </div>

                <div className="nav-search-bar">
                    <input 
                        type="text" 
                        placeholder="Search events, concerts, locations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>

                <div className="nav-user-meta">
                    <NightDayToggle />
                    <div className="user-badge" onClick={() => setActiveTab('profile')} title="Manage Account Profile">
                        <div className="avatar">{authName.charAt(0).toUpperCase()}</div>
                        <div className="user-info">
                            <span className="user-name">{authName}</span>
                            <span className="user-role">Member Account</span>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={handleLogout} title="Sign Out">
                        🚪 Logout
                    </button>
                </div>
            </header>

            {/* --- DASHBOARD STATS HERO HEADER BANNER --- */}
            <section className="stats-hero-banner">
                <div className="welcome-headline">
                    <h2>{getGreeting()}, <span>{authName}</span> </h2>
                    <p>Manage your upcoming events, digital QR passes, and ticket bookings easily.</p>
                </div>

                <div className="stats-cards-container">
                    <div className={`stat-box blue ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
                        <div className="stat-icon">🎟️</div>
                        <div className="stat-details">
                            <h3>{activeTicketsCount}</h3>
                            <p>Active Tickets</p>
                        </div>
                    </div>

                    <div className={`stat-box emerald ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
                        <div className="stat-icon">🎪</div>
                        <div className="stat-details">
                            <h3>{events.length}</h3>
                            <p>Available Events</p>
                        </div>
                    </div>

                    <div className={`stat-box purple ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
                        <div className="stat-icon">❤️</div>
                        <div className="stat-details">
                            <h3>{savedEventIds.length}</h3>
                            <p>Saved Events</p>
                        </div>
                    </div>

                    <div className={`stat-box amber ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
                        <div className="stat-icon">🔄</div>
                        <div className="stat-details">
                            <h3>{refundRequestsCount}</h3>
                            <p>Disputes & Refunds</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- DASHBOARD NAVIGATION TABS --- */}
            <div className="dashboard-tabs-bar">
                <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
                    🎪 Explore Events
                </button>
                <button className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
                    ❤️ Saved Events ({savedEventIds.length})
                </button>
                <button className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
                    🎟️ My Digital Tickets ({myBookings.length})
                </button>
                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    📜 Order History
                </button>
                <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                    ⚙️ Profile Settings
                </button>
            </div>

            {/* --- TAB CONTENT VIEWPORT AREA --- */}
            <main className="tab-viewport">

                {/* --- 1. EXPLORE & SAVED EVENTS TAB --- */}
                {(activeTab === 'events' || activeTab === 'saved') && (
                    <div className="tab-pane animate-fade-in">
                        
                        {/* Toolbar: Category Filter Pills & Sort Selector */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                            
                            {/* Category Pills */}
                            {activeTab === 'events' && (
                                <div className="category-pills" style={{ marginBottom: 0 }}>
                                    {['All', 'Tech & Innovation', 'Concert & Music', 'Sports & Fitness', 'Culture & Arts', 'Business & Corporate'].map(cat => (
                                        <button 
                                            key={cat} 
                                            className={`pill ${selectedCategory === cat ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(cat)}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'saved' && (
                                <div className="pane-header" style={{ marginBottom: 0 }}>
                                    <h3 style={{ margin: 0 }}>❤️ My Saved Events ({filteredEvents.length})</h3>
                                </div>
                            )}

                            {/* Sort Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>SORT BY:</span>
                                <select 
                                    value={sortBy} 
                                    onChange={e => setSortBy(e.target.value)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#334155',
                                        outline: 'none',
                                        background: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="date">📅 Date (Soonest First)</option>
                                    <option value="price_asc">💲 Price (Low to High)</option>
                                    <option value="price_desc">💲 Price (High to Low)</option>
                                    <option value="availability"> Availability (Highest First)</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>Fetching upcoming live events...</p>
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">{activeTab === 'saved' ? '❤️' : '🔍'}</div>
                                <h3>{activeTab === 'saved' ? 'No saved events yet' : 'No events matching your search'}</h3>
                                <p>{activeTab === 'saved' ? 'Click the heart icon on any event card to bookmark it for later!' : 'Try clearing your search query or selecting a different category filter.'}</p>
                                {activeTab === 'events' ? (
                                    <button className="primary-btn" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} style={{ marginTop: '1rem' }}>
                                        Clear Filters
                                    </button>
                                ) : (
                                    <button className="primary-btn" onClick={() => setActiveTab('events')} style={{ marginTop: '1rem' }}>
                                        Explore Live Events
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="events-grid">
                                {filteredEvents.map(event => {
                                    const eventDate = new Date(event.event_date);
                                    const isSoldOut = event.available_tickets <= 0;
                                    const isSaved = savedEventIds.includes(event.id);

                                    return (
                                        <div key={event.id} className="event-card-modern">
                                            <div 
                                                className="card-banner"
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
                                                <span className="category-tag">{event.category || 'General'}</span>
                                                
                                                {/* Favorite Bookmark Heart Button */}
                                                <button 
                                                    onClick={(e) => toggleSaveEvent(event.id, e)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '12px',
                                                        right: '12px',
                                                        background: isSaved ? '#fef2f2' : 'rgba(255,255,255,0.85)',
                                                        border: 'none',
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                    title={isSaved ? 'Remove from Saved' : 'Save Event'}
                                                >
                                                    {isSaved ? '❤️' : '🤍'}
                                                </button>

                                                <div className="banner-date">
                                                    <span className="month">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                                    <span className="day">{eventDate.getDate()}</span>
                                                </div>
                                            </div>

                                            <div className="card-content">
                                                <h3 className="event-title">{event.title}</h3>
                                                <p className="event-desc">{event.description || 'Join us for an exciting event experience filled with networking, entertainment, and learning.'}</p>
                                                
                                                <div className="event-meta">
                                                    <span>📍 {event.location}</span>
                                                    <span>⏰ {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>

                                                <div className="availability-bar">
                                                    <div className="bar-header">
                                                        <small>Ticket Availability</small>
                                                        <small>{event.available_tickets} / {event.total_tickets} left</small>
                                                    </div>
                                                    <div className="progress-track">
                                                        <div 
                                                            className="progress-fill" 
                                                            style={{ width: `${Math.min(100, Math.max(5, (event.available_tickets / event.total_tickets) * 100))}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="card-action-footer">
                                                    <div className="price-tag">
                                                        <span className="starting">From</span>
                                                        <span className="amount">${event.ticket_price}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            className="btn-quick-view"
                                                            onClick={() => setViewEventDetail(event)}
                                                            title="View Event Details"
                                                        >
                                                            👁️ Details
                                                        </button>
                                                        <button 
                                                            className={`btn-book-now ${isSoldOut ? 'disabled' : ''}`}
                                                            disabled={isSoldOut}
                                                            onClick={() => handleOpenBooking(event)}
                                                        >
                                                            {isSoldOut ? '🔴 Sold Out' : '⚡ Book Ticket'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- 2. MY DIGITAL TICKETS & QR PASSES TAB --- */}
                {activeTab === 'tickets' && (
                    <div className="tab-pane animate-fade-in">
                        <div className="pane-header">
                            <h3>My Purchased Digital Tickets</h3>
                            <p>Select any ticket pass to display your scannable QR Code or download your printable venue pass.</p>
                        </div>

                        {myBookings.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🎟️</div>
                                <h3>No tickets booked yet</h3>
                                <p>Browse our list of live events and secure your tickets in seconds!</p>
                                <button className="primary-btn" onClick={() => setActiveTab('events')} style={{ marginTop: '1rem' }}>
                                    Explore Events
                                </button>
                            </div>
                        ) : (
                            <div className="tickets-grid">
                                {myBookings.map((b, i) => (
                                    <div key={`ticket-${b.booking_id || i}`} className="ticket-card-stub">
                                        <div className="stub-header">
                                            <span className="ticket-code">{b.ticket_code || `TK-00${b.booking_id}`}</span>
                                            <span className={`status-badge ${b.ticket_status || 'valid'}`}>
                                                {b.ticket_status === 'valid' ? '🟢 VALID PASS' : b.ticket_status?.toUpperCase() || 'VALID'}
                                            </span>
                                        </div>

                                        <div className="stub-body">
                                            <h4>{b.event_title}</h4>
                                            <p className="stub-loc">📍 {b.location}</p>
                                            <p className="stub-date">📅 {new Date(b.event_date).toLocaleDateString()} at {new Date(b.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            
                                            <div className="stub-details-row">
                                                <div>
                                                    <small>TICKET TIER</small>
                                                    <span className="tier-pill">{b.ticket_type || 'Regular'}</span>
                                                </div>
                                                <div>
                                                    <small>QUANTITY</small>
                                                    <strong>{b.tickets_bought || 1} Pass</strong>
                                                </div>
                                                <div>
                                                    <small>PRICE</small>
                                                    <strong>${b.total_amount}</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="stub-footer">
                                            <button className="btn-pass-qr" onClick={() => setSelectedTicket(b)}>
                                                📱 View QR Ticket Pass
                                            </button>
                                            <button className="btn-cancel-refund" onClick={() => setRefundBooking(b)}>
                                                🔄 Request Refund
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- 3. ORDER HISTORY & TRANSACTIONS TAB --- */}
                {activeTab === 'history' && (
                    <div className="tab-pane animate-fade-in">
                        <div className="pane-header">
                            <h3>Transaction & Order Settlement Log</h3>
                            <p>Comprehensive audit record of all your ticket purchases and payments.</p>
                        </div>

                        {myBookings.length === 0 ? (
                            <div className="empty-state">
                                <p>No transaction history recorded for your account.</p>
                            </div>
                        ) : (
                            <div className="table-responsive-wrapper">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Booking ID</th>
                                            <th>Event Name</th>
                                            <th>Date & Time</th>
                                            <th>Tier & Qty</th>
                                            <th>Total Paid</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myBookings.map((b, idx) => (
                                            <tr key={`history-${b.booking_id || idx}`}>
                                                <td><code>#BK-{b.booking_id}</code></td>
                                                <td><strong>{b.event_title}</strong></td>
                                                <td>{new Date(b.booking_date || b.event_date).toLocaleDateString()}</td>
                                                <td><span className="tier-pill">{b.ticket_type || 'Regular'}</span> × {b.tickets_bought}</td>
                                                <td><strong className="text-emerald">${b.total_amount}</strong></td>
                                                <td>
                                                    <span className="status-pill completed">Completed</span>
                                                </td>
                                                <td>
                                                    <button className="btn-table-action" onClick={() => setSelectedTicket(b)}>
                                                        👁️ View Receipt & Pass
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 4. PROFILE SETTINGS TAB --- */}
                {activeTab === 'profile' && (
                    <div className="tab-pane animate-fade-in">
                        <div className="profile-settings-card">
                            <h3>Account Profile Settings</h3>
                            <p>Update your display name, contact phone number, and account credentials.</p>

                            {profileMsg && <div className="profile-msg-alert">{profileMsg}</div>}

                            <form onSubmit={handleUpdateProfile} className="profile-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input 
                                            type="text" 
                                            value={profileData.username}
                                            onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                            required 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Email Address (Read-Only)</label>
                                        <input type="email" value={authEmail} disabled className="input-disabled" />
                                    </div>

                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={profileData.phonenumber}
                                            onChange={e => setProfileData({ ...profileData, phonenumber: e.target.value })}
                                            required 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>New Password (Optional)</label>
                                        <input 
                                            type="password" 
                                            placeholder="Leave blank to keep current password"
                                            value={profileData.password}
                                            onChange={e => setProfileData({ ...profileData, password: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            placeholder="Confirm new password"
                                            value={profileData.confirmPassword}
                                            onChange={e => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="primary-btn save-btn" disabled={isUpdatingProfile}>
                                    {isUpdatingProfile ? '🔄 Saving Changes...' : '💾 Save Profile Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>

            {/* --- EVENT QUICK DETAIL MODAL --- */}
            {viewEventDetail && (
                <div className="modal-overlay" onClick={() => setViewEventDetail(null)}>
                    <div className="modal-card detail-modal animate-pop-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setViewEventDetail(null)}>✕</button>
                        
                        <div className="modal-header">
                            <span className="category-tag">{viewEventDetail.category || 'General'}</span>
                            <h2>{viewEventDetail.title}</h2>
                            <p className="detail-loc">📍 {viewEventDetail.location}</p>
                            <p className="detail-date">📅 {new Date(viewEventDetail.event_date).toLocaleDateString()} at {new Date(viewEventDetail.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>

                        <div className="detail-body" style={{ margin: '1.5rem 0' }}>
                            <h4>About Event</h4>
                            <p style={{ color: '#64748b', lineHeight: '1.6', marginTop: '6px' }}>
                                {viewEventDetail.description || 'Experience an unforgettable event with world-class keynotes, networking opportunities, and live entertainment.'}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
                                <div>
                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>TICKET PRICE</small>
                                    <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#6366f1' }}>${viewEventDetail.ticket_price}</div>
                                </div>
                                <div>
                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>AVAILABILITY</small>
                                    <div style={{ fontSize: '1rem', fontWeight: '800', color: viewEventDetail.available_tickets > 0 ? '#10b981' : '#ef4444' }}>
                                        {viewEventDetail.available_tickets > 0 ? `${viewEventDetail.available_tickets} Available` : 'Sold Out'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                className="primary-btn" 
                                style={{ flex: 1 }}
                                disabled={viewEventDetail.available_tickets <= 0}
                                onClick={() => handleOpenBooking(viewEventDetail)}
                            >
                                ⚡ Book Ticket Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INTERACTIVE BOOKING MODAL --- */}
            {bookingEvent && (
                <div className="modal-overlay" onClick={() => !isBooking && setBookingEvent(null)}>
                    <div className="modal-card booking-modal animate-pop-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setBookingEvent(null)}>✕</button>

                        {!bookingSuccess ? (
                            <>
                                <div className="modal-header">
                                    <span className="modal-badge">{bookingEvent.category || 'Event'}</span>
                                    <h2>{bookingEvent.title}</h2>
                                    <p>📍 {bookingEvent.location} • 📅 {new Date(bookingEvent.event_date).toLocaleDateString()}</p>
                                </div>

                                <form onSubmit={handleConfirmBooking} className="booking-form-body">
                                    {/* 1. Ticket Tier Options */}
                                    <div className="form-group">
                                        <label>1. Select Ticket Tier</label>
                                        <div className="dash-tier-grid">
                                            {[
                                                { id: 'Regular', name: 'Regular', mult: 1.0, badge: 'Standard' },
                                                { id: 'VIP', name: 'VIP Pass', mult: 1.5, badge: 'Popular' },
                                                { id: 'VVIP', name: 'VVIP Exec', mult: 2.5, badge: 'Premium' },
                                                { id: 'Early Bird', name: 'Early Bird', mult: 0.85, badge: 'Save 15%' }
                                            ].map(t => {
                                                const price = (bookingEvent.ticket_price * t.mult).toFixed(2);
                                                const isSelected = ticketTier === t.id;
                                                return (
                                                    <div 
                                                        key={t.id} 
                                                        className={`dash-tier-card ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => setTicketTier(t.id)}
                                                    >
                                                        <div className="dash-tier-top">
                                                            <span>{t.name}</span>
                                                            <span className="dash-badge">{t.badge}</span>
                                                        </div>
                                                        <div className="dash-tier-price">${price}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 2. Quantity Stepper */}
                                    <div className="form-group">
                                        <label>2. Ticket Quantity</label>
                                        <div className="dash-stepper-row">
                                            <button 
                                                type="button" 
                                                className="dash-stepper-btn"
                                                disabled={ticketQuantity <= 1}
                                                onClick={() => setTicketQuantity(prev => Math.max(1, prev - 1))}
                                            >
                                                −
                                            </button>
                                            <div className="dash-stepper-num">
                                                <span>{ticketQuantity}</span>
                                                <small>{ticketQuantity === 1 ? 'Pass' : 'Passes'}</small>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="dash-stepper-btn"
                                                disabled={ticketQuantity >= Math.min(10, bookingEvent.available_tickets)}
                                                onClick={() => setTicketQuantity(prev => Math.min(Math.min(10, bookingEvent.available_tickets), prev + 1))}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. Payment Method Gateway Selection */}
                                    <div className="form-group">
                                        <label>3. Payment Gateway Method</label>
                                        <div className="dash-pm-grid">
                                            {[
                                                { id: 'Telebirr', icon: '📱', name: 'Telebirr USSD' },
                                                { id: 'Chapa', icon: '⚡', name: 'Chapa Checkout' },
                                                { id: 'Credit Card', icon: '💳', name: 'Card Pay' },
                                                { id: 'Bank Transfer', icon: '🏛️', name: 'Bank Transfer' }
                                            ].map(pm => (
                                                <div 
                                                    key={pm.id} 
                                                    className={`dash-pm-card ${paymentMethod === pm.id ? 'selected' : ''}`}
                                                    onClick={() => setPaymentMethod(pm.id)}
                                                >
                                                    <span className="dash-pm-icon">{pm.icon}</span>
                                                    <span>{pm.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dynamic Payment Gateway Inputs & Info */}
                                    {paymentMethod === 'Telebirr' && (
                                         <div className="gateway-render-box telebirr-box animate-fade-in">
                                             <div className="gateway-header">
                                                 <span className="gateway-logo">📱</span>
                                                 <div>
                                                     <strong>Telebirr Mobile Payment</strong>
                                                     <p>Direct USSD Push Prompt (*127#) & SuperApp Pay</p>
                                                 </div>
                                             </div>
                                             <div className="form-group" style={{ marginTop: '12px' }}>
                                                 <label>Telebirr Phone Number</label>
                                                 <input 
                                                     type="tel" 
                                                     className="modern-select" 
                                                     placeholder="+251 9... or +251 7..." 
                                                     value={telebirrPhone} 
                                                     onChange={e => setTelebirrPhone(e.target.value)} 
                                                     required 
                                                 />
                                             </div>
                                             <div className="gateway-info-pill">
                                                 <span> Till Code: <strong>889021 (EventHub PLC)</strong></span>
                                                 <small>A 1-click Telebirr PIN payment prompt will be sent to your phone.</small>
                                             </div>
                                         </div>
                                     )}

                                     {paymentMethod === 'Chapa' && (
                                         <div className="gateway-render-box chapa-box animate-fade-in">
                                             <div className="gateway-header">
                                                 <span className="gateway-logo">⚡</span>
                                                 <div>
                                                     <strong>Chapa Payment Gateway</strong>
                                                     <p>Supports Telebirr, CBE Birr, Awash & Debit Cards</p>
                                                 </div>
                                             </div>
                                             <div className="form-group" style={{ marginTop: '12px' }}>
                                                 <label>Chapa Account / Phone Number</label>
                                                 <input 
                                                     type="tel" 
                                                     className="modern-select" 
                                                     placeholder="+251 9... or Email" 
                                                     value={chapaPhone} 
                                                     onChange={e => setChapaPhone(e.target.value)} 
                                                     required 
                                                 />
                                             </div>
                                             <div className="gateway-info-pill">
                                                 <span>🔒 256-Bit Encrypted Instant Checkout</span>
                                                 <small>Instant ticket confirmation via Chapa digital payment system.</small>
                                             </div>
                                         </div>
                                     )}

                                     {paymentMethod === 'Credit Card' && (
                                         <div className="gateway-render-box card-box animate-fade-in">
                                             <div className="gateway-header">
                                                 <span className="gateway-logo">💳</span>
                                                 <div>
                                                     <strong>Credit or Debit Card</strong>
                                                     <p>Visa, Mastercard, American Express</p>
                                                 </div>
                                             </div>
                                             <div className="form-group" style={{ marginTop: '12px' }}>
                                                 <label>Cardholder Name</label>
                                                 <input 
                                                     type="text" 
                                                     className="modern-select" 
                                                     placeholder="Name on card" 
                                                     value={cardName} 
                                                     onChange={e => setCardName(e.target.value)} 
                                                     required 
                                                 />
                                             </div>
                                             <div className="form-group">
                                                 <label>Card Number</label>
                                                 <input 
                                                     type="text" 
                                                     className="modern-select" 
                                                     placeholder="4532 •••• •••• 8921" 
                                                     maxLength="19"
                                                     value={cardNumber} 
                                                     onChange={e => setCardNumber(e.target.value)} 
                                                     required 
                                                 />
                                             </div>
                                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                 <div className="form-group">
                                                     <label>Expiry (MM/YY)</label>
                                                     <input 
                                                         type="text" 
                                                         className="modern-select" 
                                                         placeholder="12/28" 
                                                         maxLength="5"
                                                         value={cardExp} 
                                                         onChange={e => setCardExp(e.target.value)} 
                                                         required 
                                                     />
                                                 </div>
                                                 <div className="form-group">
                                                     <label>CVV</label>
                                                     <input 
                                                         type="password" 
                                                         className="modern-select" 
                                                         placeholder="•••" 
                                                         maxLength="4"
                                                         value={cardCvv} 
                                                         onChange={e => setCardCvv(e.target.value)} 
                                                         required 
                                                     />
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {paymentMethod === 'Bank Transfer' && (
                                         <div className="gateway-render-box bank-box animate-fade-in">
                                             <div className="gateway-header">
                                                 <span className="gateway-logo">🏛️</span>
                                                 <div>
                                                     <strong>Direct Bank Deposit / Wire</strong>
                                                     <p>Commercial Bank of Ethiopia & Bank of Abyssinia</p>
                                                 </div>
                                             </div>
                                             <div className="bank-accounts-list-dash">
                                                 <div className="bank-item-dash">
                                                     <div>
                                                         <small>CBE ACCOUNT</small>
                                                         <strong>1000 4455 6677 88</strong>
                                                     </div>
                                                     <button 
                                                         type="button" 
                                                         className="btn-dash-copy"
                                                         onClick={() => {
                                                             navigator.clipboard.writeText('10004455667788');
                                                             setCopiedAccount('cbe');
                                                             setTimeout(() => setCopiedAccount(''), 2000);
                                                         }}
                                                     >
                                                         {copiedAccount === 'cbe' ? '✓ Copied' : '📋 Copy'}
                                                     </button>
                                                 </div>

                                                 <div className="bank-item-dash">
                                                     <div>
                                                         <small>BANK OF ABYSSINIA</small>
                                                         <strong>9922 8811 0033</strong>
                                                     </div>
                                                     <button 
                                                         type="button" 
                                                         className="btn-dash-copy"
                                                         onClick={() => {
                                                             navigator.clipboard.writeText('992288110033');
                                                             setCopiedAccount('boa');
                                                             setTimeout(() => setCopiedAccount(''), 2000);
                                                         }}
                                                     >
                                                         {copiedAccount === 'boa' ? '✓ Copied' : '📋 Copy'}
                                                     </button>
                                                 </div>
                                             </div>
                                             <div className="form-group" style={{ marginTop: '12px' }}>
                                                 <label>Transaction Ref / Slip No.</label>
                                                 <input 
                                                     type="text" 
                                                     className="modern-select" 
                                                     placeholder="e.g. FT26245XXXXX or Slip #1092" 
                                                     value={bankRef} 
                                                     onChange={e => setBankRef(e.target.value)} 
                                                     required 
                                                 />
                                             </div>
                                         </div>
                                     )}

                                    <div className="booking-summary-box">
                                        <div className="summary-line">
                                            <span>Unit Price ({ticketTier}):</span>
                                            <span>${(calculateTotalPrice() / ticketQuantity).toFixed(2)}</span>
                                        </div>
                                        <div className="summary-line">
                                            <span>Quantity:</span>
                                            <span>× {ticketQuantity}</span>
                                        </div>
                                        <div className="summary-line total">
                                            <span>Total Amount Due:</span>
                                            <span className="total-price">${calculateTotalPrice()}</span>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-confirm-checkout" disabled={isBooking}>
                                        {isBooking ? '🔄 Processing Booking...' : `💳 Confirm & Pay $${calculateTotalPrice()}`}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="booking-success-view">
                                <div className="success-icon">🎉</div>
                                <h2>Booking Confirmed!</h2>
                                <p>Your ticket pass has been generated and added to your account.</p>

                                <div className="success-receipt-box">
                                    <p><strong>Ticket Reference:</strong> <code>{bookingSuccess.ticketCode}</code></p>
                                    <p><strong>Event:</strong> {bookingSuccess.eventTitle}</p>
                                    <p><strong>Tier & Qty:</strong> {bookingSuccess.ticketType} × {bookingSuccess.quantity}</p>
                                    <p><strong>Total Paid:</strong> ${bookingSuccess.totalAmount}</p>
                                </div>

                                <div className="success-actions">
                                    <button 
                                        className="primary-btn" 
                                        onClick={() => {
                                            setBookingEvent(null);
                                            setActiveTab('tickets');
                                        }}
                                    >
                                        🎟️ View My Tickets
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- DIGITAL QR TICKET PASS MODAL --- */}
            {selectedTicket && (
                <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="modal-card ticket-pass-modal animate-pop-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>

                        <div className="digital-ticket-stub printable-area">
                            <div className="stub-top-banner">
                                <div className="pass-logo">Event<span>Hub</span> PASS</div>
                                <div className="pass-status">OFFICIAL DIGITAL TICKET</div>
                            </div>

                            <div className="stub-main-content">
                                <div className="qr-graphic-section">
                                    <div className="qr-code-box">
                                        <svg width="140" height="140" viewBox="0 0 100 100">
                                            <rect width="100" height="100" fill="#ffffff" />
                                            <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                                            <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                                            <rect x="13" y="13" width="9" height="9" fill="#0f172a" />

                                            <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                                            <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                                            <rect x="78" y="13" width="9" height="9" fill="#0f172a" />

                                            <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                                            <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                                            <rect x="13" y="78" width="9" height="9" fill="#0f172a" />

                                            <rect x="35" y="10" width="8" height="8" fill="#0f172a" />
                                            <rect x="48" y="10" width="8" height="8" fill="#0f172a" />
                                            <rect x="10" y="38" width="8" height="8" fill="#0f172a" />
                                            <rect x="22" y="48" width="8" height="8" fill="#0f172a" />
                                            <rect x="38" y="38" width="14" height="14" fill="#0f172a" />
                                            <rect x="60" y="38" width="8" height="8" fill="#0f172a" />
                                            <rect x="75" y="48" width="12" height="12" fill="#0f172a" />
                                            <rect x="38" y="65" width="10" height="10" fill="#0f172a" />
                                            <rect x="55" y="75" width="12" height="12" fill="#0f172a" />
                                            <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                                        </svg>
                                    </div>
                                    <code className="qr-code-text">{selectedTicket.ticket_code || `TK-00${selectedTicket.booking_id}`}</code>
                                </div>

                                <div className="pass-info-section">
                                    <h2 className="pass-event-title">{selectedTicket.event_title}</h2>
                                    
                                    <div className="info-grid">
                                        <div>
                                            <label>ATTENDEE NAME</label>
                                            <p>{authName}</p>
                                        </div>
                                        <div>
                                            <label>TICKET TIER</label>
                                            <p><span className="tier-badge-highlight">{selectedTicket.ticket_type || 'Regular'}</span></p>
                                        </div>
                                        <div>
                                            <label>LOCATION & VENUE</label>
                                            <p>📍 {selectedTicket.location}</p>
                                        </div>
                                        <div>
                                            <label>DATE & TIME</label>
                                            <p>📅 {new Date(selectedTicket.event_date).toLocaleDateString()} at {new Date(selectedTicket.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>

                                    <div className="watermark-notice">
                                        🔒 Verified EventHub Entry Pass • Show at venue gate for fast scanning
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pass-modal-footer">
                            <button className="btn-print" onClick={handlePrintTicket}>
                                🖨️ Print / Download Ticket Pass
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- REFUND REQUEST MODAL --- */}
            {refundBooking && (
                <div className="modal-overlay" onClick={() => setRefundBooking(null)}>
                    <div className="modal-card refund-modal animate-pop-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setRefundBooking(null)}>✕</button>

                        <div className="modal-header">
                            <h2>Request Ticket Refund</h2>
                            <p>Booking Reference: <code>#BK-{refundBooking.booking_id}</code> ({refundBooking.event_title})</p>
                        </div>

                        <form onSubmit={handleSubmitRefund} className="refund-form">
                            <div className="form-group">
                                <label>Refund Reason / Notes</label>
                                <textarea 
                                    rows="4" 
                                    placeholder="Please explain why you are requesting a refund for this event..."
                                    value={refundReason}
                                    onChange={e => setRefundReason(e.target.value)}
                                    required
                                ></textarea>
                            </div>

                            <div className="refund-amount-info">
                                <span>Refund Amount Request:</span>
                                <strong>${refundBooking.total_amount}</strong>
                            </div>

                            <button type="submit" className="btn-submit-refund" disabled={isSubmittingRefund}>
                                {isSubmittingRefund ? '🔄 Submitting Dispute...' : '📩 Submit Refund Request'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}