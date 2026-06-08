import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';

export default function CentersManager({ token, onLogout }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ center_name: '', focus_area: '', address: '', contact_number: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/empowerment-centers', token);
      const result = await res.json();
      setCenters(result.data || []);
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
    const endpoint = editingId ? `/api/admin/empowerment-centers/${editingId}` : '/api/admin/empowerment-centers';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(endpoint, token, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSystemMessage({ type: 'success', text: data.message });
      setEditingId(null);
      setForm({ center_name: '', focus_area: '', address: '', contact_number: '' });
      loadData();
    } catch (err) {
      if (err.message === 'AUTH_EXPIRED') onLogout();
      else setSystemMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>{editingId ? '🔄 Update Center' : '🛠️ Register Center'}</h3>
        {systemMessage && <div style={{ padding: '8px', marginBottom: '16px', borderRadius: '4px', backgroundColor: systemMessage.type === 'success' ? '#def7ec' : '#fde8e8', color: systemMessage.type === 'success' ? '#03543f' : '#9b1c1c' }}>{systemMessage.text}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Center Name</label><input type="text" required value={form.center_name} onChange={e => setForm({...form, center_name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Focus Area</label><input type="text" required value={form.focus_area} onChange={e => setForm({...form, focus_area: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Address</label><input type="text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Contact Info</label><input type="text" value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }} /></div>
          <button type="submit" style={{ width: '100%', backgroundColor: editingId ? '#7c3aed' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Finalize Modifications' : 'Transmit Package'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ center_name: '', focus_area: '', address: '', contact_number: '' }); }} style={{ width: '100%', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>Cancel Edit</button>}
        </form>
      </div>

      <div>
        {loading ? <p>Loading...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <thead><tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}><th style={{ padding: '12px' }}>Name</th><th style={{ padding: '12px' }}>Focus</th><th style={{ padding: '12px' }}>Contact</th><th style={{ padding: '12px', textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {centers.map(center => (
                <tr key={center.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#2563eb' }}>🏢 {center.center_name}</td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#7c3aed' }}>{center.focus_area}</td><td style={{ padding: '12px', color: '#4b5563', fontSize: '13px' }}>{center.contact_number}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}><button onClick={() => { setEditingId(center.id); setForm(center); }} style={{ padding: '6px 10px', cursor: 'pointer' }}>Modify</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}