import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment Loader Helper
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...values] = trimmed.split('=');
            if (key && values.length > 0) {
                const val = values.join('=').trim().replace(/^['"]|['"]$/g, '');
                if (!process.env[key.trim()]) {
                    process.env[key.trim()] = val;
                }
            }
        }
    });
}

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-sandbox-demo-key-12345';
const CHAPA_PUBLIC_KEY = process.env.CHAPA_PUBLIC_KEY || 'CHAPUBK_TEST-sandbox-demo-key-12345';
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET || 'chapa_webhook_secret_key_8899';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

// In-memory transaction registry for resilient caching and sandbox simulation
const inMemoryTransactions = new Map();

/**
 * Initialize Chapa Payment Transaction
 */
export async function initializePayment(hub, params) {
    const {
        userId,
        eventId,
        quantity = 1,
        ticketTier = 'Regular',
        email,
        firstName = 'Customer',
        lastName = 'User',
        phoneNumber = '0911002233',
        paymentMethod = 'Telebirr'
    } = params;

    return new Promise((resolve, reject) => {
        // 1. Fetch Event Info
        hub.query("SELECT * FROM events WHERE id = ?", [eventId], async (err, eventRows) => {
            let event = eventRows && eventRows.length > 0 ? eventRows[0] : null;

            // Fallback mock event if database doesn't have it
            if (!event) {
                event = {
                    id: eventId,
                    title: 'Addis Tech & Innovation Expo 2026',
                    ticket_price: 50.00,
                    available_tickets: 100,
                    location: 'Millennium Hall, Addis Ababa'
                };
            }

            if (event.available_tickets < quantity) {
                return reject(new Error('Not enough tickets available for this event'));
            }

            // 2. Compute Ticket Tier Pricing
            let unitPrice = parseFloat(event.ticket_price || 0);
            if (ticketTier === 'VIP') unitPrice *= 1.5;
            if (ticketTier === 'VVIP') unitPrice *= 2.5;
            if (ticketTier === 'Early Bird') unitPrice *= 0.85;

            const totalAmount = parseFloat((unitPrice * parseInt(quantity)).toFixed(2));
            const tx_ref = `EH-CHAPA-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

            // 3. Register Pending Booking & Payment in MySQL
            const pendingBookingSql = `
                INSERT INTO bookings (user_id, event_id, tickets_bought, total_amount, payment_status, ticket_type) 
                VALUES (?, ?, ?, ?, 'Pending', ?)`;

            hub.query(pendingBookingSql, [userId || 1, eventId, quantity, totalAmount, ticketTier], async (bErr, bResult) => {
                const bookingId = bResult ? bResult.insertId : Math.floor(10000 + Math.random() * 90000);

                const pendingPaymentSql = `
                    INSERT INTO payments (transaction_id, user_id, booking_id, amount, payment_method, status) 
                    VALUES (?, ?, ?, ?, ?, 'Pending')`;

                hub.query(pendingPaymentSql, [tx_ref, userId || 1, bookingId, totalAmount, paymentMethod]);

                // Store in transaction state map
                const txnData = {
                    tx_ref,
                    bookingId,
                    userId: userId || 1,
                    eventId,
                    eventTitle: event.title,
                    eventLocation: event.location,
                    ticketTier,
                    quantity: parseInt(quantity),
                    unitPrice,
                    totalAmount,
                    currency: 'ETB',
                    email: email || 'customer@eventhub.et',
                    firstName: firstName || 'Valued',
                    lastName: lastName || 'Attendee',
                    phoneNumber: phoneNumber || '0911002233',
                    paymentMethod,
                    status: 'Pending',
                    createdAt: new Date().toISOString()
                };
                inMemoryTransactions.set(tx_ref, txnData);

                // 4. Call Real Chapa API
                const returnUrl = `${CLIENT_URL}/payment-verify?tx_ref=${tx_ref}&booking_id=${bookingId}`;
                const callbackUrl = `${SERVER_URL}/api/payment/chapa/webhook`;

                const chapaPayload = {
                    amount: totalAmount.toString(),
                    currency: 'ETB',
                    email: txnData.email,
                    first_name: txnData.firstName,
                    last_name: txnData.lastName,
                    phone_number: txnData.phoneNumber,
                    tx_ref: tx_ref,
                    callback_url: callbackUrl,
                    return_url: returnUrl,
                    "customization[title]": "EventHub Ethiopia Ticket",
                    "customization[description]": `${quantity}x ${ticketTier} Pass for ${event.title}`
                };

                // Check if user has provided a real working Chapa Secret Key
                const isRealKey = CHAPA_SECRET_KEY && 
                                  CHAPA_SECRET_KEY.startsWith('CHASECK_') && 
                                  !CHAPA_SECRET_KEY.includes('demo') && 
                                  !CHAPA_SECRET_KEY.includes('sandbox-demo-key');

                if (isRealKey) {
                    try {
                        const chapaRes = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(chapaPayload)
                        });

                        const chapaData = await chapaRes.json();

                        if (chapaData && (chapaData.status === 'success' || chapaData.data?.checkout_url)) {
                            return resolve({
                                Status: 'Success',
                                mode: 'live_chapa',
                                checkoutUrl: chapaData.data.checkout_url,
                                tx_ref,
                                bookingId,
                                totalAmount,
                                message: 'Redirecting to official Chapa Payment Portal'
                            });
                        }
                    } catch (apiError) {
                        console.warn('Direct Chapa API call returned error, falling back to sandbox simulator:', apiError.message);
                    }
                }

                // Sandbox Checkout Simulator Mode
                const sandboxUrl = `${CLIENT_URL}/chapa-checkout/${tx_ref}`;
                return resolve({
                    Status: 'Success',
                    mode: 'sandbox_simulator',
                    checkoutUrl: sandboxUrl,
                    tx_ref,
                    bookingId,
                    totalAmount,
                    message: 'Chapa Sandbox Simulator checkout initialized'
                });
            });
        });
    });
}

/**
 * Verify Chapa Payment Transaction
 */
export async function verifyPayment(hub, tx_ref) {
    return new Promise(async (resolve, reject) => {
        let txn = inMemoryTransactions.get(tx_ref);

        // Try verifying with official Chapa API if real key
        const isRealKey = CHAPA_SECRET_KEY && 
                          CHAPA_SECRET_KEY.startsWith('CHASECK_') && 
                          !CHAPA_SECRET_KEY.includes('demo') && 
                          !CHAPA_SECRET_KEY.includes('sandbox-demo-key');

        let isVerifiedFromApi = false;
        let apiData = null;

        if (isRealKey) {
            try {
                const verifyRes = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${tx_ref}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
                    }
                });
                apiData = await verifyRes.json();
                if (apiData && (apiData.status === 'success' || apiData.data?.status === 'success')) {
                    isVerifiedFromApi = true;
                }
            } catch (err) {
                console.warn('Chapa verification API error:', err.message);
            }
        }

        // If verified via real API or marked paid in sandbox
        const isApproved = isVerifiedFromApi || (txn && txn.status === 'Completed');

        if (!isApproved) {
            // Check if already completed in DB
            hub.query("SELECT * FROM payments WHERE transaction_id = ? AND status = 'Completed'", [tx_ref], (err, rows) => {
                if (rows && rows.length > 0) {
                    return fulfillOrder(hub, tx_ref, txn).then(resolve).catch(reject);
                } else {
                    return resolve({
                        Status: 'Pending',
                        message: 'Payment has not been completed yet',
                        tx_ref
                    });
                }
            });
            return;
        }

        // Fulfill the booking and ticket
        try {
            const fulfilledData = await fulfillOrder(hub, tx_ref, txn, apiData?.data);
            return resolve(fulfilledData);
        } catch (error) {
            return reject(error);
        }
    });
}

/**
 * Fulfill Booking: Complete Payment, Decrement Inventory, Issue QR Ticket
 */
export async function fulfillOrder(hub, tx_ref, cachedTxn, chapaData = null) {
    return new Promise((resolve) => {
        const ticketCode = 'TK-ET' + Math.floor(100000 + Math.random() * 900000);

        // 1. Update Payment Record to Completed
        hub.query("UPDATE payments SET status = 'Completed' WHERE transaction_id = ?", [tx_ref]);

        // 2. Lookup booking
        hub.query("SELECT b.*, e.title as event_title, e.location as event_location, e.event_date FROM bookings b LEFT JOIN events e ON b.event_id = e.id WHERE b.id = (SELECT booking_id FROM payments WHERE transaction_id = ? LIMIT 1)", [tx_ref], (err, rows) => {
            let booking = rows && rows.length > 0 ? rows[0] : null;

            if (!booking && cachedTxn) {
                booking = {
                    id: cachedTxn.bookingId,
                    user_id: cachedTxn.userId,
                    event_id: cachedTxn.eventId,
                    tickets_bought: cachedTxn.quantity,
                    total_amount: cachedTxn.totalAmount,
                    ticket_type: cachedTxn.ticketTier,
                    event_title: cachedTxn.eventTitle,
                    event_location: cachedTxn.eventLocation,
                    event_date: new Date().toISOString()
                };
            }

            if (booking) {
                // Update booking status
                hub.query("UPDATE bookings SET payment_status = 'Completed' WHERE id = ?", [booking.id]);

                // Decrement inventory
                hub.query("UPDATE events SET available_tickets = GREATEST(0, available_tickets - ?) WHERE id = ?", [booking.tickets_bought, booking.event_id]);

                // Create Ticket
                const qrPayload = JSON.stringify({
                    ticketCode,
                    bookingId: booking.id,
                    txRef: tx_ref,
                    event: booking.event_title,
                    tier: booking.ticket_type,
                    quantity: booking.tickets_bought,
                    amount: booking.total_amount,
                    currency: 'ETB',
                    issuedAt: new Date().toISOString()
                });

                const sqlTicket = "INSERT INTO tickets (ticket_code, user_id, event_id, booking_id, ticket_type, status, qr_data) VALUES (?, ?, ?, ?, ?, 'valid', ?)";
                hub.query(sqlTicket, [ticketCode, booking.user_id, booking.event_id, booking.id, booking.ticket_type, qrPayload]);

                // Update cached transaction
                if (cachedTxn) {
                    cachedTxn.status = 'Completed';
                    cachedTxn.ticketCode = ticketCode;
                    cachedTxn.qrData = qrPayload;
                }

                return resolve({
                    Status: 'Success',
                    paymentStatus: 'Completed',
                    tx_ref,
                    bookingId: booking.id,
                    ticketCode,
                    eventTitle: booking.event_title,
                    eventLocation: booking.event_location,
                    eventDate: booking.event_date,
                    ticketType: booking.ticket_type,
                    quantity: booking.tickets_bought,
                    totalAmount: booking.total_amount,
                    currency: 'ETB',
                    paymentMethod: chapaData?.payment_method || cachedTxn?.paymentMethod || 'Chapa Payment Gateway',
                    qrData: qrPayload,
                    completedAt: new Date().toISOString()
                });
            }

            // Fallback response
            return resolve({
                Status: 'Success',
                paymentStatus: 'Completed',
                tx_ref,
                ticketCode,
                totalAmount: cachedTxn ? cachedTxn.totalAmount : 0,
                currency: 'ETB',
                message: 'Payment verified and ticket pass confirmed'
            });
        });
    });
}

/**
 * Handle Chapa Webhook Notification
 */
export async function handleChapaWebhook(hub, req, res) {
    try {
        const signature = req.headers['x-chapa-signature'];
        const payload = req.body;

        // Verify signature if secret configured
        if (CHAPA_WEBHOOK_SECRET && signature) {
            const hmac = crypto.createHmac('sha256', CHAPA_WEBHOOK_SECRET);
            const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
            if (signature !== expectedSignature) {
                console.warn('Chapa webhook signature mismatch');
                return res.status(401).json({ Error: 'Invalid webhook signature' });
            }
        }

        const tx_ref = payload.tx_ref;
        const status = payload.status;

        if (tx_ref && status === 'success') {
            const cachedTxn = inMemoryTransactions.get(tx_ref);
            await fulfillOrder(hub, tx_ref, cachedTxn, payload);
            console.log(`Chapa Webhook: Transaction ${tx_ref} successfully fulfilled`);
        }

        return res.status(200).json({ status: 'success' });
    } catch (err) {
        console.error('Webhook processing error:', err);
        return res.status(500).json({ Error: err.message });
    }
}

/**
 * Sandbox Simulation Pay Handler (Used by Chapa Checkout Simulator)
 */
export async function simulateSandboxPay(hub, tx_ref, paymentMethod = 'Telebirr', payerDetails = {}) {
    const txn = inMemoryTransactions.get(tx_ref);
    if (!txn) {
        // Create temporary txn in memory if missing
        inMemoryTransactions.set(tx_ref, {
            tx_ref,
            bookingId: Math.floor(1000 + Math.random() * 9000),
            eventId: 1,
            eventTitle: 'Addis Tech & Innovation Expo 2026',
            ticketTier: 'Regular',
            quantity: 1,
            totalAmount: 49.99,
            currency: 'ETB',
            paymentMethod: paymentMethod,
            status: 'Pending'
        });
    }

    const currentTxn = inMemoryTransactions.get(tx_ref);
    currentTxn.status = 'Completed';
    currentTxn.paymentMethod = paymentMethod;
    currentTxn.payerPhone = payerDetails.phone || currentTxn.phoneNumber;

    // Fulfill order
    const fulfillment = await fulfillOrder(hub, tx_ref, currentTxn, {
        payment_method: paymentMethod,
        phone: payerDetails.phone
    });

    return fulfillment;
}

/**
 * Get Transaction Details by Reference
 */
export function getTransactionDetails(tx_ref) {
    return inMemoryTransactions.get(tx_ref) || null;
}
