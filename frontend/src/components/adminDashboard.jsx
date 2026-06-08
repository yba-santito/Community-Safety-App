import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('activities'); // 'activities', 'announcements', 'crime'
  
  // Data State Arrays
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [crimes, setCrimes] = useState([]);
  
  // Loading & Feedback States
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);

  // Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 1 });

  // 🎭 Active Identity (Using your profile context for testing access)
  const [currentPersona, setCurrentPersona] = useState({ name: 'Mogau Kganana (Super Admin)', id: 'uid_super_789' });
  const personas = [
    { name: 'Mogau Kganana (Super Admin)', id: 'uid_super_789' },
    { name: 'John Doe (Resident)', id: 'uid_resident_123' },
    { name: 'Anonymous Context', id: '' },
  ];

  // Global fetcher depending on which section is viewed
  const loadTabContent = async () => {
    setLoading(true);
    setSystemMessage(null);
    try {
      if (activeTab === 'activities') {
        const res = await fetch('http://localhost:5000/api/activities');
        const result = await res.json();
        setActivities(result.data || []);
      } 
      else if (activeTab === 'announcements') {
        const res = await fetch('http://localhost:5000/api/announcements');
        const result = await res.json();
        setAnnouncements(result.data || []);
      } 
else if (activeTab === 'crime') {
  // This endpoint requires admin credentials
  const res = await fetch('http://localhost:5000/api/admin/crime-spottings', {
    headers: { 'x-user-id': currentPersona.id }
  });
  
  // 🛡️ CRITICAL SAFETIE: Check if the server response failed BEFORE trying to parse JSON
  if (!res.ok) {
    const rawErrorPayload = await res.text();
    
    // If the server dumped an HTML page, give us a clean message instead of crashing
    const parsedErrorMessage = rawErrorPayload.includes('<!DOCTYPE')
      ? `Backend returned an HTML Error Page (Status: ${res.status}). Check terminal logs.`
      : rawErrorPayload;

    throw new Error(parsedErrorMessage);
  }

  // Safe to parse now that we know it's a 200 OK success channel
  const result = await res.json();
  setCrimes(result.data || []);
}
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabContent();
  }, [activeTab, currentPersona]);

  // Handle Activity Verification Action
  const handleVerifyActivity = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/activities/${id}/verify`, {
        method: 'PUT',
        headers: { 'x-user-id': currentPersona.id }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSystemMessage({ type: 'success', text: data.message });
      loadTabContent();
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Dispatching New Announcement Form
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentPersona.id
        },
        body: JSON.stringify(announcementForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSystemMessage({ type: 'success', text: data.message });
      setAnnouncementForm({ title: '', content: '', priority: 1 }); // Clear form
      loadTabContent(); // Refresh list view
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', textAlign: 'left' }}>
      
      {/* HUB TITLE */}
      <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>🛡️ Central Mobile Service Control</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Manage data payloads streaming to the ecosystem</p>
      </div>

      {/* IDENTITY SWITCHER BAR */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}>
        <label style={{ fontWeight: '600', display: 'inline-block', marginRight: '12px' }}>Testing Role Persona:</label>
        <select 
          value={currentPersona.id} 
          onChange={(e) => setCurrentPersona(personas.find(p => p.id === e.target.value))}
          style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }}
        >
          {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* SYSTEM FEEDBACK NOTIFICATIONS */}
      {systemMessage && (
        <div style={{ padding: '12px', borderRadius: '6px', marginBottom: '20px', fontWeight: '500', backgroundColor: systemMessage.type === 'success' ? '#def7ec' : '#fde8e8', color: systemMessage.type === 'success' ? '#03543f' : '#9b1c1c', border: `1px solid ${systemMessage.type === 'success' ? '#bcf0da' : '#f8b4b4'}` }}>
          {systemMessage.text}
        </div>
      )}

      {/* MAIN NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '1px' }}>
        <button onClick={() => setActiveTab('activities')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'activities' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'activities' ? '#2563eb' : '#4b5563' }}>🎯 Youth Activities Queue</button>
        <button onClick={() => setActiveTab('announcements')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'announcements' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'announcements' ? '#2563eb' : '#4b5563' }}>📢 Global Announcements</button>
        <button onClick={() => setActiveTab('crime')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'crime' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'crime' ? '#2563eb' : '#4b5563' }}>🚨 Resident Safety Feed</button>
      </div>

      {/* VIEW LOADER CONTAINER */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>Interrogating database entries...</p>
      ) : (
        <div>
          {/* TAB 1: YOUTH ACTIVITIES */}
          {activeTab === 'activities' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Title</th>
                  <th style={{ padding: '12px' }}>Organization</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(act => (
                  <tr key={act.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{act.title}</td>
                    <td style={{ padding: '12px' }}>{act.organization}</td>
                    <td style={{ padding: '12px', color: act.is_verified ? '#16a34a' : '#d97706' }}>
                      {act.is_verified ? '● Live' : '○ Needs Verification'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {!act.is_verified && <button onClick={() => handleVerifyActivity(act.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Verify & Publish</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: ANNOUNCEMENTS MANAGEMENT */}
          {activeTab === 'announcements' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Creator Form Module */}
              <form onSubmit={handleCreateAnnouncement} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Draft New Mobile Broadcast</h3>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Broadcast Header / Title</label>
                  <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} placeholder="Emergency power utility maintenance..." />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Message Body Content</label>
                  <textarea rows="4" value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} placeholder="Please avoid sector 4 gates due to municipal standard upgrades..." />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Priority Weight Tier</label>
                  <select value={announcementForm.priority} onChange={e => setAnnouncementForm({...announcementForm, priority: parseInt(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }}>
                    <option value={1}>Standard General Info</option>
                    <option value={2}>Elevated / Important Notice</option>
                    <option value={3}>Critical Security Warning</option>
                  </select>
                </div>
                <button type="submit" style={{ width: '100%', backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>Transmit Announcement</button>
              </form>

              {/* Live Targets Monitor */}
              <div>
                <h3 style={{ margin: '0 0 16px 0' }}>Active Mobile Stream Payload</h3>
                {announcements.map(ann => (
                  <div key={ann.id} style={{ backgroundColor: '#fff', borderLeft: `4px solid ${ann.priority === 3 ? '#ef4444' : ann.priority === 2 ? '#f59e0b' : '#3b82f6'}`, padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: '12px', borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 4px 0' }}>{ann.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>{ann.content}</p>
                    <small style={{ color: '#9ca3af', display: 'block', marginTop: '6px' }}>Priority Index: {ann.priority}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RESIDENT SAFETY FEED (CRIME TRACKER) */}
          {activeTab === 'crime' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Incident Class</th>
                  <th style={{ padding: '12px' }}>Details / Description</th>
                  <th style={{ padding: '12px' }}>Location/Context</th>
                  <th style={{ padding: '12px' }}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {crimes.map(crime => (
                  <tr key={crime.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#dc2626' }}>⚠️ {crime.incident_type}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{crime.description}</td>
                    <td style={{ padding: '12px', color: '#4b5563' }}>{crime.location_description || `Coordinates: ${crime.latitude}, ${crime.longitude}`}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        backgroundColor: crime.severity_level === 'High' ? '#fde8e8' : crime.severity_level === 'Medium' ? '#fffbeb' : '#f0fdf4',
                        color: crime.severity_level === 'High' ? '#9b1c1c' : crime.severity_level === 'Medium' ? '#78350f' : '#166534',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {crime.severity_level}
                      </span>
                    </td>
                  </tr>
                ))}
                {crimes.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No incidents currently logged by field nodes. Perimeter clear.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}