import React from 'react';

export const TicketsView = ({ filteredData, handleUpdateUser }) => {
    return (
        <div className="glass-card table-section animate-fade-in">
            <h3>Issued System Tickets Control Deck ({filteredData.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>Ticket ID Code</th>
                        <th>Event</th>
                        <th>Holder Account</th>
                        <th>Validation Status</th>
                        <th>Action Execution</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData.map((tk, i) => (
                        <tr key={`${tk.id}-${i}`} className="table-row">
                            <td>
                                <code className="ticket-code-badge">
                                    {tk.ticket_code || `TK-00${tk.id}`}
                                </code>
                            </td>
                            <td><strong>{tk.event_title || 'N/A'}</strong></td>
                            <td>{tk.username || 'Guest user'}<br/><small>{tk.email}</small></td>
                            <td><span className={`status-pill ${tk.status || 'valid'}`}>{tk.status || 'valid'}</span></td>
                            <td>
                                <button 
                                    className="btn-icon status" 
                                    onClick={() => handleUpdateUser(tk.id, 'status', tk.status === 'revoked' ? 'valid' : 'revoked')}
                                >
                                    {tk.status === 'revoked' ? '🔄 Restore' : '🚫 Revoke'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};