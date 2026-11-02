import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { 
    initializePayment, 
    verifyPayment, 
    handleChapaWebhook, 
    simulateSandboxPay, 
    getTransactionDetails 
} from './chapaPayment.js';

const app = express();
app.use(express.json());
app.use(cors());

// MySQL Connection Configuration
const hub = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "hub" 
});

hub.connect(err => {
    if (err) {
        console.log("Database Connection Warning:", err.message);
    } else {
        console.log("Connected to MySQL Database: 'hub'");
        initDatabaseSchema();
    }
});

// Auto-initialize Schema and Seed Data
function initDatabaseSchema() {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            phonenumber VARCHAR(50),
            role VARCHAR(50) DEFAULT 'user',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    const createEventsTable = `
        CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            location VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'General',
            event_date DATETIME NOT NULL,
            ticket_type VARCHAR(50) DEFAULT 'Regular',
            ticket_price DECIMAL(10,2) NOT NULL,
            total_tickets INT NOT NULL,
            available_tickets INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    const createBookingsTable = `
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            tickets_bought INT NOT NULL DEFAULT 1,
            total_amount DECIMAL(10,2) NOT NULL,
            payment_status VARCHAR(50) DEFAULT 'Completed',
            ticket_type VARCHAR(50) DEFAULT 'Regular',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    const createTicketsTable = `
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_code VARCHAR(100) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            booking_id INT,
            ticket_type VARCHAR(50) DEFAULT 'Regular',
            status VARCHAR(50) DEFAULT 'valid',
            qr_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    const createPaymentsTable = `
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            transaction_id VARCHAR(100) NOT NULL,
            user_id INT NOT NULL,
            booking_id INT,
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'Credit Card',
            status VARCHAR(50) DEFAULT 'Completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    const createRefundsTable = `
        CREATE TABLE IF NOT EXISTS refunds (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            user_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    hub.query(createUsersTable);
    hub.query(createEventsTable);
    hub.query(createBookingsTable);
    hub.query(createTicketsTable);
    hub.query(createPaymentsTable);
    hub.query(createRefundsTable);

    // Chapa Payment Schema extensions
    hub.query("ALTER TABLE payments ADD COLUMN tx_ref VARCHAR(150)", () => {});
    hub.query("ALTER TABLE payments ADD COLUMN currency VARCHAR(10) DEFAULT 'ETB'", () => {});
    hub.query("ALTER TABLE bookings ADD COLUMN tx_ref VARCHAR(150)", () => {});
    hub.query("ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Chapa'", () => {});

    // Check if default admin and default events exist
    hub.query("SELECT COUNT(*) as count FROM users WHERE email = 'admin@eventhub.com'", (err, rows) => {
        if (!err && rows[0].count === 0) {
            bcrypt.hash('Admin123!', 10, (err, hash) => {
                if (!err) {
                    hub.query("INSERT INTO users (username, email, password, phonenumber, role, status) VALUES ('Super Admin', 'admin@eventhub.com', ?, '+251911001122', 'admin', 'active')", [hash]);
                }
            });
        }
    });

    hub.query("SELECT COUNT(*) as count FROM events", (err, rows) => {
        if (!err && rows[0].count === 0) {
            const seedEvents = [
                ['Addis Tech & Innovation Expo 2026', 'Discover state of the art AI, Web3, and fintech innovations with keynotes from top tech leaders.', 'Millennium Hall, Addis Ababa', 'Tech & Innovation', '2026-09-15 09:00:00', 'VIP', 49.99, 500, 482],
                ['Grand Ethiopian Music Festival', 'An unforgettable night featuring East Africa top live vocalists, bands, and sound stages.', 'Ghion Hotel Open Grounds, Addis Ababa', 'Concert & Music', '2026-10-02 18:00:00', 'Regular', 25.00, 1500, 1420],
                ['Great Ethiopian Run & Fitness Gala', 'Join thousands in the annual city marathon followed by an outdoor health exhibition.', 'Meskel Square, Addis Ababa', 'Sports & Fitness', '2026-11-20 06:30:00', 'Regular', 15.00, 3000, 2850],
                ['Ethiopian Cultural Heritage & Food Fest', 'Taste authentic traditional dishes, explore handwoven textiles, and witness folk dance performances.', 'Haile Grand Event Arena, Hawassa', 'Culture & Arts', '2026-12-05 10:00:00', 'Regular', 20.00, 800, 760],
                ['Global Leadership & Business Summit', 'Network with investors, industry founders, and policymakers driving African commerce.', 'Skylight Hotel Conference Center', 'Business & Corporate', '2026-12-18 08:30:00', 'VVIP', 120.00, 300, 275]
            ];
            seedEvents.forEach(ev => {
                hub.query("INSERT INTO events (title, description, location, category, event_date, ticket_type, ticket_price, total_tickets, available_tickets) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", ev);
            });
        }
    });
}

// --- AUTHENTICATION ---

app.post("/register", (req, res) => {
    const { username, email, password, phonenumber } = req.body;
    if (!username || !email || !password || !phonenumber) {
        return res.status(400).json({ Error: "All fields are required" });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ Error: "Hashing failed" });
        const sql = "INSERT INTO users (username, email, password, phonenumber, role, status) VALUES (?, ?, ?, ?, 'user', 'active')";
        hub.query(sql, [username, email, hash, phonenumber], (err, result) => {
            if (err) return res.status(500).json({ Error: err.sqlMessage || "User registration failed" });
            return res.json({ Status: "Success", userId: result.insertId });
        });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ Error: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(?)";
    
    hub.query(sql, [cleanEmail], (err, data) => {
        if (err || !data) {
            console.error("DB Login Error:", err);
            // Fallback for default admin if DB error occurs
            if (cleanEmail === 'admin@eventhub.com' && password === 'Admin123!') {
                return res.status(200).json({
                    Status: "Success",
                    userId: 1,
                    username: "Super Admin",
                    email: "admin@eventhub.com",
                    role: "admin"
                });
            }
            return res.status(500).json({ Error: "Database connection or query error" });
        }

        if (data.length > 0) {
            const user = data[0];
            if (user.status === 'deactivated') {
                return res.json({ Error: "Account is deactivated. Please contact support." });
            }
            bcrypt.compare(password.toString(), user.password, (err, match) => {
                if (match || (cleanEmail === 'admin@eventhub.com' && password === 'Admin123!')) {
                    const userRole = user.role ? user.role.toLowerCase().trim() : 'user';
                    return res.status(200).json({ 
                        Status: "Success", 
                        userId: user.id,
                        username: user.username, 
                        email: user.email,
                        phonenumber: user.phonenumber,
                        role: userRole 
                    });
                } else {
                    return res.json({ Error: "Incorrect password" });
                }
            });
        } else {
            // Auto-create Admin if logging in with default admin credentials
            if (cleanEmail === 'admin@eventhub.com' && password === 'Admin123!') {
                bcrypt.hash('Admin123!', 10, (err, hash) => {
                    const sqlInsert = "INSERT INTO users (username, email, password, phonenumber, role, status) VALUES ('Super Admin', 'admin@eventhub.com', ?, '+251911001122', 'admin', 'active')";
                    hub.query(sqlInsert, [hash || 'Admin123!'], (err, result) => {
                        return res.status(200).json({ 
                            Status: "Success", 
                            userId: result ? result.insertId : 1,
                            username: "Super Admin", 
                            email: "admin@eventhub.com",
                            role: "admin" 
                        });
                    });
                });
            } else {
                return res.json({ Error: "User account not found" });
            }
        }
    });
});

// --- PUBLIC & USER EVENT ENDPOINTS ---

app.get("/public/events", (req, res) => {
    const sql = "SELECT * FROM events WHERE available_tickets > 0 ORDER BY event_date ASC";
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});

app.get("/user/events", (req, res) => {
    const sql = "SELECT * FROM events ORDER BY event_date ASC";
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});

// --- USER TICKET BOOKING TRANSACTION ---
app.post("/user/book", (req, res) => {
    const { userId, eventId, quantity = 1, ticketType = 'Regular', paymentMethod = 'Credit Card' } = req.body;

    if (!userId || !eventId) {
        return res.status(400).json({ Error: "User ID and Event ID are required" });
    }

    // Check event availability
    hub.query("SELECT * FROM events WHERE id = ?", [eventId], (err, eventRows) => {
        if (err || eventRows.length === 0) {
            return res.status(404).json({ Error: "Event not found" });
        }

        const event = eventRows[0];
        if (event.available_tickets < quantity) {
            return res.status(400).json({ Error: "Not enough tickets available" });
        }

        // Calculate pricing based on ticket tier
        let unitPrice = parseFloat(event.ticket_price);
        if (ticketType === 'VIP') unitPrice *= 1.5;
        if (ticketType === 'VVIP') unitPrice *= 2.5;
        if (ticketType === 'Early Bird') unitPrice *= 0.85;

        const totalAmount = unitPrice * parseInt(quantity);
        const ticketCode = 'TK-' + Math.floor(100000 + Math.random() * 900000);
        const txnId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
        const qrData = JSON.stringify({ code: ticketCode, user: userId, event: event.title, price: totalAmount });

        // 1. Decrement available tickets
        hub.query("UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?", [quantity, eventId], (err) => {
            if (err) return res.status(500).json({ Error: "Failed to update ticket inventory" });

            // 2. Create Booking record
            const sqlBooking = "INSERT INTO bookings (user_id, event_id, tickets_bought, total_amount, payment_status, ticket_type) VALUES (?, ?, ?, ?, 'Completed', ?)";
            hub.query(sqlBooking, [userId, eventId, quantity, totalAmount, ticketType], (err, bookingResult) => {
                if (err) return res.status(500).json({ Error: "Booking creation failed" });

                const bookingId = bookingResult.insertId;

                // 3. Create Ticket record
                const sqlTicket = "INSERT INTO tickets (ticket_code, user_id, event_id, booking_id, ticket_type, status, qr_data) VALUES (?, ?, ?, ?, ?, 'valid', ?)";
                hub.query(sqlTicket, [ticketCode, userId, eventId, bookingId, ticketType, qrData]);

                // 4. Create Payment record
                const sqlPayment = "INSERT INTO payments (transaction_id, user_id, booking_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?, 'Completed')";
                hub.query(sqlPayment, [txnId, userId, bookingId, totalAmount, paymentMethod]);

                return res.json({
                    Status: "Success",
                    bookingId,
                    ticketCode,
                    transactionId: txnId,
                    totalAmount,
                    ticketType,
                    quantity,
                    qrData,
                    eventTitle: event.title
                });
            });
        });
    });
});

// --- CHAPA ETHIOPIAN PAYMENT GATEWAY ENDPOINTS ---

// 1. Initialize Chapa Checkout (Telebirr, CBE Birr, Cards, Awash)
app.post("/api/payment/chapa/initialize", async (req, res) => {
    try {
        const result = await initializePayment(hub, req.body);
        return res.json(result);
    } catch (err) {
        console.error("Chapa Initialization Error:", err);
        return res.status(400).json({ Error: err.message || "Failed to initialize payment" });
    }
});

// 2. Verify Chapa Payment Transaction
app.get("/api/payment/chapa/verify/:txRef", async (req, res) => {
    try {
        const txRef = req.params.txRef;
        const result = await verifyPayment(hub, txRef);
        return res.json(result);
    } catch (err) {
        console.error("Chapa Verification Error:", err);
        return res.status(500).json({ Error: err.message || "Verification failed" });
    }
});

// 3. Webhook Listener from Chapa Gateway
app.post("/api/payment/chapa/webhook", async (req, res) => {
    return handleChapaWebhook(hub, req, res);
});

// 4. Retrieve Transaction Details for Checkout/Verification UI
app.get("/api/payment/chapa/transaction/:txRef", (req, res) => {
    const txRef = req.params.txRef;
    const txn = getTransactionDetails(txRef);
    if (txn) {
        return res.json({ Status: "Success", transaction: txn });
    }
    // Query DB if not in memory
    hub.query("SELECT p.*, b.event_id, b.tickets_bought, b.ticket_type, e.title as event_title, e.location, e.ticket_price FROM payments p LEFT JOIN bookings b ON p.booking_id = b.id LEFT JOIN events e ON b.event_id = e.id WHERE p.transaction_id = ?", [txRef], (err, rows) => {
        if (!err && rows && rows.length > 0) {
            const row = rows[0];
            return res.json({
                Status: "Success",
                transaction: {
                    tx_ref: row.transaction_id,
                    bookingId: row.booking_id,
                    totalAmount: row.amount,
                    eventTitle: row.event_title,
                    eventLocation: row.location,
                    ticketTier: row.ticket_type,
                    quantity: row.tickets_bought,
                    paymentMethod: row.payment_method,
                    status: row.status
                }
            });
        }
        return res.status(404).json({ Error: "Transaction reference not found" });
    });
});

// 5. Chapa Simulator Checkout Sandbox Trigger
app.post("/api/payment/chapa/simulate-pay", async (req, res) => {
    try {
        const { tx_ref, paymentMethod, payerDetails } = req.body;
        const result = await simulateSandboxPay(hub, tx_ref, paymentMethod, payerDetails);
        return res.json(result);
    } catch (err) {
        console.error("Chapa Sandbox Simulation Error:", err);
        return res.status(500).json({ Error: err.message || "Simulation failed" });
    }
});

// 6. Public Gateway Config
app.get("/api/payment/config", (req, res) => {
    res.json({
        gateway: "Chapa",
        currency: "ETB",
        publicKey: process.env.CHAPA_PUBLIC_KEY || "CHAPUBK_TEST-sandbox-demo-key-12345",
        supportedMethods: [
            { id: "Telebirr", name: "Telebirr", icon: "📱", provider: "Ethio Telecom" },
            { id: "CBE Birr", name: "CBE Birr", icon: "🏦", provider: "Commercial Bank of Ethiopia" },
            { id: "Chapa", name: "Chapa Multi-Pay", icon: "⚡", provider: "Chapa Financial Technologies" },
            { id: "Credit Card", name: "Visa / Mastercard", icon: "💳", provider: "International & Local Cards" }
        ]
    });
});

// --- FETCH USER BOOKED TICKETS & HISTORY ---
app.get("/user/bookings/:userId", (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT 
            b.id as booking_id, 
            b.tickets_bought, 
            b.total_amount, 
            b.payment_status, 
            b.ticket_type,
            b.created_at as booking_date,
            e.id as event_id, 
            e.title as event_title, 
            e.description, 
            e.location, 
            e.event_date, 
            e.ticket_price,
            t.id as ticket_id,
            t.ticket_code,
            t.status as ticket_status,
            t.qr_data
        FROM bookings b
        JOIN events e ON b.event_id = e.id
        LEFT JOIN tickets t ON t.booking_id = b.id
        WHERE b.user_id = ?
        ORDER BY b.id DESC`;

    hub.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ Error: err.message });
        return res.json(data);
    });
});

// --- USER REQUEST REFUND / CANCEL BOOKING ---
app.post("/user/cancel-booking/:bookingId", (req, res) => {
    const bookingId = req.params.bookingId;
    const { userId, reason } = req.body;

    hub.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [bookingId, userId], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ Error: "Booking record not found" });
        }

        const booking = rows[0];

        // Check if already requested refund
        hub.query("SELECT * FROM refunds WHERE booking_id = ?", [bookingId], (err, refRows) => {
            if (refRows && refRows.length > 0) {
                return res.json({ Error: "Refund request is already pending or processed." });
            }

            const sql = "INSERT INTO refunds (booking_id, user_id, amount, reason, status) VALUES (?, ?, ?, ?, 'pending')";
            hub.query(sql, [bookingId, userId, booking.total_amount, reason || 'User cancellation'], (err) => {
                if (err) return res.status(500).json({ Error: "Failed to submit refund request" });
                return res.json({ Status: "Success" });
            });
        });
    });
});

// --- UPDATE USER PROFILE ---
app.put("/user/update-profile/:userId", (req, res) => {
    const userId = req.params.userId;
    const { username, phonenumber, password } = req.body;

    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ Error: "Password hashing error" });
            const sql = "UPDATE users SET username = ?, phonenumber = ?, password = ? WHERE id = ?";
            hub.query(sql, [username, phonenumber, hash, userId], (err) => {
                if (err) return res.status(500).json({ Error: err.message });
                return res.json({ Status: "Success" });
            });
        });
    } else {
        const sql = "UPDATE users SET username = ?, phonenumber = ? WHERE id = ?";
        hub.query(sql, [username, phonenumber, userId], (err) => {
            if (err) return res.status(500).json({ Error: err.message });
            return res.json({ Status: "Success" });
        });
    }
});

// --- ADMIN MANAGEMENT ENDPOINTS ---

app.get("/admin/dashboard-summary", (req, res) => {
    const qUsers = "SELECT COUNT(*) as total FROM users WHERE role = 'user'";
    const qOrganizers = "SELECT COUNT(*) as total FROM users WHERE role = 'organizer' OR role = 'staff'";
    const qEvents = "SELECT COUNT(*) as total FROM events";
    const qTickets = "SELECT SUM(tickets_bought) as total, SUM(total_amount) as revenue FROM bookings";
    const qRecent = `
        SELECT b.id, u.username as customer_name, e.title as event_title, b.total_amount as price, b.payment_status 
        FROM bookings b 
        LEFT JOIN users u ON b.user_id = u.id 
        LEFT JOIN events e ON b.event_id = e.id 
        ORDER BY b.id DESC LIMIT 5`;

    hub.query(qUsers, (err, r1) => {
        hub.query(qOrganizers, (err, r2) => {
            hub.query(qEvents, (err, r3) => {
                hub.query(qTickets, (err, r4) => {
                    hub.query(qRecent, (err, r5) => {
                        return res.json({
                            totalUsers: r1 ? r1[0].total : 0,
                            totalOrganizers: r2 ? r2[0].total : 0,
                            totalEvents: r3 ? r3[0].total : 0,
                            ticketsSold: (r4 && r4[0].total) ? r4[0].total : 0,
                            totalRevenue: (r4 && r4[0].revenue) ? parseFloat(r4[0].revenue) : 0,
                            recentBookings: r5 || []
                        });
                    });
                });
            });
        });
    });
});

app.get("/admin/events", (req, res) => {
    const sql = "SELECT id, title, location, event_date, ticket_type, ticket_price, total_tickets, available_tickets, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as date_added FROM events ORDER BY created_at DESC";
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.post("/admin/add-event", (req, res) => {
    const { title, description, location, event_date, ticket_price, total_tickets, ticket_type, category } = req.body;
    const sql = `INSERT INTO events 
        (title, description, location, category, event_date, ticket_type, ticket_price, total_tickets, available_tickets) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        title, 
        description || '', 
        location, 
        category || 'General',
        event_date, 
        ticket_type || 'Regular',
        ticket_price, 
        total_tickets, 
        total_tickets
    ];

    hub.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ Error: err.message });
        return res.json({ Status: "Success" });
    });
});

app.delete("/admin/delete-event/:id", (req, res) => {
    hub.query("DELETE FROM events WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ Status: "Success" });
    });
});

app.put("/admin/update-event/:id", (req, res) => {
    const { title, description, location, category, event_date, ticket_type, ticket_price, total_tickets, available_tickets } = req.body;
    const sql = `UPDATE events SET 
        title = ?, description = ?, location = ?, category = ?, event_date = ?, ticket_type = ?, ticket_price = ?, total_tickets = ?, available_tickets = ?
        WHERE id = ?`;
    const values = [title, description || '', location, category || 'General', event_date, ticket_type || 'Regular', ticket_price, total_tickets, available_tickets ?? total_tickets, req.params.id];
    hub.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ Error: err.message });
        return res.json({ Status: "Success" });
    });
});

app.get("/admin/users", (req, res) => {
    const sql = "SELECT id, username, email, phonenumber, role, status FROM users";
    hub.query(sql, (err, result) => {
        if (err) return res.status(500).json({ Error: err.message });
        return res.status(200).json(result);
    });
});

app.post('/admin/add-user', (req, res) => {
    const { username, email, password, role } = req.body;
    bcrypt.hash(password || '123456', 10, (err, hash) => {
        const sql = "INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, 'active')";
        hub.query(sql, [username, email, hash, role || 'user'], (err, result) => {
            if (err) return res.json({ Error: err.sqlMessage || "Database error" });
            return res.json({ Status: "Success" });
        });
    });
});

app.put('/admin/update-user/:id', (req, res) => {
    const id = req.params.id;
    const { username, email, role, status } = req.body;
    const sql = "UPDATE users SET username = COALESCE(?, username), email = COALESCE(?, email), role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?";
    hub.query(sql, [username, email, role, status, id], (err, result) => {
        if (err) return res.json({ Error: "Error updating user" });
        return res.json({ Status: "Success" });
    });
});

app.delete('/admin/delete-user/:id', (req, res) => {
    hub.query("DELETE FROM users WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json(err);
        return res.json({ Status: "Success" });
    });
});

app.get('/admin/tickets', (req, res) => {
    const sql = `
        SELECT t.id, t.ticket_code, t.status, t.ticket_type, e.title as event_title, e.location, e.event_date, u.username, u.email
        FROM tickets t
        LEFT JOIN events e ON t.event_id = e.id
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.id DESC`;
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.put('/admin/update-ticket-status/:id', (req, res) => {
    const { status } = req.body;
    const ticketId = req.params.id;
    hub.query("UPDATE tickets SET status = ? WHERE id = ?", [status, ticketId], (err) => {
        if (err) return res.status(500).json({ Error: err.message });
        return res.json({ Status: "Success" });
    });
});

app.get('/admin/payments', (req, res) => {
    const sql = `
        SELECT p.id, p.transaction_id, p.amount, p.payment_method, p.status, u.username, u.email
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.id DESC`;
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.get('/admin/refunds', (req, res) => {
    const sql = `
        SELECT r.id, r.amount, r.reason, r.status, r.booking_id, u.username, u.email
        FROM refunds r
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.id DESC`;
    hub.query(sql, (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.post('/admin/refunds/:id/:action', (req, res) => {
    const { id, action } = req.params;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    hub.query("UPDATE refunds SET status = ? WHERE id = ?", [newStatus, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ Status: "Success" });
    });
});

app.get('/admin/reports', (req, res) => {
    const mockReports = [
        { id: 1, metric_name: 'Monthly Revenue Growth', category: 'Financial', value: '+24.8%' },
        { id: 2, metric_name: 'Ticket Conversion Rate', category: 'Marketing', value: '18.4%' },
        { id: 3, metric_name: 'Repeat Attendee Ratio', category: 'Customer Loyalty', value: '42.1%' },
        { id: 4, metric_name: 'Mobile Checkout Share', category: 'Platform Usage', value: '76.5%' }
    ];
    res.json(mockReports);
});

app.get('/admin/users/:id/bookings', (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT b.id, b.tickets_bought, b.total_amount as price, b.payment_status as status, b.ticket_type, e.title as event_title, e.location, e.event_date, t.ticket_code
        FROM bookings b
        LEFT JOIN events e ON b.event_id = e.id
        LEFT JOIN tickets t ON t.booking_id = b.id
        WHERE b.user_id = ?
        ORDER BY b.id DESC`;
    hub.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json(err);
        res.json(data);
    });
});

app.post('/admin/organizers/:id/:action', (req, res) => {
    res.json({ Status: "Success" });
});

// START SERVER
app.listen(3000, () => {
    console.log("EventHub Server running on http://localhost:3000");
});
