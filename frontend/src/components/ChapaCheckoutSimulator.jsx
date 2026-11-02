import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChapaCheckoutSimulator.css';

export default function ChapaCheckoutSimulator() {
    const { txRef } = useParams();
    const navigate = useNavigate();

    const [txn, setTxn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('telebirr'); // 'telebirr', 'cbe', 'card', 'awash'
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState('input'); // 'input', 'prompt_sent', 'success'

    // Inputs
    const [phone, setPhone] = useState('0911223344');
    const [otpPin, setOtpPin] = useState('');
    const [cardDetails, setCardDetails] = useState({
        number: '4532 8920 1192 8831',
        holder: 'Abebe Bikila',
        exp: '10/28',
        cvv: '882'
    });

    useEffect(() => {
        // Fetch transaction details
        axios.get(`http://localhost:3000/api/payment/chapa/transaction/${txRef}`)
            .then(res => {
                if (res.data && res.data.transaction) {
                    setTxn(res.data.transaction);
                    if (res.data.transaction.phoneNumber) {
                        setPhone(res.data.transaction.phoneNumber);
                    }
                    if (res.data.transaction.paymentMethod === 'CBE Birr') {
                        setSelectedTab('cbe');
                    } else if (res.data.transaction.paymentMethod === 'Credit Card') {
                        setSelectedTab('card');
                    }
                }
            })
            .catch(err => {
                console.error("Failed to load txn details:", err);
                // Create mock fallback transaction if server query fails
                setTxn({
                    tx_ref: txRef,
                    eventTitle: 'Addis Tech & Innovation Expo 2026',
                    totalAmount: 49.99,
                    currency: 'ETB',
                    quantity: 1,
                    ticketTier: 'Regular',
                    email: 'attendee@gmail.com'
                });
            })
            .finally(() => setLoading(false));
    }, [txRef]);

    const handleAuthorizePayment = async (e) => {
        e.preventDefault();
        setProcessing(true);

        const methodMap = {
            telebirr: 'Telebirr (Chapa)',
            cbe: 'CBE Birr (Chapa)',
            card: 'Credit Card (Chapa)',
            awash: 'Awash Birr (Chapa)'
        };

        const chosenMethod = methodMap[selectedTab] || 'Chapa Multi-Pay';

        try {
            // Call simulation pay endpoint
            const res = await axios.post('http://localhost:3000/api/payment/chapa/simulate-pay', {
                tx_ref: txRef,
                paymentMethod: chosenMethod,
                payerDetails: {
                    phone: phone,
                    cardHolder: cardDetails.holder
                }
            });

            setStep('prompt_sent');
            setTimeout(() => {
                setStep('success');
                setTimeout(() => {
                    navigate(`/payment-verify?tx_ref=${txRef}&status=success`);
                }, 1200);
            }, 1800);
        } catch (err) {
            console.error('Simulation error:', err);
            // Fallback navigate to verify anyway
            navigate(`/payment-verify?tx_ref=${txRef}&status=success`);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="chapa-sim-container">
                <div className="chapa-sim-loading">
                    <div className="chapa-spinner"></div>
                    <p>Securing connection to Chapa Payment Gateway...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chapa-sim-container">
            {/* Chapa Header */}
            <div className="chapa-sim-nav">
                <div className="chapa-brand">
                    <div className="chapa-logo-glyph">⚡</div>
                    <div>
                        <span className="brand-title">CHAPA</span>
                        <span className="brand-sub">Ethiopia's Financial Engine</span>
                    </div>
                </div>
                <div className="chapa-security-badge">
                    <span className="lock-icon">🔒</span>
                    <span>PCI-DSS Level 1 Secured • 256-Bit SSL</span>
                </div>
            </div>

            <div className="chapa-sim-layout">
                {/* Left Card: Order Summary */}
                <div className="chapa-order-sidebar">
                    <div className="merchant-info">
                        <small>PAYING TO MERCHANT</small>
                        <h3>EventHub Ethiopia PLC</h3>
                        <span className="verified-badge">✓ Verified Merchant</span>
                    </div>

                    <div className="order-price-display">
                        <small>TOTAL DUE AMOUNT</small>
                        <div className="price-big">
                            <span className="curr">ETB</span>
                            <span className="num">{txn?.totalAmount || '49.99'}</span>
                        </div>
                    </div>

                    <div className="order-details-card">
                        <div className="detail-item">
                            <span>Item:</span>
                            <strong>{txn?.eventTitle || 'Event Pass'}</strong>
                        </div>
                        <div className="detail-item">
                            <span>Tier / Quantity:</span>
                            <span>{txn?.quantity || 1}x {txn?.ticketTier || 'Pass'}</span>
                        </div>
                        <div className="detail-item">
                            <span>Transaction Ref:</span>
                            <code className="tx-code">{txRef}</code>
                        </div>
                    </div>

                    <div className="chapa-sandbox-notice">
                        <span className="sandbox-tag">TEST SANDBOX ENVIRONMENT</span>
                        <p>This is a simulated Chapa Gateway checkout. No real money will be deducted from your account.</p>
                    </div>

                    <button 
                        type="button" 
                        className="btn-cancel-chapa"
                        onClick={() => navigate(-1)}
                    >
                        ✕ Cancel & Return to Merchant
                    </button>
                </div>

                {/* Right Card: Payment Gateway Tabs */}
                <div className="chapa-payment-box">
                    <div className="tabs-header">
                        <button 
                            type="button" 
                            className={`tab-btn ${selectedTab === 'telebirr' ? 'active telebirr-active' : ''}`}
                            onClick={() => setSelectedTab('telebirr')}
                        >
                            <span className="tab-icon">📱</span>
                            <span>Telebirr</span>
                        </button>
                        <button 
                            type="button" 
                            className={`tab-btn ${selectedTab === 'cbe' ? 'active cbe-active' : ''}`}
                            onClick={() => setSelectedTab('cbe')}
                        >
                            <span className="tab-icon">🏦</span>
                            <span>CBE Birr</span>
                        </button>
                        <button 
                            type="button" 
                            className={`tab-btn ${selectedTab === 'card' ? 'active card-active' : ''}`}
                            onClick={() => setSelectedTab('card')}
                        >
                            <span className="tab-icon">💳</span>
                            <span>Card Pay</span>
                        </button>
                        <button 
                            type="button" 
                            className={`tab-btn ${selectedTab === 'awash' ? 'active awash-active' : ''}`}
                            onClick={() => setSelectedTab('awash')}
                        >
                            <span className="tab-icon">🏛️</span>
                            <span>Awash / BOA</span>
                        </button>
                    </div>

                    {step === 'prompt_sent' && (
                        <div className="prompt-sim-overlay">
                            <div className="ussd-phone-mockup">
                                <div className="ussd-screen">
                                    <div className="ussd-title">⚡ USSD Direct Push</div>
                                    <p>Confirm payment of ETB {txn?.totalAmount} to EventHub Ethiopia</p>
                                    <div className="pulsing-circle"></div>
                                    <small>Waiting for customer PIN input...</small>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="prompt-sim-overlay">
                            <div className="ussd-phone-mockup success-glow">
                                <div className="ussd-screen">
                                    <div className="success-check">✓</div>
                                    <h3>Transaction Authorized!</h3>
                                    <p>Returning to EventHub Ticket Desk...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'input' && (
                        <form onSubmit={handleAuthorizePayment} className="chapa-form">
                            {selectedTab === 'telebirr' && (
                                <div className="tab-content telebirr-theme">
                                    <div className="provider-banner telebirr-bg">
                                        <div className="provider-logo-tag">TELEBIRR SUPERAPP</div>
                                        <p>Fast, direct mobile money deduction powered by Ethio Telecom</p>
                                    </div>

                                    <div className="input-group">
                                        <label>Telebirr Registered Phone Number</label>
                                        <div className="phone-prefix-wrap">
                                            <span className="prefix">+251</span>
                                            <input 
                                                type="tel" 
                                                className="chapa-input"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="911 22 33 44"
                                                required
                                            />
                                        </div>
                                        <small className="help-text">A USSD push notification will be triggered to this number.</small>
                                    </div>

                                    <div className="sandbox-demo-credentials">
                                        <span>💡 Sandbox Hint:</span>
                                        <small>Any Ethiopian 10-digit phone number will work in test mode.</small>
                                    </div>
                                </div>
                            )}

                            {selectedTab === 'cbe' && (
                                <div className="tab-content cbe-theme">
                                    <div className="provider-banner cbe-bg">
                                        <div className="provider-logo-tag">COMMERCIAL BANK OF ETHIOPIA</div>
                                        <p>Direct CBE Birr Mobile Payment & CBE Noor integration</p>
                                    </div>

                                    <div className="input-group">
                                        <label>CBE Birr Mobile / Account Number</label>
                                        <input 
                                            type="text" 
                                            className="chapa-input"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="0911000000 or 1000XXXXXXXX"
                                            required
                                        />
                                        <small className="help-text">Authorization prompt will appear on your phone via *847# menu.</small>
                                    </div>

                                    <div className="sandbox-demo-credentials">
                                        <span>💡 Sandbox Hint:</span>
                                        <small>Click 'Authorize & Pay' to test instant CBE approval.</small>
                                    </div>
                                </div>
                            )}

                            {selectedTab === 'card' && (
                                <div className="tab-content card-theme">
                                    <div className="provider-banner card-bg">
                                        <div className="provider-logo-tag">VISA & MASTERCARD</div>
                                        <p>Ethiopian local debit cards and international credit cards</p>
                                    </div>

                                    <div className="input-group">
                                        <label>Cardholder Name</label>
                                        <input 
                                            type="text" 
                                            className="chapa-input"
                                            value={cardDetails.holder}
                                            onChange={e => setCardDetails({ ...cardDetails, holder: e.target.value })}
                                            placeholder="Full Name as printed on card"
                                            required
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label>Card Number</label>
                                        <input 
                                            type="text" 
                                            className="chapa-input"
                                            value={cardDetails.number}
                                            onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                                            placeholder="4532 •••• •••• 8831"
                                            maxLength="19"
                                            required
                                        />
                                    </div>

                                    <div className="split-grid">
                                        <div className="input-group">
                                            <label>Expiry (MM/YY)</label>
                                            <input 
                                                type="text" 
                                                className="chapa-input"
                                                value={cardDetails.exp}
                                                onChange={e => setCardDetails({ ...cardDetails, exp: e.target.value })}
                                                placeholder="MM/YY"
                                                maxLength="5"
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>CVV / CVC</label>
                                            <input 
                                                type="password" 
                                                className="chapa-input"
                                                value={cardDetails.cvv}
                                                onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                                placeholder="•••"
                                                maxLength="4"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTab === 'awash' && (
                                <div className="tab-content awash-theme">
                                    <div className="provider-banner awash-bg">
                                        <div className="provider-logo-tag">AWASH BIRR & BANK OF ABYSSINIA</div>
                                        <p>Direct banking checkout via Awash Birr and BOA Mobile</p>
                                    </div>

                                    <div className="input-group">
                                        <label>Bank Account or Phone</label>
                                        <input 
                                            type="text" 
                                            className="chapa-input"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="0911000000 or Awash ID"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn-chapa-submit"
                                disabled={processing}
                            >
                                {processing ? (
                                    <>⚡ Authorizing with Bank Servers...</>
                                ) : (
                                    <>🔒 Pay ETB {txn?.totalAmount || '49.99'} Now</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
