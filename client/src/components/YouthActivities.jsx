import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';

export default function YouthActivities({ token, onLogout }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', organization: '', age_group: '', description: '', location_name: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/activities', token);
      const result = await res.json();
      setActivities(result.data || []);
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
    const endpoint = editingId ? `/api/admin/activities/${editingId}` : '/api/admin/activities';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(endpoint, token, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemMessage({ type: 'success', text: data.message });
      setEditingId(null);
      setForm({ title: '', organization: '', age_group: '', description: '', location_name: '' });
      loadData();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') onLogout();
      else setSystemMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerify = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/admin/activities/${id}/verify`, token, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSystemMessage({ type: 'success', text: data.message });
      loadData();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') onLogout();
      else setSystemMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>{editingId ? '🔄 Update Activity' : '🌱 Register Activity'}</h3>
        {systemMessage && <div style={{ padding: '8px', marginBottom: '16px', borderRadius: '4px', backgroundColor: systemMessage.type === 'success' ? '#def7ec' : '#fde8e8', color: systemMessage.type === 'success' ? '#03543f' : '#9b1c1c' }}>{systemMessage.text}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Activity Name</label><input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Host Organization</label><input type="text" required value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Target Age Group</label><input type="text" value={form.age_group} onChange={e => setForm({...form, age_group: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Venue Name</label><input type="text" required value={form.location_name} onChange={e => setForm({...form, location_name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Description</label><textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <button type="submit" style={{ width: '100%', backgroundColor: editingId ? '#7c3aed' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>{editingId ? '⚡ Finalize Modifications' : '➕ Transmit Package'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', organization: '', age_group: '', description: '', location_name: '' }); }} style={{ width: '100%', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>Cancel Edit</button>}
        </form>
      </div>

      <div>
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <thead><tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}><th style={{ padding: '12px' }}>Title</th><th style={{ padding: '12px' }}>Organization</th><th style={{ padding: '12px' }}>Status</th><th style={{ padding: '12px', textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {activities.map(act => (
                <tr key={act.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{act.title}</td><td style={{ padding: '12px' }}>{act.organization}</td>
                  <td style={{ padding: '12px', color: act.is_verified ? '#16a34a' : '#d97706' }}>{act.is_verified ? '● Live' : '○ Pending'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditingId(act.id); setForm(act); }} style={{ padding: '6px 10px', cursor: 'pointer' }}>Edit</button>
                    {!act.is_verified && <button onClick={() => handleVerify(act.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', cursor: 'pointer' }}>Verify</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}