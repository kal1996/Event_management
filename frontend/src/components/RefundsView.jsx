import React from 'react';

export const RefundsView = ({ filteredData, handleProcessRefund }) => {
    return (
        <div className="glass-card table-section animate-fade-in">
            <h3>Refund Operations Control Board ({filteredData.length})</h3>
            <table>
                <thead>
                    <tr><th>Dispute ID</th><th>Associated Base Transaction</th><th>Reason Outlined</th><th>Refund Target Value</th><th>State</th><th>Action Execution</th></tr>
                </thead>
                <tbody>
                    {filteredData.map((rf, i) => (
                        <tr key={`${rf.id}-${i}`} className="table-row">
                            <td>#RF-{rf.id}</td>
                            <td><code>{rf.transaction_id || `TXN-REF-${rf.id}`}</code></td>
                            <td>🗣️ *"{rf.reason || 'Event Cancellation Request'}"*</td>
                            <td><strong>${rf.amount || '0.00'}</strong></td>
                            <td><span className={`status-pill ${rf.status || 'pending'}`}>{rf.status || 'pending'}</span></td>
                            <td>
                                {(!rf.status || rf.status === 'pending') ? (
                                    <div style={{display:'flex', gap:'5px'}}>
                                        <button className="primary-btn" style={{padding:'4px 8px', fontSize:'0.8rem', background:'#16a34a'}} onClick={() => handleProcessRefund(rf.id, 'approve')}>Approve</button>
                                        <button className="primary-btn" style={{padding:'4px 8px', fontSize:'0.8rem', background:'#ef4444'}} onClick={() => handleProcessRefund(rf.id, 'reject')}>Reject</button>
                                    </div>
                                ) : <small style={{color:'var(--text-muted)'}}>Settled</small>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};