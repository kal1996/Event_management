import React from 'react';

export default function EventsView({ eventForm, setEventForm, handleCreateEvent, filteredData, handleDelete, initialEventForm }) {
    return (
        <div className="view-flex animate-fade-in">
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
                <h3>Live Sales & Inventory Monitoring ({filteredData.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Event Details</th>
                            <th>Type</th>
                            <th>Availability Status</th>
                            <th>Price</th>
                            <th>Action</th>
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
                                <td><button className="btn-del" onClick={() => handleDelete(ev.id)}>🗑️</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}