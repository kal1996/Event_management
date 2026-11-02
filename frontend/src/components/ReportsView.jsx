import React from 'react';

export const ReportsView = ({ filteredData }) => {
    return (
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
                <thead>
                    <tr><th>Metric Tracked</th><th>Category Label</th><th>Recorded Scale Value</th><th>Status Performance</th></tr>
                </thead>
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
    );
};