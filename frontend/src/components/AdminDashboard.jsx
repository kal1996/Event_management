import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NightDayToggle from './NightDayToggle';
import './AdminDashboard.css';

export default function AdminDashboard() {
    // Controlled states for full administrative oversight
    const [view, setView] = useState('overview'); // Set default view to overview
    const [dataList, setDataList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // User Booking History Modal/Drawer Sub-states
    const [selectedUser, setSelectedUser] = useState(null);
    const [userBookingHistory, setUserBookingHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Interactive Profile Configurator Sub-states
    const [activeEditProfile, setActiveEditProfile] = useState(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Global Tickets Filter & Inspection Sub-states
    const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
    const [ticketTierFilter, setTicketTierFilter] = useState('all');
    const [inspectTicket, setInspectTicket] = useState(null);

    // Payments Ledger Filter & Inspection Sub-states
    const [paymentGatewayFilter, setPaymentGatewayFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [inspectPayment, setInspectPayment] = useState(null);

    // Refunds Desk Filter & Inspection Sub-states
    const [refundStatusFilter, setRefundStatusFilter] = useState('all');
    const [inspectRefund, setInspectRefund] = useState(null);

    // Events Control Filter & Modal Sub-states
    const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
    const [eventAvailabilityFilter, setEventAvailabilityFilter] = useState('all');
    const [editEventModal, setEditEventModal] = useState(null);

    // Users Directory Filter Sub-states
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userStatusFilter, setUserStatusFilter] = useState('all');

    // Admin Self Profile Settings State
    const [adminProfile, setAdminProfile] = useState({
        username: localStorage.getItem('username') || 'Super Admin',
        email: localStorage.getItem('email') || 'admin@eventhub.com',
        phonenumber: '+251911001122',
        password: '',
        confirmPassword: ''
    });
    const [adminProfileMsg, setAdminProfileMsg] = useState('');
    const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);

    // Overview Metrics State
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        totalOrganizers: 0,
        totalEvents: 0,
        ticketsSold: 0,
        totalRevenue: 0
    });

    // Core event formulation setup
    const initialEventForm = {
        title: '', 
        description: '', 
        location: '', 
        event_date: '', 
        ticket_type: 'Regular',
        ticket_price: '', 
        total_tickets: ''
    };
    const [eventForm, setEventForm] = useState(initialEventForm);

    // Synchronize lookup contextual shifts
    useEffect(() => {
        setSearchTerm('');
        setSelectedUser(null);
        setActiveEditProfile(null);
        setInspectTicket(null);
        setInspectPayment(null);
        setInspectRefund(null);
        setEditEventModal(null);
        if (view === 'overview') {
            loadOverviewMetrics();
        } else if (view !== 'profile') {
            loadData();
        }
    }, [view]);

    // Fetch analytical aggregates for the dashboard overview
    const loadOverviewMetrics = () => {
        axios.get('http://localhost:3000/admin/dashboard-summary')
            .then(res => {
                if (res.data) {
                    setMetrics({
                        totalUsers: res.data.totalUsers || 0,
                        totalOrganizers: res.data.totalOrganizers || 0,
                        totalEvents: res.data.totalEvents || 0,
                        ticketsSold: res.data.ticketsSold || 0,
                        totalRevenue: res.data.totalRevenue || 0
                    });
                    setDataList(Array.isArray(res.data.recentBookings) ? res.data.recentBookings : []);
                }
            })
            .catch(err => {
                console.error("Error fetching overview summaries:", err);
            });
    };

    // Dynamic resource loader routing endpoints
    const loadData = () => {
        const endpoints = {
            events: 'events',
            users: 'users',
            tickets: 'tickets',
            payments: 'payments',
            reports: 'reports',
            refunds: 'refunds'
        };

        if (!endpoints[view]) return;
        
        axios.get(`http://localhost:3000/admin/${endpoints[view]}`)
            .then(res => {
                setDataList(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => {
                console.error(`Fetch error on ${view}:`, err);
                setDataList([]);
            });
    };

    // Fetch details for specific user booking histories
    const handleViewBookingHistory = (user) => {
        setSelectedUser(user);
        setIsLoadingHistory(true);
        setUserBookingHistory([]);
        
        axios.get(`http://localhost:3000/admin/users/${user.id}/bookings`)
            .then(res => {
                setUserBookingHistory(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => {
                console.error("Error fetching user booking records:", err);
                setUserBookingHistory([]);
            })
            .finally(() => {
                setIsLoadingHistory(false);
            });
    };

    // --- Action Handlers ---
    const handleUpdateUser = (id, field, value) => {
        axios.put(`http://localhost:3000/admin/update-user/${id}`, { [field]: value })
            .then(res => { if (res.data.Status === "Success") loadData(); })
            .catch(err => console.error("Update error:", err));
    };

    const handleToggleTicketStatus = (ticketId, currentStatus) => {
        const newStatus = currentStatus === 'revoked' ? 'valid' : 'revoked';
        axios.put(`http://localhost:3000/admin/update-ticket-status/${ticketId}`, { status: newStatus })
            .then(res => {
                if (res.data.Status === "Success") {
                    loadData();
                    if (inspectTicket && inspectTicket.id === ticketId) {
                        setInspectTicket(prev => prev ? { ...prev, status: newStatus } : null);
                    }
                } else {
                    alert("Ticket status update failed.");
                }
            })
            .catch(err => {
                console.error("Error updating ticket status:", err);
                setDataList(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
                if (inspectTicket && inspectTicket.id === ticketId) {
                    setInspectTicket(prev => prev ? { ...prev, status: newStatus } : null);
                }
            });
    };

    const handleSaveEditEvent = (e) => {
        e.preventDefault();
        if (!editEventModal) return;
        axios.put(`http://localhost:3000/admin/update-event/${editEventModal.id}`, editEventModal)
            .then(res => {
                if (res.data.Status === "Success") {
                    alert("Event updated successfully!");
                    loadData();
                    setEditEventModal(null);
                } else {
                    alert("Error updating event.");
                }
            })
            .catch(err => {
                console.error("Error updating event:", err);
                setDataList(prev => prev.map(ev => ev.id === editEventModal.id ? editEventModal : ev));
                setEditEventModal(null);
            });
    };

    // Launch the interactive profile panel
    const handleStartInteractiveEdit = (user) => {
        setSaveSuccess(false);
        setActiveEditProfile({ ...user });
    };

    // Save interactive profile changes with dynamic visual state tracking
    const handleSaveInteractiveProfile = (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setSaveSuccess(false);

        axios.put(`http://localhost:3000/admin/update-user/${activeEditProfile.id}`, {
            username: activeEditProfile.username,
            email: activeEditProfile.email,
            role: activeEditProfile.role,
            status: activeEditProfile.status
        })
            .then(res => {
                if (res.data.Status === "Success") {
                    setSaveSuccess(true);
                    loadData();
                    setTimeout(() => {
                        setActiveEditProfile(null);
                        setSaveSuccess(false);
                    }, 1200);
                } else {
                    alert("Failed to update user profile information.");
                }
            })
            .catch(err => console.error("Profile update execution error:", err))
            .finally(() => {
                setIsSavingProfile(false);
            });
    };

    // Save Admin's Own Profile Settings
    const handleSaveAdminProfile = (e) => {
        e.preventDefault();
        setAdminProfileMsg('');

        if (adminProfile.password && adminProfile.password !== adminProfile.confirmPassword) {
            setAdminProfileMsg('❌ Passwords do not match');
            return;
        }

        setIsSavingAdminProfile(true);
        const userId = localStorage.getItem('userId') || 1;

        axios.put(`http://localhost:3000/user/update-profile/${userId}`, {
            username: adminProfile.username,
            phonenumber: adminProfile.phonenumber,
            password: adminProfile.password || undefined
        })
        .then(res => {
            if (res.data.Status === "Success") {
                localStorage.setItem('username', adminProfile.username);
                setAdminProfileMsg('✨ Admin Profile Settings Updated Successfully!');
                setTimeout(() => setAdminProfileMsg(''), 3000);
            } else {
                setAdminProfileMsg('❌ Update failed: ' + (res.data.Error || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error("Profile update error:", err);
            setAdminProfileMsg('❌ Server error during profile update');
        })
        .finally(() => setIsSavingAdminProfile(false));
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());

        axios.post('http://localhost:3000/admin/add-user', userData)
            .then(res => {
                if (res.data.Status === "Success") {
                    alert("User added successfully!");
                    loadData();
                    e.target.reset();
                } else {
                    alert("Error: " + res.data.Error);
                }
            })
            .catch(err => console.error(err));
    };

    const handleCreateEvent = (e) => {
        e.preventDefault();
        axios.post('http://localhost:3000/admin/add-event', eventForm)
            .then(res => {
                if(res.data.Status === "Success") {
                    alert("Event Published with Custom Ticket Rules!");
                    loadData();
                    setEventForm(initialEventForm);
                }
            })
            .catch(err => console.error(err));
    };

    const handleDelete = (id) => {
        if (window.confirm(`Are you sure you want to delete this item from ${view}?`)) {
            axios.delete(`http://localhost:3000/admin/delete-${view.slice(0,-1)}/${id}`)
                .then(res => { if (res.data.Status === "Success") loadData(); })
                .catch(err => alert("Delete target failed execution"));
        }
    };

    const handleProcessRefund = (id, action) => {
        if (window.confirm(`Confirm action [${action.toUpperCase()}] on refund item #${id}?`)) {
            axios.post(`http://localhost:3000/admin/refunds/${id}/${action}`)
                .then(res => { 
                    if (res.data.Status === "Success") {
                        loadData(); 
                        if (inspectRefund && inspectRefund.id === id) {
                            setInspectRefund(prev => prev ? { ...prev, status: action === 'approve' ? 'approved' : 'rejected' } : null);
                        }
                    }
                })
                .catch(err => console.error(err));
        }
    };

    const handleApproveOrganizer = (id, action) => {
        axios.post(`http://localhost:3000/admin/organizers/${id}/${action}`)
            .then(res => { if (res.data.Status === "Success") loadOverviewMetrics(); })
            .catch(err => console.error("Approval flow failure:", err));
    };

    // Unified context search system & filters
    const filteredData = dataList.filter(item => {
        const query = searchTerm.toLowerCase();
        const matchesQuery = (
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.username && item.username.toLowerCase().includes(query)) ||
            (item.ticket_code && item.ticket_code.toLowerCase().includes(query)) ||
            (item.transaction_id && item.transaction_id.toLowerCase().includes(query)) ||
            (item.metric_name && item.metric_name.toLowerCase().includes(query)) ||
            (item.customer_name && item.customer_name.toLowerCase().includes(query)) ||
            (item.email && item.email.toLowerCase().includes(query)) ||
            (item.event_title && item.event_title.toLowerCase().includes(query)) ||
            (item.payment_method && item.payment_method.toLowerCase().includes(query)) ||
            (item.reason && item.reason.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query))
        );

        if (view === 'events') {
            const matchesCat = eventCategoryFilter === 'all' || item.category === eventCategoryFilter;
            const isSoldOut = (item.available_tickets ?? item.total_tickets) <= 0;
            const matchesAvail = eventAvailabilityFilter === 'all' || 
                                 (eventAvailabilityFilter === 'instock' && !isSoldOut) ||
                                 (eventAvailabilityFilter === 'soldout' && isSoldOut);
            return matchesQuery && matchesCat && matchesAvail;
        }

        if (view === 'users') {
            const matchesRole = userRoleFilter === 'all' || item.role === userRoleFilter;
            const currentStatus = item.status || 'active';
            const matchesStatus = userStatusFilter === 'all' || currentStatus === userStatusFilter;
            return matchesQuery && matchesRole && matchesStatus;
        }

        if (view === 'tickets') {
            const currentStatus = item.status || 'valid';
            const matchesStatus = ticketStatusFilter === 'all' || currentStatus === ticketStatusFilter;
            const matchesTier = ticketTierFilter === 'all' || item.ticket_type === ticketTierFilter;
            return matchesQuery && matchesStatus && matchesTier;
        }

        if (view === 'payments') {
            const currentMethod = item.payment_method || 'Credit Card';
            const currentStatus = item.status || 'completed';
            const matchesGateway = paymentGatewayFilter === 'all' || currentMethod.toLowerCase().includes(paymentGatewayFilter.toLowerCase());
            const matchesStatus = paymentStatusFilter === 'all' || currentStatus === paymentStatusFilter;
            return matchesQuery && matchesGateway && matchesStatus;
        }

        if (view === 'refunds') {
            const currentStatus = item.status || 'pending';
            const matchesStatus = refundStatusFilter === 'all' || currentStatus === refundStatusFilter;
            return matchesQuery && matchesStatus;
        }

        return matchesQuery;
    });

    // Events Analytics Metrics
    const eventMetrics = {
        total: dataList.length,
        totalSeats: dataList.reduce((sum, e) => sum + parseInt(e.total_tickets || 0), 0),
        soldOutCount: dataList.filter(e => (e.available_tickets ?? e.total_tickets) <= 0).length,
        avgPrice: dataList.length > 0 ? (dataList.reduce((sum, e) => sum + parseFloat(e.ticket_price || 0), 0) / dataList.length).toFixed(2) : 0
    };

    // Users Directory Analytics Metrics
    const userMetrics = {
        total: dataList.length,
        active: dataList.filter(u => (u.status || 'active') === 'active').length,
        adminsStaff: dataList.filter(u => u.role === 'admin' || u.role === 'staff').length,
        blocked: dataList.filter(u => u.status === 'deactivated' || u.status === 'blocked').length
    };

    // Global Tickets Analytics Metrics
    const ticketMetrics = {
        total: dataList.length,
        valid: dataList.filter(t => (t.status || 'valid') === 'valid').length,
        revoked: dataList.filter(t => t.status === 'revoked').length,
        premium: dataList.filter(t => t.ticket_type === 'VIP' || t.ticket_type === 'VVIP').length
    };

    // Payments Ledger Financial Analytics Metrics
    const paymentMetrics = {
        totalRevenue: dataList.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        settledCount: dataList.filter(p => (p.status || 'completed') === 'completed').length,
        avgOrderValue: dataList.length > 0 ? (dataList.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) / dataList.length).toFixed(2) : 0,
        telebirrVolume: dataList.filter(p => p.payment_method === 'Telebirr').length
    };

    // Refunds Desk Operations Metrics
    const refundMetrics = {
        totalClaims: dataList.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
        pendingCount: dataList.filter(r => (!r.status || r.status === 'pending')).length,
        approvedTotal: dataList.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
        rejectedCount: dataList.filter(r => r.status === 'rejected').length
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="admin-layout">
            {/* Sidebar Navigation */}
            <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>Event<span>Hub</span></div>
                    <button className="mobile-close-sidebar" onClick={() => setIsSidebarOpen(false)}>✕</button>
                </div>
                <nav className="sidebar-nav">
                    <div className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => { setView('overview'); setIsSidebarOpen(false); }}>🎛️ Dashboard Overview</div>
                    <div className={`nav-item ${view === 'events' ? 'active' : ''}`} onClick={() => { setView('events'); setIsSidebarOpen(false); }}>📅 Events Control</div>
                    <div className={`nav-item ${view === 'tickets' ? 'active' : ''}`} onClick={() => { setView('tickets'); setIsSidebarOpen(false); }}>🎟️ Global Tickets</div>
                    <div className={`nav-item ${view === 'users' ? 'active' : ''}`} onClick={() => { setView('users'); setIsSidebarOpen(false); }}>👥 Users Directory</div>
                    <div className={`nav-item ${view === 'payments' ? 'active' : ''}`} onClick={() => { setView('payments'); setIsSidebarOpen(false); }}>💳 Payments Ledger</div>
                    <div className={`nav-item ${view === 'refunds' ? 'active' : ''}`} onClick={() => { setView('refunds'); setIsSidebarOpen(false); }}>🔄 Refunds Desk</div>
                    <div className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => { setView('reports'); setIsSidebarOpen(false); }}>📊 Intelligence Reports</div>
                    <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { setView('profile'); setIsSidebarOpen(false); }}>⚙️ Profile Settings</div>
                </nav>
                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={() => { localStorage.clear(); window.location.href = '/login'; }}>Logout</button>
                </div>
            </aside>

            {/* Central Work Space */}
            <div className="main-container">
                <header className="top-bar">
                    <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle Sidebar Menu">
                        ☰
                    </button>
                    <div className="search-box">
                        <input type="text" placeholder={`Search across dashboard Context: ${view}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <NightDayToggle />
                        <div className="admin-profile" onClick={() => setView('profile')} style={{ cursor: 'pointer' }} title="Manage Admin Profile">
                            <div className="avatar">👑</div>
                            <div className="profile-text">
                                <span className="admin-name">{adminProfile.username}</span>
                                <span className="admin-role">Super Admin</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="dashboard-content">
                    
                    {/* --- 0. OVERVIEW VIEW --- */}
                    {view === 'overview' && (
                        <div className="animate-fade-in">
                            <div className="metrics-grid">
                                <div className="metric-card card-users">
                                    <small>TOTAL USERS</small>
                                    <h2>{metrics.totalUsers}</h2>
                                </div>
                                <div className="metric-card card-organizers">
                                    <small>TOTAL ORGANIZERS</small>
                                    <h2>{metrics.totalOrganizers}</h2>
                                </div>
                                <div className="metric-card card-events">
                                    <small>TOTAL LIVE EVENTS</small>
                                    <h2>{metrics.totalEvents}</h2>
                                </div>
                                <div className="metric-card card-tickets">
                                    <small>TICKETS SOLD</small>
                                    <h2>{metrics.ticketsSold} Units</h2>
                                </div>
                                <div className="metric-card card-revenue">
                                    <small>TOTAL REVENUE</small>
                                    <h2>${metrics.totalRevenue.toLocaleString()}</h2>
                                </div>
                            </div>

                            <div className="view-flex">
                                <div className="glass-card table-section table-flex-primary">
                                    <h3>Recent Platform Bookings</h3>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Event Title</th>
                                                <th>Price Paid</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="table-empty-state">
                                                        No active recent bookings found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredData.map((booking, idx) => (
                                                    <tr key={`b-${booking.id}-${idx}`} className="table-row">
                                                        <td><strong>{booking.customer_name || 'Guest User'}</strong></td>
                                                        <td>{booking.event_title || 'Event Reference Link'}</td>
                                                        <td>${booking.price || '0.00'}</td>
                                                        <td><span className="status-pill active">Confirmed</span></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="glass-card table-section table-flex-secondary">
                                    <h3>Pending Verification Approvals</h3>
                                    <div className="approvals-list">
                                        <div className="approval-card">
                                            <div className="approval-info">
                                                <strong>TechCorp Organizers</strong>
                                                <small>Request Type: Corporate Host</small>
                                            </div>
                                            <div className="approval-actions">
                                                <button className="btn-approve" onClick={() => handleApproveOrganizer(101, 'approve')} title="Approve Verification">✓</button>
                                                <button className="btn-reject" onClick={() => handleApproveOrganizer(101, 'reject')} title="Reject Verification">✕</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- 1. EVENTS CONTROL VIEW --- */}
                    {view === 'events' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Analytics Summary Banner Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL LIVE EVENTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#1e293b' }}>{eventMetrics.total} Events</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL SEAT INVENTORY</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#059669' }}>{eventMetrics.totalSeats} Seats</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>SOLD OUT EVENTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#dc2626' }}>{eventMetrics.soldOutCount} Sold Out</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>AVG TICKET PRICE</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#6d28d9' }}>${eventMetrics.avgPrice}</h2>
                                </div>
                            </div>

                            <div className="view-flex">
                                <div className="glass-card form-section">
                                    <h3>Create New Event</h3>
                                    <form className="modern-form" onSubmit={handleCreateEvent}>
                                        <div className="form-row">
                                            <input type="text" placeholder="Event Title" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} required/>
                                            <input type="text" placeholder="Location" value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} required/>
                                        </div>
                                        <div className="form-row">
                                            <input type="datetime-local" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} required/>
                                            <select className="modern-select" value={eventForm.ticket_type} onChange={e => setEventForm({...eventForm, ticket_type: e.target.value})}>
                                                <option value="Regular">Regular Tier</option>
                                                <option value="VIP">VIP Tier</option>
                                                <option value="VVIP">VVIP Tier</option>
                                                <option value="Early Bird">Early Bird Discount</option>
                                            </select>
                                        </div>
                                        <div className="form-row">
                                            <input type="number" placeholder="Ticket Price ($)" value={eventForm.ticket_price} onChange={e => setEventForm({...eventForm, ticket_price: e.target.value})} required/>
                                            <input type="number" placeholder="Total Availability" value={eventForm.total_tickets} onChange={e => setEventForm({...eventForm, total_tickets: e.target.value})} required/>
                                        </div>
                                        <button type="submit" className="primary-btn">Publish Event</button>
                                    </form>
                                </div>
                                
                                <div className="glass-card table-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3>Live Sales & Inventory Monitoring ({filteredData.length})</h3>
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                        {['all', 'Tech & Innovation', 'Concert & Music', 'Sports & Fitness', 'Culture & Arts', 'Business & Corporate'].map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => setEventCategoryFilter(cat)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '99px',
                                                    border: '1px solid',
                                                    borderColor: eventCategoryFilter === cat ? '#6366f1' : '#cbd5e1',
                                                    background: eventCategoryFilter === cat ? '#eef2ff' : '#fff',
                                                    color: eventCategoryFilter === cat ? '#4f46e5' : '#475569',
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {cat === 'all' ? 'All Categories' : cat}
                                            </button>
                                        ))}
                                    </div>

                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Event Details</th>
                                                <th>Type</th>
                                                <th>Availability Status</th>
                                                <th>Price</th>
                                                <th>Action Execution</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((ev, i) => (
                                                <tr key={`${ev.id}-${i}`} className="table-row">
                                                    <td><strong>{ev.title}</strong><br/><small>{ev.location}</small></td>
                                                    <td><span className={`tier-badge ${ev.ticket_type || 'Regular'}`}>{ev.ticket_type || 'Regular'}</span></td>
                                                    <td>
                                                        <div className="inventory-count">
                                                            {ev.available_tickets ?? ev.total_tickets} left / {ev.total_tickets} total
                                                        </div>
                                                        <small className={`event-tracking-status ${(ev.available_tickets <= 0) ? 'sold-out' : 'tracking-active'}`}>
                                                            {(ev.available_tickets <= 0) ? "🔴 SOLD OUT" : `🟢 Tracking Active`}
                                                        </small>
                                                    </td>
                                                    <td>${ev.ticket_price}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            <button 
                                                                className="btn-icon" 
                                                                onClick={() => setEditEventModal(ev)}
                                                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                                            >
                                                                ⚙️ Edit
                                                            </button>
                                                            <button className="btn-del" onClick={() => handleDelete(ev.id)}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* INTERACTIVE EVENT EDITOR MODAL */}
                            {editEventModal && (
                                <div className="modal-overlay" onClick={() => setEditEventModal(null)}>
                                    <div className="modal-card animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: '#fff', borderRadius: '16px', padding: '2rem' }}>
                                        <button className="modal-close-btn" onClick={() => setEditEventModal(null)}>✕</button>

                                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                                            <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>📅 Configure Event: {editEventModal.title}</h3>
                                        </div>

                                        <form onSubmit={handleSaveEditEvent} className="modern-form">
                                            <div className="form-row">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>EVENT TITLE</label>
                                                    <input type="text" value={editEventModal.title} onChange={e => setEditEventModal({ ...editEventModal, title: e.target.value })} required />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>LOCATION / VENUE</label>
                                                    <input type="text" value={editEventModal.location} onChange={e => setEditEventModal({ ...editEventModal, location: e.target.value })} required />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>TICKET TIER</label>
                                                    <select className="modern-select" value={editEventModal.ticket_type || 'Regular'} onChange={e => setEditEventModal({ ...editEventModal, ticket_type: e.target.value })}>
                                                        <option value="Regular">Regular Tier</option>
                                                        <option value="VIP">VIP Tier</option>
                                                        <option value="VVIP">VVIP Tier</option>
                                                        <option value="Early Bird">Early Bird Discount</option>
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>TICKET PRICE ($)</label>
                                                    <input type="number" value={editEventModal.ticket_price} onChange={e => setEditEventModal({ ...editEventModal, ticket_price: e.target.value })} required />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>AVAILABLE SEATS</label>
                                                    <input type="number" value={editEventModal.available_tickets ?? editEventModal.total_tickets} onChange={e => setEditEventModal({ ...editEventModal, available_tickets: e.target.value })} required />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>TOTAL SEATS CAPACITY</label>
                                                    <input type="number" value={editEventModal.total_tickets} onChange={e => setEditEventModal({ ...editEventModal, total_tickets: e.target.value })} required />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                                                <button type="button" onClick={() => setEditEventModal(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                                <button type="submit" className="primary-btn" style={{ padding: '10px 22px' }}>💾 Save Event Changes</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- 2. GLOBAL TICKETS CONTROL DECK VIEW --- */}
                    {view === 'tickets' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Analytics Summary Banner Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL ISSUED PASSES</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#1e293b' }}>{ticketMetrics.total} Units</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>ACTIVE VALID PASSES</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#059669' }}>{ticketMetrics.valid} Valid</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>REVOKED / VOID PASSES</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#dc2626' }}>{ticketMetrics.revoked} Revoked</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>PREMIUM TIERS (VIP/VVIP)</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#d97706' }}>{ticketMetrics.premium} Passes</h2>
                                </div>
                            </div>

                            {/* Ticket Control Toolbar & Filter Pills */}
                            <div className="glass-card" style={{ padding: '1.25rem', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    
                                    {/* Status Filter Tabs */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>STATUS:</span>
                                        {[
                                            { id: 'all', label: 'All Statuses' },
                                            { id: 'valid', label: '🟢 Valid Passes' },
                                            { id: 'revoked', label: '🚫 Revoked' }
                                        ].map(tab => (
                                            <button 
                                                key={tab.id}
                                                onClick={() => setTicketStatusFilter(tab.id)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '99px',
                                                    border: '1px solid',
                                                    borderColor: ticketStatusFilter === tab.id ? '#4f46e5' : '#cbd5e1',
                                                    background: ticketStatusFilter === tab.id ? '#eef2ff' : '#fff',
                                                    color: ticketStatusFilter === tab.id ? '#4f46e5' : '#475569',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tier Filter Dropdown Pills */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>TIER:</span>
                                        {['all', 'Regular', 'VIP', 'VVIP', 'Early Bird'].map(tier => (
                                            <button 
                                                key={tier}
                                                onClick={() => setTicketTierFilter(tier)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid',
                                                    borderColor: ticketTierFilter === tier ? '#2563eb' : '#cbd5e1',
                                                    background: ticketTierFilter === tier ? '#eff6ff' : '#fff',
                                                    color: ticketTierFilter === tier ? '#2563eb' : '#475569',
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {tier === 'all' ? 'All Tiers' : tier}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Global Tickets Master Data Table */}
                            <div className="glass-card table-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3>Issued System Tickets Master Deck ({filteredData.length})</h3>
                                    {(ticketStatusFilter !== 'all' || ticketTierFilter !== 'all' || searchTerm) && (
                                        <button 
                                            onClick={() => { setTicketStatusFilter('all'); setTicketTierFilter('all'); setSearchTerm(''); }}
                                            style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                        >
                                            Reset Filters ✕
                                        </button>
                                    )}
                                </div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ticket ID Code</th>
                                            <th>Target Event Title</th>
                                            <th>Holder Account</th>
                                            <th>Tier</th>
                                            <th>Validation Status</th>
                                            <th>Pass Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.length === 0 ? (
                                            <tr className="table-row">
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                                    No tickets matching the current filter parameters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((tk, i) => {
                                                const currentStatus = tk.status || 'valid';

                                                return (
                                                    <tr key={`${tk.id}-${i}`} className="table-row">
                                                        <td>
                                                            <code className="ticket-code-badge" style={{ fontSize: '0.9rem', padding: '6px 10px' }}>
                                                                {tk.ticket_code || `TK-00${tk.id}`}
                                                            </code>
                                                        </td>
                                                        <td>
                                                            <strong>{tk.event_title || 'Event Pass Reference'}</strong>
                                                            {tk.location && <br/>}<small style={{ color: '#64748b' }}>{tk.location}</small>
                                                        </td>
                                                        <td>
                                                            <strong>{tk.username || 'Attendee Account'}</strong>
                                                            <br/><small style={{ color: '#64748b' }}>{tk.email}</small>
                                                        </td>
                                                        <td>
                                                            <span className={`tier-badge ${tk.ticket_type || 'Regular'}`}>
                                                                {tk.ticket_type || 'Regular'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${currentStatus}`}>
                                                                {currentStatus === 'valid' ? '🟢 VALID' : '🚫 REVOKED'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <button 
                                                                    className="btn-icon" 
                                                                    onClick={() => setInspectTicket(tk)}
                                                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
                                                                    title="Inspect Ticket Pass QR & Details"
                                                                >
                                                                    👁️ Inspect Pass
                                                                </button>
                                                                
                                                                <button 
                                                                    className="btn-icon status" 
                                                                    onClick={() => handleToggleTicketStatus(tk.id, currentStatus)}
                                                                    style={{ padding: '5px 10px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '700' }}
                                                                >
                                                                    {currentStatus === 'revoked' ? '🔄 Restore' : '🚫 Revoke'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- INTERACTIVE ADMIN TICKET INSPECTOR MODAL --- */}
                            {inspectTicket && (
                                <div className="modal-overlay" onClick={() => setInspectTicket(null)}>
                                    <div className="modal-card ticket-pass-modal animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                                        <button className="modal-close-btn" onClick={() => setInspectTicket(null)}>✕</button>

                                        <div className="digital-ticket-stub printable-area" style={{ background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                                                <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif' }}>🎟️ Official Ticket Inspection Pass</h3>
                                                <span className={`status-pill ${inspectTicket.status || 'valid'}`} style={{ fontSize: '0.85rem' }}>
                                                    {(inspectTicket.status || 'valid').toUpperCase()}
                                                </span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1.5rem', alignItems: 'center' }}>
                                                {/* Simulated Scannable QR Graphic */}
                                                <div style={{ textAlign: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                    <svg width="110" height="110" viewBox="0 0 100 100">
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
                                                        <rect x="38" y="38" width="14" height="14" fill="#0f172a" />
                                                        <rect x="60" y="38" width="8" height="8" fill="#0f172a" />
                                                        <rect x="75" y="48" width="12" height="12" fill="#0f172a" />
                                                        <rect x="55" y="75" width="12" height="12" fill="#0f172a" />
                                                    </svg>
                                                    <code style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '6px', color: '#4f46e5' }}>
                                                        {inspectTicket.ticket_code || `TK-00${inspectTicket.id}`}
                                                    </code>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>EVENT TITLE</small>
                                                        <p style={{ margin: '2px 0 0 0', fontWeight: '700', color: '#0f172a' }}>{inspectTicket.event_title || 'N/A'}</p>
                                                    </div>

                                                    <div>
                                                        <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>TICKET TIER</small>
                                                        <p style={{ margin: '2px 0 0 0' }}>
                                                            <span className={`tier-badge ${inspectTicket.ticket_type || 'Regular'}`}>
                                                                {inspectTicket.ticket_type || 'Regular'}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>HOLDER NAME</small>
                                                        <p style={{ margin: '2px 0 0 0', fontWeight: '600', color: '#334155' }}>{inspectTicket.username || 'Attendee'}</p>
                                                    </div>

                                                    <div>
                                                        <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>HOLDER EMAIL</small>
                                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#475569' }}>{inspectTicket.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '1.5rem' }}>
                                            <button 
                                                onClick={() => window.print()}
                                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                🖨️ Print Ticket Summary
                                            </button>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button 
                                                    onClick={() => handleToggleTicketStatus(inspectTicket.id, inspectTicket.status || 'valid')}
                                                    style={{ 
                                                        background: (inspectTicket.status || 'valid') === 'revoked' ? '#10b981' : '#ef4444', 
                                                        color: '#fff', 
                                                        border: 'none', 
                                                        padding: '10px 20px', 
                                                        borderRadius: '8px', 
                                                        fontWeight: '700', 
                                                        cursor: 'pointer' 
                                                    }}
                                                >
                                                    {(inspectTicket.status || 'valid') === 'revoked' ? '🔄 Restore Pass' : '🚫 Revoke Pass'}
                                                </button>

                                                <button 
                                                    onClick={() => setInspectTicket(null)}
                                                    style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Close Inspector
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- 3. USERS DIRECTORY VIEW --- */}
                    {view === 'users' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Analytics Summary Banner Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL REGISTERED ACCOUNTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#1e293b' }}>{userMetrics.total} Users</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>ACTIVE MEMBER ACCOUNTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#059669' }}>{userMetrics.active} Active</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>ADMIN & STAFF ROLES</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#6d28d9' }}>{userMetrics.adminsStaff} Admins</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>BLOCKED ACCOUNTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#dc2626' }}>{userMetrics.blocked} Blocked</h2>
                                </div>
                            </div>

                            <div className="view-flex">
                                <div className="glass-card form-section" style={{ flex: '1 1 350px' }}>
                                    <h3>Add New User</h3>
                                    <form className="modern-form" onSubmit={handleCreateUser}>
                                        <input type="text" name="username" placeholder="Username" required />
                                        <input type="email" name="email" placeholder="Email" required />
                                        <div className="form-row">
                                            <select name="role" className="modern-select">
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="staff">Staff</option>
                                            </select>
                                            <input type="password" name="password" placeholder="Password" required />
                                        </div>
                                        <button type="submit" className="primary-btn">Create Account</button>
                                    </form>
                                </div>

                                <div className="glass-card table-section" style={{ flex: '2 1 600px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3>User Directory ({filteredData.length})</h3>
                                    </div>

                                    {/* Role & Status Filter Pills */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                                        {['all', 'user', 'staff', 'admin'].map(r => (
                                            <button 
                                                key={r}
                                                onClick={() => setUserRoleFilter(r)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '99px',
                                                    border: '1px solid',
                                                    borderColor: userRoleFilter === r ? '#4f46e5' : '#cbd5e1',
                                                    background: userRoleFilter === r ? '#eef2ff' : '#fff',
                                                    color: userRoleFilter === r ? '#4f46e5' : '#475569',
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {r === 'all' ? 'All Roles' : r}
                                            </button>
                                        ))}
                                    </div>

                                    <table>
                                        <thead><tr><th>User Info</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {filteredData.map((user, i) => (
                                                <tr key={`${user.id}-${i}`} className="table-row" style={{ background: activeEditProfile?.id === user.id ? '#eef2ff' : 'transparent' }}>
                                                    <td>
                                                        <div>
                                                            <strong>{user.username}</strong>
                                                            <br/><small>{user.email}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold', color: '#4f46e5' }}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td><span className={`status-pill ${user.status || 'active'}`}>{user.status || 'active'}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <button title="Configure Profile via Workspace" className="btn-icon" style={{ background: activeEditProfile?.id === user.id ? '#4f46e5' : '#fff', color: activeEditProfile?.id === user.id ? '#fff' : '#000', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => handleStartInteractiveEdit(user)}>
                                                                ⚙️ Configure
                                                            </button>
                                                            <button title="View Booking History" className="btn-icon" style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px' }} onClick={() => handleViewBookingHistory(user)}>
                                                                📜 History
                                                            </button>
                                                            <button className="btn-del" onClick={() => handleDelete(user.id)}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* --- INTERACTIVE PROFILE CONFIGURATOR WORKSPACE PANEL --- */}
                            {activeEditProfile && (
                                <div className="glass-card animate-fade-in" style={{ borderTop: '4px solid #3b82f6', background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>👤 Interactive Profile Workspace:</span> 
                                                <span style={{ color: '#2563eb' }}>{activeEditProfile.username}</span>
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Direct synchronization workspace for managing access parameters, security properties, and general credentials.</p>
                                        </div>
                                        <button onClick={() => setActiveEditProfile(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    </div>

                                    <form onSubmit={handleSaveInteractiveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>ACCOUNT USERNAME</label>
                                            <input type="text" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} value={activeEditProfile.username} onChange={e => setActiveEditProfile({...activeEditProfile, username: e.target.value})} required />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>EMAIL ADDRESS</label>
                                            <input type="email" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} value={activeEditProfile.email} onChange={e => setActiveEditProfile({...activeEditProfile, email: e.target.value})} required />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>SYSTEM ROLE PROFILE</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {['user', 'staff', 'admin'].map(r => (
                                                    <button key={r} type="button" onClick={() => setActiveEditProfile({...activeEditProfile, role: r})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: activeEditProfile.role === r ? '#2563eb' : '#cbd5e1', background: activeEditProfile.role === r ? '#eff6ff' : '#fff', color: activeEditProfile.role === r ? '#2563eb' : '#475569', fontWeight: 'bold', textTransform: 'capitalize', cursor: 'pointer' }}>
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>ACCOUNT LIFECYCLE STATUS</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {['active', 'deactivated'].map(s => (
                                                    <button key={s} type="button" onClick={() => setActiveEditProfile({...activeEditProfile, status: s})} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid', borderColor: activeEditProfile.status === s ? (s === 'active' ? '#10b981' : '#ef4444') : '#cbd5e1', background: activeEditProfile.status === s ? (s === 'active' ? '#ecfdf5' : '#fef2f2') : '#fff', color: activeEditProfile.status === s ? (s === 'active' ? '#059669' : '#dc2626') : '#475569', fontWeight: 'bold', textTransform: 'capitalize', cursor: 'pointer' }}>
                                                        {s === 'active' ? '🟢 Active' : '🚫 Blocked'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                                            <button type="submit" disabled={isSavingProfile} style={{ background: saveSuccess ? '#10b981' : '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isSavingProfile ? '🔄 Syncing Changes...' : saveSuccess ? '✨ Synchronized Successfully!' : '💾 Commit Adjustments'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Dynamic Booking History Workspace Drawer */}
                            {selectedUser && (
                                <div className="glass-card table-section animate-fade-in" style={{ borderTop: '4px solid #4f46e5', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>Booking History: <span style={{ color: '#4f46e5' }}>{selectedUser.username}</span></h3>
                                            <small style={{ color: '#64748b' }}>Account Email: {selectedUser.email}</small>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Close History</button>
                                    </div>

                                    {isLoadingHistory ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Querying platform records...</div>
                                    ) : userBookingHistory.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                                            No active or previous booking records found for this user account.
                                        </div>
                                    ) : (
                                        <table style={{ background: '#fff' }}>
                                            <thead>
                                                <tr>
                                                    <th>Booking Reference</th>
                                                    <th>Event Title</th>
                                                    <th>Event Date</th>
                                                    <th>Ticket Details</th>
                                                    <th>Amount Paid</th>
                                                    <th>Booking Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userBookingHistory.map((booking, index) => (
                                                    <tr key={`history-${booking.id || index}`} className="table-row">
                                                        <td><code>{booking.ticket_code || `BK-${booking.id || 'N/A'}`}</code></td>
                                                        <td><strong>{booking.event_title || booking.title}</strong><br/><small style={{color:'#64748b'}}>{booking.location}</small></td>
                                                        <td>{booking.event_date ? new Date(booking.event_date).toLocaleDateString() : 'N/A'}</td>
                                                        <td><span className={`tier-badge ${booking.ticket_type || 'Regular'}`}>{booking.ticket_type || 'Regular'}</span></td>
                                                        <td><strong>${booking.price || booking.amount || '0.00'}</strong></td>
                                                        <td><span className={`status-pill ${booking.status || 'confirmed'}`}>{booking.status || 'confirmed'}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- 4. PAYMENTS LEDGER VIEW --- */}
                    {view === 'payments' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Analytics Summary Banner Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL PROCESSED VOLUME</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#059669' }}>${paymentMetrics.totalRevenue.toLocaleString()}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>SETTLED TRANSACTIONS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#1e293b' }}>{paymentMetrics.settledCount} Settled</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>AVERAGE ORDER VALUE</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#6d28d9' }}>${paymentMetrics.avgOrderValue}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TELEBIRR GATEWAY VOLUME</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#d97706' }}>{paymentMetrics.telebirrVolume} Transactions</h2>
                                </div>
                            </div>

                            {/* Payments Control Toolbar & Filter Pills */}
                            <div className="glass-card" style={{ padding: '1.25rem', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    
                                    {/* Gateway Filter Tabs */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>GATEWAY:</span>
                                        {['all', 'Telebirr', 'Chapa', 'Credit Card', 'Bank Transfer'].map(gw => (
                                            <button 
                                                key={gw}
                                                onClick={() => setPaymentGatewayFilter(gw)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '99px',
                                                    border: '1px solid',
                                                    borderColor: paymentGatewayFilter === gw ? '#10b981' : '#cbd5e1',
                                                    background: paymentGatewayFilter === gw ? '#ecfdf5' : '#fff',
                                                    color: paymentGatewayFilter === gw ? '#059669' : '#475569',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {gw === 'all' ? 'All Gateways' : gw}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Status Filter Tabs */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>STATUS:</span>
                                        {[
                                            { id: 'all', label: 'All' },
                                            { id: 'completed', label: '🟢 Completed' },
                                            { id: 'pending', label: '⏳ Pending' }
                                        ].map(st => (
                                            <button 
                                                key={st.id}
                                                onClick={() => setPaymentStatusFilter(st.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid',
                                                    borderColor: paymentStatusFilter === st.id ? '#4f46e5' : '#cbd5e1',
                                                    background: paymentStatusFilter === st.id ? '#eef2ff' : '#fff',
                                                    color: paymentStatusFilter === st.id ? '#4f46e5' : '#475569',
                                                    fontWeight: '600',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Payments Master Data Table */}
                            <div className="glass-card table-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3>Transaction Settlement Audit Book ({filteredData.length})</h3>
                                    {(paymentGatewayFilter !== 'all' || paymentStatusFilter !== 'all' || searchTerm) && (
                                        <button 
                                            onClick={() => { setPaymentGatewayFilter('all'); setPaymentStatusFilter('all'); setSearchTerm(''); }}
                                            style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                        >
                                            Reset Filters ✕
                                        </button>
                                    )}
                                </div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Transaction ID</th>
                                            <th>Payer Details</th>
                                            <th>Settlement Value</th>
                                            <th>Gateway Route</th>
                                            <th>Status</th>
                                            <th>Receipt Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.length === 0 ? (
                                            <tr className="table-row">
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                                    No financial records found matching current query parameters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((pay, i) => {
                                                const txnId = pay.transaction_id || `TXN-8874-${pay.id}`;
                                                const currentStatus = pay.status || 'completed';

                                                return (
                                                    <tr key={`${pay.id}-${i}`} className="table-row">
                                                        <td>
                                                            <code style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                                                                {txnId}
                                                            </code>
                                                        </td>
                                                        <td>
                                                            <strong>{pay.username || 'Attendee Account'}</strong>
                                                            <br/><small style={{ color: '#64748b' }}>{pay.email}</small>
                                                        </td>
                                                        <td>
                                                            <strong style={{ color: '#16a34a', fontSize: '1.05rem' }}>
                                                                ${pay.amount || '0.00'}
                                                            </strong>
                                                        </td>
                                                        <td>
                                                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontWeight: '600', fontSize: '0.82rem' }}>
                                                                💳 {pay.payment_method || 'Credit Card Gateway'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${currentStatus}`}>
                                                                {currentStatus === 'completed' ? '🟢 SETTLED' : '⏳ PENDING'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button 
                                                                className="btn-icon" 
                                                                onClick={() => setInspectPayment(pay)}
                                                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
                                                                title="Inspect Payment Audit Receipt"
                                                            >
                                                                👁️ Inspect Receipt
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- INTERACTIVE ADMIN PAYMENT RECEIPT INSPECTOR MODAL --- */}
                            {inspectPayment && (
                                <div className="modal-overlay" onClick={() => setInspectPayment(null)}>
                                    <div className="modal-card animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: '#fff', borderRadius: '16px', padding: '2rem' }}>
                                        <button className="modal-close-btn" onClick={() => setInspectPayment(null)}>✕</button>

                                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.5rem', textAlignment: 'center' }}>
                                            <div style={{ color: '#10b981', fontSize: '2rem', marginBottom: '4px' }}>💳</div>
                                            <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: '#0f172a' }}>Payment Settlement Audit Receipt</h3>
                                            <small style={{ color: '#64748b' }}>Reference ID: {inspectPayment.transaction_id || `TXN-8874-${inspectPayment.id}`}</small>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>PAYER ACCOUNT</small>
                                                    <p style={{ margin: '2px 0 0 0', fontWeight: '700', color: '#0f172a' }}>{inspectPayment.username || 'Attendee'}</p>
                                                    <small style={{ color: '#64748b' }}>{inspectPayment.email}</small>
                                                </div>

                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>PAYMENT METHOD</small>
                                                    <p style={{ margin: '2px 0 0 0', fontWeight: '700', color: '#059669' }}>💳 {inspectPayment.payment_method || 'Credit Card'}</p>
                                                </div>

                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>AMOUNT SETTLED</small>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>
                                                        ${inspectPayment.amount || '0.00'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>TRANSACTION STATUS</small>
                                                    <p style={{ margin: '6px 0 0 0' }}>
                                                        <span className="status-pill completed">🟢 SETTLED & VERIFIED</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                            <button 
                                                onClick={() => window.print()}
                                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                🖨️ Print Official Receipt
                                            </button>

                                            <button 
                                                onClick={() => setInspectPayment(null)}
                                                style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                Close Receipt
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- 5. REFUNDS DESK VIEW --- */}
                    {view === 'refunds' && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            
                            {/* Analytics Summary Banner Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL DISPUTE VALUE</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#dc2626' }}>${refundMetrics.totalClaims.toLocaleString()}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>PENDING REVIEW DISPUTES</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#d97706' }}>{refundMetrics.pendingCount} Cases</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>APPROVED REIMBURSEMENTS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#059669' }}>${refundMetrics.approvedTotal.toLocaleString()}</h2>
                                </div>
                                <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #64748b', background: '#fff' }}>
                                    <small style={{ color: 'var(--text-muted)', fontWeight: '700' }}>REJECTED DISPUTE CLAIMS</small>
                                    <h2 style={{ fontSize: '1.8rem', marginTop: '0.4rem', color: '#475569' }}>{refundMetrics.rejectedCount} Settled</h2>
                                </div>
                            </div>

                            {/* Refunds Control Toolbar & Filter Pills */}
                            <div className="glass-card" style={{ padding: '1.25rem', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    
                                    {/* Status Filter Tabs */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginRight: '4px' }}>DISPUTE STATUS:</span>
                                        {[
                                            { id: 'all', label: 'All Disputes' },
                                            { id: 'pending', label: '⏳ Pending Review' },
                                            { id: 'approved', label: '🟢 Approved' },
                                            { id: 'rejected', label: '🔴 Rejected' }
                                        ].map(st => (
                                            <button 
                                                key={st.id}
                                                onClick={() => setRefundStatusFilter(st.id)}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '99px',
                                                    border: '1px solid',
                                                    borderColor: refundStatusFilter === st.id ? '#ef4444' : '#cbd5e1',
                                                    background: refundStatusFilter === st.id ? '#fef2f2' : '#fff',
                                                    color: refundStatusFilter === st.id ? '#dc2626' : '#475569',
                                                    fontWeight: '700',
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Refunds Operations Master Table */}
                            <div className="glass-card table-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3>Refund Operations Control Board ({filteredData.length})</h3>
                                    {(refundStatusFilter !== 'all' || searchTerm) && (
                                        <button 
                                            onClick={() => { setRefundStatusFilter('all'); setSearchTerm(''); }}
                                            style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                        >
                                            Reset Filters ✕
                                        </button>
                                    )}
                                </div>

                                <table>
                                    <thead>
                                        <tr>
                                            <th>Dispute ID</th>
                                            <th>Associated Base Transaction</th>
                                            <th>Reason & Customer Statement</th>
                                            <th>Refund Target Value</th>
                                            <th>State</th>
                                            <th>Action Execution</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.length === 0 ? (
                                            <tr className="table-row">
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                                    No refund records matching current search or status filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((rf, i) => {
                                                const currentStatus = rf.status || 'pending';

                                                return (
                                                    <tr key={`${rf.id}-${i}`} className="table-row">
                                                        <td>
                                                            <strong style={{ color: '#ef4444' }}>#RF-{rf.id}</strong>
                                                        </td>
                                                        <td>
                                                            <code>{rf.transaction_id || `TXN-REF-${rf.id}`}</code>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                                                                🗣️ *"{rf.reason || 'Event Cancellation Request'}"*
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <strong style={{ color: '#1e293b', fontSize: '1.05rem' }}>
                                                                ${rf.amount || '0.00'}
                                                            </strong>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${currentStatus}`}>
                                                                {currentStatus === 'pending' ? '⏳ PENDING' : currentStatus === 'approved' ? '🟢 APPROVED' : '🔴 REJECTED'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                <button 
                                                                    className="btn-icon"
                                                                    onClick={() => setInspectRefund(rf)}
                                                                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                                                    title="Review Full Dispute Details"
                                                                >
                                                                    👁️ Case Details
                                                                </button>

                                                                {(!rf.status || rf.status === 'pending') ? (
                                                                    <>
                                                                        <button 
                                                                            className="primary-btn" 
                                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#16a34a' }} 
                                                                            onClick={() => handleProcessRefund(rf.id, 'approve')}
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                        <button 
                                                                            className="primary-btn" 
                                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#ef4444' }} 
                                                                            onClick={() => handleProcessRefund(rf.id, 'reject')}
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <small style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Settled</small>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- INTERACTIVE ADMIN DISPUTE REVIEW MODAL --- */}
                            {inspectRefund && (
                                <div className="modal-overlay" onClick={() => setInspectRefund(null)}>
                                    <div className="modal-card animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: '#fff', borderRadius: '16px', padding: '2rem' }}>
                                        <button className="modal-close-btn" onClick={() => setInspectRefund(null)}>✕</button>

                                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                                            <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', color: '#0f172a' }}>
                                                🔄 Refund Dispute Case: <span style={{ color: '#ef4444' }}>#RF-{inspectRefund.id}</span>
                                            </h3>
                                            <small style={{ color: '#64748b' }}>Associated Transaction: {inspectRefund.transaction_id || `TXN-REF-${inspectRefund.id}`}</small>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>REASON & CUSTOMER STATEMENT</small>
                                                <p style={{ margin: '6px 0 0 0', fontSize: '1rem', fontStyle: 'italic', color: '#1e293b', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    "{inspectRefund.reason || 'Event Cancellation Request'}"
                                                </p>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1rem' }}>
                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>REFUND AMOUNT REQUESTED</small>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#ef4444' }}>
                                                        ${inspectRefund.amount || '0.00'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <small style={{ color: '#64748b', fontWeight: '700', fontSize: '0.75rem' }}>CURRENT DISPUTE STATE</small>
                                                    <p style={{ margin: '6px 0 0 0' }}>
                                                        <span className={`status-pill ${inspectRefund.status || 'pending'}`}>
                                                            {((inspectRefund.status || 'pending')).toUpperCase()}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                            <button 
                                                onClick={() => window.print()}
                                                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                            >
                                                🖨️ Print Dispute Log
                                            </button>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {(!inspectRefund.status || inspectRefund.status === 'pending') && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleProcessRefund(inspectRefund.id, 'approve')}
                                                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                                        >
                                                            ✓ Approve Refund
                                                        </button>
                                                        <button 
                                                            onClick={() => handleProcessRefund(inspectRefund.id, 'reject')}
                                                            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                                        >
                                                            ✕ Reject Claim
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => setInspectRefund(null)}
                                                    style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Close Review
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* --- 6. REPORTS VIEW --- */}
                    {view === 'reports' && (
                        <div className="glass-card table-section animate-fade-in">
                            <h3>Analytics Metric Reports Engine</h3>
                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'1.5rem', marginBottom:'2rem', marginTop: '1rem'}}>
                                <div style={{background: '#eef2ff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #4f46e5'}}>
                                    <small style={{color: 'var(--text-muted)'}}>SYSTEM GROSS REVENUE</small>
                                    <h2 style={{fontSize:'2rem', marginTop:'0.5rem', color:'#1e293b'}}>$142,380</h2>
                                </div>
                                <div style={{background: '#ecfdf5', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #10b981'}}>
                                    <small style={{color: 'var(--text-muted)'}}>AGGREGATED TICKETS SOLD</small>
                                    <h2 style={{fontSize:'2rem', marginTop:'0.5rem', color:'#1e293b'}}>3,849 Units</h2>
                                </div>
                                <div style={{background: '#fef2f2', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #ef4444'}}>
                                    <small style={{color: 'var(--text-muted)'}}>OPEN DISPUTE RATE</small>
                                    <h2 style={{fontSize:'2rem', marginTop:'0.5rem', color:'#1e293b'}}>0.42 %</h2>
                                </div>
                            </div>
                            <h3>Aggregated Live Event Metrics</h3>
                            <table>
                                <thead><tr><th>Metric Tracked</th><th>Category Label</th><th>Recorded Scale Value</th><th>Status Performance</th></tr></thead>
                                <tbody>
                                    {filteredData.length === 0 ? (
                                        <tr className="table-row"><td colSpan="4" style={{textAlign:'center', color:'var(--text-muted)'}}>No localized metric models loaded. Defaulting system aggregate logs.</td></tr>
                                    ) : filteredData.map((rp, i) => (
                                        <tr key={`${rp.id}-${i}`} className="table-row">
                                            <td><strong>{rp.metric_name || 'Event Engagement Ratio'}</strong></td>
                                            <td>{rp.category || 'System Performance'}</td>
                                            <td>{rp.value || '94.2%'}</td>
                                            <td><span className="status-pill active">Optimal</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* --- 7. PROFILE SETTINGS VIEW --- */}
                    {view === 'profile' && (
                        <div className="glass-card animate-fade-in" style={{ maxWidth: '750px' }}>
                            <h3>⚙️ Admin Profile & Account Settings</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                Update your administrative display name, contact details, and security credentials.
                            </p>

                            {adminProfileMsg && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem',
                                    fontWeight: '700',
                                    background: adminProfileMsg.includes('❌') ? '#fef2f2' : '#ecfdf5',
                                    color: adminProfileMsg.includes('❌') ? '#dc2626' : '#059669',
                                    border: adminProfileMsg.includes('❌') ? '1px solid #fecaca' : '1px solid #a7f3d0'
                                }}>
                                    {adminProfileMsg}
                                </div>
                            )}

                            <form onSubmit={handleSaveAdminProfile} className="modern-form">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>ADMIN DISPLAY NAME</label>
                                        <input 
                                            type="text" 
                                            value={adminProfile.username} 
                                            onChange={e => setAdminProfile({ ...adminProfile, username: e.target.value })} 
                                            required 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>SYSTEM EMAIL ADDRESS (READ-ONLY)</label>
                                        <input 
                                            type="email" 
                                            value={adminProfile.email} 
                                            disabled 
                                            style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>PHONE NUMBER</label>
                                        <input 
                                            type="text" 
                                            value={adminProfile.phonenumber} 
                                            onChange={e => setAdminProfile({ ...adminProfile, phonenumber: e.target.value })} 
                                            required 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>NEW PASSWORD (OPTIONAL)</label>
                                        <input 
                                            type="password" 
                                            placeholder="Leave blank to keep current password" 
                                            value={adminProfile.password} 
                                            onChange={e => setAdminProfile({ ...adminProfile, password: e.target.value })} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>CONFIRM NEW PASSWORD</label>
                                        <input 
                                            type="password" 
                                            placeholder="Confirm new password" 
                                            value={adminProfile.confirmPassword} 
                                            onChange={e => setAdminProfile({ ...adminProfile, confirmPassword: e.target.value })} 
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem' }}>
                                    <button type="submit" className="primary-btn" disabled={isSavingAdminProfile} style={{ padding: '12px 28px' }}>
                                        {isSavingAdminProfile ? '🔄 Saving Changes...' : '💾 Save Profile Settings'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}
