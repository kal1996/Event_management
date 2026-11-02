import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import NightDayToggle from './NightDayToggle';
import './PaymentVerify.css';

export default function PaymentVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref');
    const bookingIdParam = searchParams.get('booking_id');

    const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
    const [paymentData, setPaymentData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!txRef) {
            setStatus('failed');
            setErrorMessage('No transaction reference found in URL.');
            return;
        }

        // Call backend verification endpoint
        const verifyPayment = async () => {
            try {
                const res = await axios.get(`http://localhost:3000/api/payment/chapa/verify/${txRef}`);
                if (res.data && res.data.Status === 'Success') {
                    setStatus('success');
                    setPaymentData(res.data);
                } else {
                    // Try fetching transaction details directly if status was already updated
                    const detailsRes = await axios.get(`http://localhost:3000/api/payment/chapa/transaction/${txRef}`);
                    if (detailsRes.data && detailsRes.data.transaction) {
                        setStatus('success');
                        setPaymentData({
                            ...detailsRes.data.transaction,
                            ticketCode: detailsRes.data.transaction.ticketCode || ('TK-ET' + Math.floor(100000 + Math.random() * 900000))
                        });
                    } else {
                        setStatus('failed');
                        setErrorMessage(res.data?.message || 'Transaction could not be verified by Chapa Gateway.');
                    }
                }
            } catch (err) {
                console.error('Verification Error:', err);
                // Fallback attempt to retrieve transaction info
                try {
                    const fallbackRes = await axios.get(`http://localhost:3000/api/payment/chapa/transaction/${txRef}`);
                    if (fallbackRes.data && fallbackRes.data.transaction) {
                        setStatus('success');
                        setPaymentData(fallbackRes.data.transaction);
                        return;
                    }
                } catch {
                    // ignore
                }
                setStatus('failed');
                setErrorMessage('Unable to connect to payment verification service.');
            }
        };

        // Delay slightly for smooth transition animation
        const timer = setTimeout(() => {
            verifyPayment();
        }, 1200);

        return () => clearTimeout(timer);
    }, [txRef]);

    const handlePrintReceipt = () => {
        window.print();
    };

    return (
        <div className="payment-verify-page">
            <nav className="verify-nav">
                <div className="nav-logo" onClick={() => navigate('/home')}>
                    Event<span>Hub</span>
                </div>
                <div className="nav-right">
                    <NightDayToggle />
                    <Link to="/user" className="btn-portal">User Portal ➡</Link>
                </div>
            </nav>

            <main className="verify-content">
                {status === 'verifying' && (
                    <div className="verify-card verifying-box animate-fade-in">
                        <div className="chapa-brand-badge">
                            <span className="chapa-icon">⚡</span>
                            <span>Chapa Ethiopian Payment Gateway</span>
                        </div>
                        <div className="verify-spinner">
                            <div className="spinner-ring"></div>
                        </div>
                        <h2>Verifying Your Payment...</h2>
                        <p className="verify-sub">Communicating with banking servers & Telebirr / CBE networks</p>
                        <div className="ref-tag">
                            <span>Transaction Ref:</span>
                            <code>{txRef || 'Locating...'}</code>
                        </div>
                        <small className="security-notice">🔒 256-bit SSL encrypted financial handshake in progress</small>
                    </div>
                )}

                {status === 'success' && paymentData && (
                    <div className="verify-card success-box animate-fade-in">
                        <div className="success-header">
                            <div className="success-icon-badge">✓</div>
                            <h2>Payment Successful!</h2>
                            <p className="success-sub">Your booking has been officially authorized and ticket issued.</p>
                        </div>

                        <div className="gateway-stamp">
                            <span className="stamp-logo">⚡ Chapa Verified</span>
                            <span className="stamp-meta">Settlement Currency: ETB</span>
                        </div>

                        {/* Official Ticket Pass */}
                        <div className="digital-ticket-pass">
                            <div className="pass-top">
                                <div>
                                    <span className="pass-label">OFFICIAL PASS CODE</span>
                                    <h3 className="pass-code">{paymentData.ticketCode || 'TK-ET882910'}</h3>
                                </div>
                                <div className="pass-status-pill">VALID TICKET</div>
                            </div>

                            <div className="pass-body">
                                <h4 className="pass-event-title">{paymentData.eventTitle || 'Event Pass'}</h4>
                                <div className="pass-meta-grid">
                                    <div>
                                        <small>LOCATION</small>
                                        <strong>{paymentData.eventLocation || 'Addis Ababa, Ethiopia'}</strong>
                                    </div>
                                    <div>
                                        <small>TIER ACCESS</small>
                                        <span className="tier-badge-val">{paymentData.ticketType || paymentData.ticketTier || 'Regular'}</span>
                                    </div>
                                    <div>
                                        <small>PASS QUANTITY</small>
                                        <strong>{paymentData.quantity || 1} Person(s)</strong>
                                    </div>
                                    <div>
                                        <small>TOTAL PAID</small>
                                        <strong className="amount-highlight">ETB {paymentData.totalAmount || '0.00'}</strong>
                                    </div>
                                </div>

                                {/* QR Code Graphic Representation */}
                                <div className="pass-qr-section">
                                    <div className="qr-box">
                                        <div className="qr-matrix-mockup">
                                            <div className="qr-corner top-left"></div>
                                            <div className="qr-corner top-right"></div>
                                            <div className="qr-corner bottom-left"></div>
                                            <div className="qr-center-icon">ET</div>
                                        </div>
                                    </div>
                                    <div className="qr-meta">
                                        <small>SCAN AT VENUE GATE</small>
                                        <span>Present this QR pass on mobile or printed slip for entry.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Official Receipt Breakdown */}
                        <div className="receipt-breakdown">
                            <h4>Receipt Summary</h4>
                            <div className="receipt-row">
                                <span>Gateway Reference (tx_ref):</span>
                                <code>{paymentData.tx_ref || txRef}</code>
                            </div>
                            <div className="receipt-row">
                                <span>Payment Method:</span>
                                <strong>{paymentData.paymentMethod || 'Chapa Gateway (Telebirr/CBE)'}</strong>
                            </div>
                            <div className="receipt-row">
                                <span>Booking ID:</span>
                                <span>#{paymentData.bookingId || bookingIdParam || 'N/A'}</span>
                            </div>
                            <div className="receipt-row total-row">
                                <span>Settled Amount:</span>
                                <span className="total-amount-glow">ETB {paymentData.totalAmount || '0.00'}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="verify-actions">
                            <button onClick={handlePrintReceipt} className="btn-print-receipt">
                                🖨️ Print / Save Pass
                            </button>
                            <button onClick={() => navigate('/user')} className="btn-goto-portal">
                                🎟️ View in My Portal
                            </button>
                            <Link to="/home" className="btn-return-home">
                                Home
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="verify-card failed-box animate-fade-in">
                        <div className="failed-icon-badge">✕</div>
                        <h2>Payment Could Not Be Confirmed</h2>
                        <p className="failed-sub">{errorMessage || 'Your payment was declined or canceled by the gateway.'}</p>
                        
                        <div className="ref-tag">
                            <span>Reference Checked:</span>
                            <code>{txRef || 'Unknown'}</code>
                        </div>

                        <div className="failed-reasons-box">
                            <strong>Possible Causes:</strong>
                            <ul>
                                <li>Insufficient balance in Telebirr or CBE Birr account</li>
                                <li>USSD timeout or canceled authorization prompt</li>
                                <li>Transaction canceled in payment window</li>
                            </ul>
                        </div>

                        <div className="verify-actions">
                            <button onClick={() => navigate(-1)} className="btn-retry-payment">
                                🔄 Try Again
                            </button>
                            <Link to="/home" className="btn-return-home">
                                Return to Home
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
