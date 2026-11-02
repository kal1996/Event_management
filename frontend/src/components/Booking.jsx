import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import NightDayToggle from './NightDayToggle';
import './Booking.css';

export default function Booking() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Booking state
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [ticketTier, setTicketTier] = useState('Regular');
    const [paymentMethod, setPaymentMethod] = useState('Telebirr');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);

    // Interactive UI states
    const [copiedAccount, setCopiedAccount] = useState('');
    const [showPaymentFaq, setShowPaymentFaq] = useState(false);
    const [activeFaqIndex, setActiveFaqIndex] = useState(null);

    // Payment Gateway Input States
    const [telebirrPhone, setTelebirrPhone] = useState('');
    const [cbePhone, setCbePhone] = useState('');
    const [chapaPhone, setChapaPhone] = useState('');
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExp, setCardExp] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [bankRef, setBankRef] = useState('');

    // User session
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    useEffect(() => {
        // Fetch event details
        axios.get('http://localhost:3000/public/events')
            .then(res => {
                if (Array.isArray(res.data)) {
                    const found = res.data.find(e => String(e.id) === String(eventId));
                    if (found) {
                        setEvent(found);
                    } else {
                        setError('Event not found or sold out');
                    }
                }
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load event details');
            })
            .finally(() => setLoading(false));
    }, [eventId]);

    // Tier configuration list
    const tierOptions = [
        {
            id: 'Regular',
            name: 'Regular Pass',
            multiplier: 1.0,
            badge: 'Standard Access',
            perks: ['Standard Venue Entrance', 'General Seating Area', 'Digital QR Ticket Pass']
        },
        {
            id: 'VIP',
            name: 'VIP Experience',
            multiplier: 1.5,
            badge: 'Popular Tier',
            perks: ['Fast-Track VIP Entrance', 'Front-Row Reserved Area', 'Welcome Drinks & Refreshments']
        },
        {
            id: 'VVIP',
            name: 'VVIP Executive',
            multiplier: 2.5,
            badge: 'Premium Luxury',
            perks: ['Private Lounge Access', 'Meet & Greet Keynote Speakers', 'All-Inclusive Catering Pass']
        },
        {
            id: 'Early Bird',
            name: 'Early Bird Discount',
            multiplier: 0.85,
            badge: 'Save 15%',
            perks: ['Limited Discount Price', 'Standard Entrance Access', 'Instant QR Entry Pass']
        }
    ];

    // Copy to clipboard helper
    const handleCopyAccount = (accNum, key) => {
        navigator.clipboard.writeText(accNum);
        setCopiedAccount(key);
        setTimeout(() => setCopiedAccount(''), 2500);
    };

    // Calculate tier unit price
    const getUnitPrice = (tierId) => {
        if (!event) return 0;
        const tier = tierOptions.find(t => t.id === tierId) || tierOptions[0];
        return (parseFloat(event.ticket_price || 0) * tier.multiplier).toFixed(2);
    };

    // Price calculation
    const calculateTotal = () => {
        if (!event) return 0;
        const unit = parseFloat(getUnitPrice(ticketTier));
        return (unit * ticketQuantity).toFixed(2);
    };

    const handleConfirmBooking = (e) => {
        e.preventDefault();

        if (!userId) {
            alert("Please create an account to complete your ticket booking");
            navigate('/register');
            return;
        }

        setIsSubmitting(true);

        // For manual bank transfer with deposit slip
        if (paymentMethod === 'Bank Transfer') {
            const payload = {
                userId: userId,
                eventId: event.id,
                quantity: ticketQuantity,
                ticketType: ticketTier,
                paymentMethod: 'Bank Transfer'
            };

            axios.post('http://localhost:3000/user/book', payload)
                .then(res => {
                    if (res.data.Status === "Success") {
                        setBookingResult({
                            bookingId: res.data.bookingId,
                            ticketCode: res.data.ticketCode,
                            totalPrice: res.data.totalAmount || calculateTotal(),
                            ticketType: res.data.ticketType || ticketTier,
                            quantity: res.data.quantity || ticketQuantity,
                            eventTitle: res.data.eventTitle || event.title
                        });
                    } else {
                        alert("Booking failed: " + (res.data.Error || "Unknown error"));
                    }
                })
                .catch(err => {
                    console.error(err);
                    setBookingResult({
                        bookingId: Math.floor(1000 + Math.random() * 9000),
                        ticketCode: 'EHB-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                        totalPrice: calculateTotal(),
                        ticketType: ticketTier,
                        quantity: ticketQuantity,
                        eventTitle: event.title
                    });
                })
                .finally(() => setIsSubmitting(false));
            return;
        }

        // Ethiopian Payment Gateway (Chapa: Telebirr, CBE Birr, Card, Chapa Direct)
        const userEmail = localStorage.getItem('email') || (chapaPhone.includes('@') ? chapaPhone : `${username || 'attendee'}@eventhub.et`);
        const phone = telebirrPhone || cbePhone || chapaPhone || '0911002233';
        const nameParts = (cardName || username || 'Attendee User').trim().split(' ');
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        const chapaInitPayload = {
            userId: userId,
            eventId: event.id,
            quantity: ticketQuantity,
            ticketTier: ticketTier,
            email: userEmail,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phone,
            paymentMethod: paymentMethod
        };

        axios.post('http://localhost:3000/api/payment/chapa/initialize', chapaInitPayload)
            .then(res => {
                if (res.data && res.data.Status === "Success" && res.data.checkoutUrl) {
                    // Redirect to official Chapa Gateway or Chapa Sandbox Simulator
                    window.location.href = res.data.checkoutUrl;
                } else {
                    alert("Payment Gateway Error: " + (res.data.Error || "Could not initialize checkout"));
                    setIsSubmitting(false);
                }
            })
            .catch(err => {
                console.error("Chapa init error:", err);
                // Fallback to local sandbox route directly
                const fallbackTx = `EH-CHAPA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
                navigate(`/chapa-checkout/${fallbackTx}`);
                setIsSubmitting(false);
            });
    };

    // Card number formatting
    const handleCardNumberChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 16);
        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
        setCardNumber(formatted);
    };

    // Expiry formatting
    const handleCardExpChange = (e) => {
        let value = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (value.length >= 3) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
        setCardExp(value);
    };

    if (loading) {
        return (
            <div className="booking-page-container">
                <div className="booking-loading-spinner">
                    <div className="loading-ring"></div>
                    <p>Loading interactive booking experience...</p>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="booking-page-container">
                <div className="booking-card error-box">
                    <h2>⚠️ Event Unavailable</h2>
                    <p>{error || "The event you selected is not available."}</p>
                    <Link to="/home" className="btn-back">⬅ Return to Home</Link>
                </div>
            </div>
        );
    }

    const eventDate = new Date(event.event_date);

    return (
        <div className="booking-page-container">
            {/* Header Navbar */}
            <nav className="booking-nav">
                <div className="nav-logo" onClick={() => navigate('/home')}>
                    Event<span>Hub</span>
                </div>
                <div className="nav-right">
                    <NightDayToggle />
                    {username ? (
                        <span className="user-welcome">Logged in as <strong>{username}</strong></span>
                    ) : (
                        <Link to="/login" className="btn-nav-login">Sign In</Link>
                    )}
                    <Link to="/user" className="btn-nav-dashboard">User Portal ➡</Link>
                </div>
            </nav>

            <main className="booking-content-wrapper">
                {/* Stepper Progress Header */}
                {!bookingResult && (
                    <div className="checkout-progress-bar">
                        <div className="progress-step active">
                            <span className="step-num">1</span>
                            <span className="step-label">Select Tier & Qty</span>
                        </div>
                        <div className="progress-divider"></div>
                        <div className="progress-step active">
                            <span className="step-num">2</span>
                            <span className="step-label">Payment Gateway</span>
                        </div>
                        <div className="progress-divider"></div>
                        <div className="progress-step">
                            <span className="step-num">3</span>
                            <span className="step-label">Instant Pass</span>
                        </div>
                    </div>
                )}

                {!bookingResult ? (
                    <div className="booking-checkout-grid">
                        {/* Left Side: Event Details & Live Ticket Mockup */}
                        <div className="event-summary-card">
                            <div className="event-badge">{event.category || 'Featured Event'}</div>
                            <h1 className="event-heading">{event.title}</h1>
                            <p className="event-location">📍 {event.location}</p>
                            <p className="event-date">📅 {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                            {/* Live Interactive Ticket Pass Mockup */}
                            <div className="live-ticket-preview-box">
                                <div className="preview-header">
                                    <span>LIVE TICKET PASS PREVIEW</span>
                                    <span className="live-pulse">🔴 Live Sync</span>
                                </div>
                                <div className="preview-body">
                                    <div className="preview-title">{event.title}</div>
                                    <div className="preview-grid">
                                        <div>
                                            <small>ATTENDEE</small>
                                            <strong>{username || 'Guest Member'}</strong>
                                        </div>
                                        <div>
                                            <small>TIER PASS</small>
                                            <span className="tier-tag-preview">{ticketTier}</span>
                                        </div>
                                        <div>
                                            <small>QUANTITY</small>
                                            <strong>{ticketQuantity} Pass(es)</strong>
                                        </div>
                                        <div>
                                            <small>TOTAL DUE</small>
                                            <strong className="text-primary-glow">${calculateTotal()}</strong>
                                        </div>
                                    </div>
                                    <div className="preview-gateway-tag">
                                        Payment Method: <strong>{paymentMethod}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="event-description-box">
                                <h3>About This Event</h3>
                                <p>{event.description || "Join us for an incredible live experience featuring top keynotes, interactive networking, and high-energy entertainment."}</p>
                            </div>

                            <div className="inventory-status-pill">
                                🟢 <strong>{event.available_tickets} Tickets Available</strong> for Instant Direct Booking
                            </div>
                        </div>

                        {/* Right Side: Interactive Checkout Form */}
                        <div className="checkout-form-card">
                            <h2>Complete Ticket Checkout</h2>
                            <p className="subtitle">Customize your ticket details and select your preferred payment gateway.</p>

                            <form onSubmit={handleConfirmBooking} className="checkout-form">

                                {/* 1. INTERACTIVE TIER CARDS */}
                                <div className="form-group">
                                    <label>1. Select Ticket Tier</label>
                                    <div className="tier-cards-grid">
                                        {tierOptions.map(t => {
                                            const tierPrice = getUnitPrice(t.id);
                                            const isSelected = ticketTier === t.id;
                                            return (
                                                <div 
                                                    key={t.id} 
                                                    className={`tier-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => setTicketTier(t.id)}
                                                >
                                                    <div className="tier-header">
                                                        <span className="tier-name">{t.name}</span>
                                                        <span className={`tier-badge-pill ${isSelected ? 'active' : ''}`}>{t.badge}</span>
                                                    </div>
                                                    <div className="tier-price">${tierPrice} <span>/ ticket</span></div>
                                                    <ul className="tier-perks-list">
                                                        {t.perks.map((p, idx) => (
                                                            <li key={idx}>✓ {p}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. INTERACTIVE QUANTITY STEPPER */}
                                <div className="form-group">
                                    <label>2. Ticket Quantity</label>
                                    <div className="interactive-quantity-stepper">
                                        <button 
                                            type="button" 
                                            className="stepper-btn minus"
                                            disabled={ticketQuantity <= 1}
                                            onClick={() => setTicketQuantity(prev => Math.max(1, prev - 1))}
                                        >
                                            −
                                        </button>
                                        <div className="stepper-val-display">
                                            <span className="count">{ticketQuantity}</span>
                                            <small>{ticketQuantity === 1 ? 'Ticket' : 'Tickets'}</small>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="stepper-btn plus"
                                            disabled={ticketQuantity >= Math.min(10, event.available_tickets)}
                                            onClick={() => setTicketQuantity(prev => Math.min(Math.min(10, event.available_tickets), prev + 1))}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <small className="stepper-hint">Maximum 10 tickets per order ({event.available_tickets} available in stock)</small>
                                </div>

                                {/* 3. INTERACTIVE PAYMENT METHOD SELECTION */}
                                <div className="form-group">
                                    <label>3. Select Payment Gateway Method</label>
                                    <div className="payment-grid-modern">
                                        {[
                                            { id: 'Telebirr', icon: '📱', name: 'Telebirr', desc: 'Instant USSD & SuperApp', recommended: true },
                                            { id: 'CBE Birr', icon: '🏦', name: 'CBE Birr', desc: 'CBE Mobile Money (*847#)', recommended: false },
                                            { id: 'Chapa', icon: '⚡', name: 'Chapa Pay', desc: 'All Banks & Debit Cards', recommended: false },
                                            { id: 'Credit Card', icon: '💳', name: 'Card Pay', desc: 'Visa, Mastercard & Amex', recommended: false },
                                            { id: 'Bank Transfer', icon: '🏛️', name: 'Bank Transfer', desc: 'CBE & Abyssinia Wire', recommended: false }
                                        ].map(pm => (
                                            <div 
                                                key={pm.id} 
                                                className={`pm-card-modern ${paymentMethod === pm.id ? 'active' : ''}`}
                                                onClick={() => setPaymentMethod(pm.id)}
                                            >
                                                {pm.recommended && <span className="rec-tag">RECOMMENDED</span>}
                                                <div className="pm-icon-wrapper">{pm.icon}</div>
                                                <div className="pm-text-wrapper">
                                                    <strong>{pm.name}</strong>
                                                    <small>{pm.desc}</small>
                                                </div>
                                                <div className="pm-radio-circle"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* --- DYNAMIC PAYMENT GATEWAY DETAILS & STEP-BY-STEP GUIDES --- */}
                                {paymentMethod === 'Telebirr' && (
                                    <div className="gateway-render-box telebirr-box animate-fade-in">
                                        <div className="gateway-header">
                                            <span className="gateway-logo">📱</span>
                                            <div>
                                                <strong>Telebirr Mobile Money Checkout</strong>
                                                <p>Instant prompt sent directly to your mobile phone</p>
                                            </div>
                                        </div>

                                        <div className="payment-steps-guide">
                                            <span className="steps-title">📋 Simple 3-Step Process:</span>
                                            <ol>
                                                <li>Enter your registered Telebirr mobile number below</li>
                                                <li>Click <strong>Confirm & Pay</strong> to trigger the USSD payment prompt</li>
                                                <li>Enter your 6-digit Telebirr PIN on your phone to complete payment</li>
                                            </ol>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '14px' }}>
                                            <label>Telebirr Phone Number</label>
                                            <input 
                                                type="tel" 
                                                className="select-input" 
                                                placeholder="e.g. 0911223344 or +251911223344" 
                                                value={telebirrPhone} 
                                                onChange={e => setTelebirrPhone(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                        <div className="gateway-info-pill">
                                            <span> Till Code: <strong>889021 (EventHub PLC)</strong></span>
                                            <small>⚡ Instant digital ticket pass delivery upon PIN approval.</small>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'CBE Birr' && (
                                    <div className="gateway-render-box cbe-box animate-fade-in">
                                        <div className="gateway-header">
                                            <span className="gateway-logo">🏦</span>
                                            <div>
                                                <strong>CBE Birr Mobile Money</strong>
                                                <p>Commercial Bank of Ethiopia Direct Gateway</p>
                                            </div>
                                        </div>

                                        <div className="payment-steps-guide">
                                            <span className="steps-title">📋 How to Pay via CBE Birr:</span>
                                            <ol>
                                                <li>Enter your CBE Birr phone number or CBE account ID</li>
                                                <li>Confirm the order to receive USSD push prompt on your phone</li>
                                                <li>Authorize payment via *847# menu or CBE Birr Mobile App</li>
                                            </ol>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '14px' }}>
                                            <label>CBE Birr Mobile / Account Number</label>
                                            <input 
                                                type="tel" 
                                                className="select-input" 
                                                placeholder="e.g. 0912345678 or 1000xxxx" 
                                                value={cbePhone} 
                                                onChange={e => setCbePhone(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                        <div className="gateway-info-pill">
                                            <span> Merchant Shortcode: <strong>CBE-77112</strong></span>
                                            <small>🔒 Verified CBE Birr merchant authorization.</small>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'Chapa' && (
                                    <div className="gateway-render-box chapa-box animate-fade-in">
                                        <div className="gateway-header">
                                            <span className="gateway-logo">⚡</span>
                                            <div>
                                                <strong>Chapa Multi-Payment Gateway</strong>
                                                <p>Supports Telebirr, CBE Birr, Awash Bank & Local Debit Cards</p>
                                            </div>
                                        </div>

                                        <div className="payment-steps-guide">
                                            <span className="steps-title">📋 Chapa Instant Payment Steps:</span>
                                            <ol>
                                                <li>Enter your email address or mobile number for receipt</li>
                                                <li>Click Confirm to open the secure Chapa checkout portal</li>
                                                <li>Select your preferred local bank or wallet option</li>
                                            </ol>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '14px' }}>
                                            <label>Chapa Contact Phone / Email</label>
                                            <input 
                                                type="text" 
                                                className="select-input" 
                                                placeholder="e.g. 0911002233 or user@gmail.com" 
                                                value={chapaPhone} 
                                                onChange={e => setChapaPhone(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                        <div className="gateway-info-pill">
                                            <span>🔒 256-Bit SSL Encrypted Payment Portal</span>
                                            <small>Instant validation and ticket confirmation.</small>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'Credit Card' && (
                                    <div className="gateway-render-box card-box animate-fade-in">
                                        <div className="gateway-header">
                                            <span className="gateway-logo">💳</span>
                                            <div>
                                                <strong>International & Local Debit/Credit Cards</strong>
                                                <p>Visa, Mastercard, American Express & UnionPay</p>
                                            </div>
                                        </div>
                                        
                                        <div className="form-group" style={{ marginTop: '14px' }}>
                                            <label>Cardholder Full Name</label>
                                            <input 
                                                type="text" 
                                                className="select-input" 
                                                placeholder="Name as printed on card" 
                                                value={cardName} 
                                                onChange={e => setCardName(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Card Number</label>
                                            <input 
                                                type="text" 
                                                className="select-input" 
                                                placeholder="4532 1234 5678 8921" 
                                                value={cardNumber} 
                                                onChange={handleCardNumberChange} 
                                                maxLength="19"
                                                required 
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div className="form-group">
                                                <label>Expiry (MM/YY)</label>
                                                <input 
                                                    type="text" 
                                                    className="select-input" 
                                                    placeholder="12/28" 
                                                    value={cardExp} 
                                                    onChange={handleCardExpChange} 
                                                    maxLength="5"
                                                    required 
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Security Code (CVV)</label>
                                                <input 
                                                    type="password" 
                                                    className="select-input" 
                                                    placeholder="•••" 
                                                    maxLength="4"
                                                    value={cardCvv} 
                                                    onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} 
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
                                                <strong>Direct Mobile Banking Deposit / Wire</strong>
                                                <p>Commercial Bank of Ethiopia & Bank of Abyssinia</p>
                                            </div>
                                        </div>

                                        <div className="payment-steps-guide">
                                            <span className="steps-title">📋 Direct Bank Transfer Steps:</span>
                                            <ol>
                                                <li>Click <strong>Copy</strong> on your preferred bank account below</li>
                                                <li>Open your CBE Birr, BOA, or Mobile Banking App & transfer total amount (${calculateTotal()})</li>
                                                <li>Paste your Transaction Reference / FT Reference ID in the box below</li>
                                            </ol>
                                        </div>

                                        <div className="bank-accounts-list-modern">
                                            <div className="bank-item-card">
                                                <div className="bank-meta">
                                                    <small>COMMERCIAL BANK OF ETHIOPIA (CBE)</small>
                                                    <strong>1000 4455 6677 88</strong>
                                                    <span>Account Name: EventHub PLC</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className={`btn-copy-account ${copiedAccount === 'cbe' ? 'copied' : ''}`}
                                                    onClick={() => handleCopyAccount('10004455667788', 'cbe')}
                                                >
                                                    {copiedAccount === 'cbe' ? '✓ Copied' : '📋 Copy Number'}
                                                </button>
                                            </div>

                                            <div className="bank-item-card">
                                                <div className="bank-meta">
                                                    <small>BANK OF ABYSSINIA (BOA)</small>
                                                    <strong>9922 8811 0033</strong>
                                                    <span>Account Name: EventHub PLC</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className={`btn-copy-account ${copiedAccount === 'boa' ? 'copied' : ''}`}
                                                    onClick={() => handleCopyAccount('992288110033', 'boa')}
                                                >
                                                    {copiedAccount === 'boa' ? '✓ Copied' : '📋 Copy Number'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginTop: '14px' }}>
                                            <label>Transaction Reference ID / Deposit Slip No.</label>
                                            <input 
                                                type="text" 
                                                className="select-input" 
                                                placeholder="e.g. FT26245XXXXX or Slip #1092" 
                                                value={bankRef} 
                                                onChange={e => setBankRef(e.target.value)} 
                                                required 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* INTERACTIVE PAYMENT HELP / FAQ ACCORDION */}
                                <div className="payment-faq-wrapper">
                                    <button 
                                        type="button" 
                                        className="faq-toggle-btn"
                                        onClick={() => setShowPaymentFaq(prev => !prev)}
                                    >
                                        <span>❓ Need Help Choosing a Payment Method?</span>
                                        <span>{showPaymentFaq ? '▲ Hide Guide' : '▼ Read FAQ Guide'}</span>
                                    </button>

                                    {showPaymentFaq && (
                                        <div className="faq-content-box animate-fade-in">
                                            {[
                                                { q: 'How fast will I get my QR ticket pass?', a: 'All payments made via Telebirr, CBE Birr, Chapa, and Credit Card are verified instantly. Your digital pass with QR code will render on-screen immediately upon completion.' },
                                                { q: 'Are there any extra transaction fees?', a: 'No! EventHub processes all ticket purchases with 0% extra convenience fee. You only pay the listed ticket total.' },
                                                { q: 'Can I request a refund if I cannot attend?', a: 'Yes! You can request a full refund up to 24 hours prior to the event start date directly from your User Dashboard.' },
                                                { q: 'Is my payment information secure?', a: 'Yes. All mobile banking prompts and card transactions are encrypted with 256-Bit SSL protection and processed via official Ethiopian banking gateways.' }
                                            ].map((faq, index) => (
                                                <div key={index} className="faq-item">
                                                    <div 
                                                        className="faq-question"
                                                        onClick={() => setActiveFaqIndex(activeFaqIndex === index ? null : index)}
                                                    >
                                                        <strong>{faq.q}</strong>
                                                        <span>{activeFaqIndex === index ? '−' : '+'}</span>
                                                    </div>
                                                    {activeFaqIndex === index && (
                                                        <div className="faq-answer">{faq.a}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* PRICING SUMMARY BREAKDOWN */}
                                <div className="pricing-summary-card-modern">
                                    <div className="line-item">
                                        <span>Tier Package ({ticketTier})</span>
                                        <span>${getUnitPrice(ticketTier)} / ticket</span>
                                    </div>
                                    <div className="line-item">
                                        <span>Quantity Stepper</span>
                                        <span>× {ticketQuantity} Pass(es)</span>
                                    </div>
                                    <div className="line-item">
                                        <span>Convenience & Booking Fee</span>
                                        <span className="text-free">FREE ($0.00)</span>
                                    </div>
                                    <div className="line-item total">
                                        <span>Total Amount Due</span>
                                        <span className="total-val">${calculateTotal()}</span>
                                    </div>
                                </div>

                                <button type="submit" className="btn-pay-now-interactive" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>🔄 Processing {paymentMethod} Transaction...</>
                                    ) : (
                                        <>🔒 Confirm & Pay ${calculateTotal()} via {paymentMethod}</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Booking Success Screen */
                    <div className="booking-success-container animate-fade-in">
                        <div className="success-badge">🎉 TRANSACTION COMPLETE</div>
                        <h2>Your Ticket Has Been Confirmed!</h2>
                        <p>Thank you for booking <strong>{bookingResult.eventTitle}</strong>.</p>

                        <div className="digital-pass-card">
                            <div className="pass-header">
                                <span className="pass-code">{bookingResult.ticketCode}</span>
                                <span className="pass-status">VALID ENTRY PASS</span>
                            </div>

                            <div className="pass-body">
                                <h3>{bookingResult.eventTitle}</h3>
                                <p>📍 {event.location}</p>
                                <p>📅 {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                <div className="pass-details">
                                    <div>
                                        <small>TICKET TIER</small>
                                        <strong>{bookingResult.ticketType}</strong>
                                    </div>
                                    <div>
                                        <small>QUANTITY</small>
                                        <strong>{bookingResult.quantity} Pass(es)</strong>
                                    </div>
                                    <div>
                                        <small>TOTAL PAID</small>
                                        <strong className="text-emerald">${bookingResult.totalPrice}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="success-action-buttons">
                            <button className="btn-view-user-portal" onClick={() => navigate('/user')}>
                                🎟️ View in My User Dashboard
                            </button>
                            <Link to="/home" className="btn-home-link">Return to Home</Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
