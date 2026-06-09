import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SystemOverview({ token, onLogout }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/telemetry', token);
        const result = await res.json();
        setTelemetry(result.data);
      } catch (err) {
        if (err.message === 'AUTH_EXPIRED') onLogout();
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, [token, onLogout]);

  if (loading) return <p style={{ color: '#6b7280' }}>Calibrating system telemetry...</p>;
  if (error) return <div style={{ color: '#9b1c1c', padding: '12px', backgroundColor: '#fde8e8', borderRadius: '4px' }}>Failed to load dashboard: {error}</div>;
  if (!telemetry) return null;

  // Process data for Recharts format
  const severityMap = { Low: 0, Medium: 0, High: 0 };
  telemetry.crime_distribution.forEach(item => {
    severityMap[item.severity_level] = item.count;
  });

  const chartData = [
    { name: 'Low Risk', Incidents: severityMap.Low, fill: '#3b82f6' },
    { name: 'Medium Warning', Incidents: severityMap.Medium, fill: '#f59e0b' },
    { name: 'High Threat', Incidents: severityMap.High, fill: '#ef4444' },
  ];

  return (
    <div>
      {/* KPI CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderTop: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Verified Activities</h4>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{telemetry.metrics.activities}</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderTop: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Active Broadcasts</h4>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{telemetry.metrics.broadcasts}</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderTop: '4px solid #8b5cf6' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Empowerment Centers</h4>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>{telemetry.metrics.centers}</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderTop: '4px solid #ef4444' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px', textTransform: 'uppercase' }}>Total Safety Alerts</h4>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
            {telemetry.crime_distribution.reduce((acc, curr) => acc + curr.count, 0)}
          </span>
        </div>
      </div>

      {/* CHART ROW */}
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#111827', textAlign: 'center' }}>Incident Severity Matrix</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip cursor={{fill: 'transparent'}} />
              <Legend />
              {/* The 'fill' property maps to the colors defined in our chartData array */}
              <Bar dataKey="Incidents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}