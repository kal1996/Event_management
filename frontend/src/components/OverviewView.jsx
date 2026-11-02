import React from 'react';

export default function OverviewView({ metrics, filteredData, handleApproveOrganizer }) {
    return (
        <div className="animate-fade-in">
            {/* Analytical Top Aggregates */}
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

            {/* Informational Lower Grid Components */}
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
                                <button 
                                    className="btn-approve" 
                                    onClick={() => handleApproveOrganizer(101, 'approve')}
                                    title="Approve Verification"
                                >
                                    ✓
                                </button>
                                <button 
                                    className="btn-reject" 
                                    onClick={() => handleApproveOrganizer(101, 'reject')}
                                    title="Reject Verification"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}