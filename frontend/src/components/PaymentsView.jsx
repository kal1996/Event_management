import React from 'react';

export const PaymentsView = ({ filteredData }) => {
    return (
        <div className="glass-card table-section animate-fade-in">
            <h3>Transaction Settlement Audit Book ({filteredData.length})</h3>
            <table>
                <thead>
                    <tr><th>Transaction Identifier</th><th>Payer Details</th><th>Settlement Value</th><th>Gateway Route</th><th>Status</th></tr>
                </thead>
                <tbody>
                    {filteredData.map((pay, i) => (
                        <tr key={`${pay.id}-${i}`} className="table-row">
                            <td><code>{pay.transaction_id || `TXN-8874-${pay.id}`}</code></td>
                            <td><strong>{pay.username || 'Anonymized System Account'}</strong></td>
                            <td><strong style={{color:'#16a34a'}}>${pay.amount || '0.00'}</strong></td>
                            <td><small>{pay.payment_method || 'Stripe / Cards Gateway'}</small></td>
                            <td><span className={`status-pill ${pay.status || 'completed'}`}>{pay.status || 'completed'}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};