import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';

export default function SafetyFeedManager({ token, onLogout }) {
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ incident_type: '', description: '', location_description: '', severity_level: 'Medium' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/crime-spottings', token);
      const result = await res.json();
      setCrimes(result.data || []);
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') onLogout();
      else setSystemMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = editingId ? `/api/admin/crime-spottings/${editingId}` : '/api/admin/crime-spottings';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(endpoint, token, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemMessage({ type: 'success', text: data.message });
      setEditingId(null);
      setForm({ incident_type: '', description: '', location_description: '', severity_level: 'Medium' });
      loadData();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') onLogout();
      else setSystemMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>{editingId ? '🔄 Update Incident' : '🚨 Log Incident'}</h3>
        {systemMessage && <div style={{ padding: '8px', marginBottom: '16px', borderRadius: '4px', backgroundColor: systemMessage.type === 'success' ? '#def7ec' : '#fde8e8', color: systemMessage.type === 'success' ? '#03543f' : '#9b1c1c' }}>{systemMessage.text}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Incident Type</label><input type="text" required value={form.incident_type} onChange={e => setForm({...form, incident_type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Location</label><input type="text" required value={form.location_description} onChange={e => setForm({...form, location_description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Severity</label><select value={form.severity_level} onChange={e => setForm({...form, severity_level: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Description</label><textarea rows="3" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <button type="submit" style={{ width: '100%', backgroundColor: editingId ? '#7c3aed' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Save Changes' : 'Submit Alert'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ incident_type: '', description: '', location_description: '', severity_level: 'Medium' }); }} style={{ width: '100%', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>Cancel Edit</button>}
        </form>
      </div>

      <div>
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <thead><tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}><th style={{ padding: '12px' }}>Class</th><th style={{ padding: '12px' }}>Description</th><th style={{ padding: '12px' }}>Location</th><th style={{ padding: '12px', textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {crimes.map(crime => (
                <tr key={crime.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#dc2626' }}>⚠️ {crime.incident_type}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{crime.description}</td><td style={{ padding: '12px', color: '#4b5563', fontSize: '13px' }}>{crime.location_description}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}><button onClick={() => { setEditingId(crime.id); setForm(crime); }} style={{ padding: '6px 10px', cursor: 'pointer' }}>Modify</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}