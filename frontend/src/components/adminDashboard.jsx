import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  // ==========================================
  // AUTHENTICATION STATE
  // ==========================================
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Navigation & Control States
  const [activeTab, setActiveTab] = useState('activities');
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Data Arrays
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [empowermentCenters, setEmpowermentCenters] = useState([]);

  // Unified CRUD Input Form States
  const [activityForm, setActivityForm] = useState({ title: '', organization: '', age_group: '', description: '', location_name: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', priority: 1 });
  const [crimeForm, setCrimeForm] = useState({ incident_type: '', description: '', location_description: '', severity_level: 'Medium' });
  const [centerForm, setCenterForm] = useState({ center_name: '', focus_area: '', address: '', contact_number: '' });

  const clearForms = () => {
    setEditingId(null);
    setActivityForm({ title: '', organization: '', age_group: '', description: '', location_name: '' });
    setAnnouncementForm({ title: '', content: '', priority: 1 });
    setCrimeForm({ incident_type: '', description: '', location_description: '', severity_level: 'Medium' });
    setCenterForm({ center_name: '', focus_area: '', address: '', contact_number: '' });
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    clearForms();
  };

  // ==========================================
  // AUTHENTICATION HANDLERS
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setSystemMessage(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      setToken(data.token);
      localStorage.setItem('adminToken', data.token); // Persist session
      setSystemMessage({ type: 'success', text: 'Authentication successful. Pipeline open.' });
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setSystemMessage(null);
  };

  // Centralized wrapper for authenticated API requests
  const fetchWithAuth = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Inject JWT here
      ...options.headers
    };

    const res = await fetch(url, { ...options, headers });
    
    // Auto-logout if token is expired/invalid
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Session expired or access denied. Please log in again.');
    }
    
    return res;
  };

  // ==========================================
  // DATABASE SYNC ENGINE (READ)
  // ==========================================
  const loadTabContent = async () => {
    if (!token) return; // Don't fetch if not authenticated
    setLoading(true);
    setSystemMessage(null);
    
    try {
      if (activeTab === 'activities') {
        const res = await fetchWithAuth('http://localhost:5000/api/activities');
        const result = await res.json();
        setActivities(result.data || []);
      } 
      else if (activeTab === 'announcements') {
        const res = await fetchWithAuth('http://localhost:5000/api/announcements');
        const result = await res.json();
        setAnnouncements(result.data || []);
      } 
      else if (activeTab === 'crime') {
        const res = await fetchWithAuth('http://localhost:5000/api/admin/crime-spottings');
        const result = await res.json();
        setCrimes(result.data || []);
      }
      else if (activeTab === 'centers') {
        const res = await fetchWithAuth('http://localhost:5000/api/empowerment-centers');
        const result = await res.json();
        setEmpowermentCenters(result.data || []);
      }
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabContent();
  }, [activeTab, token]); // Re-run when tab or auth state changes

  const startEditMode = (item) => {
    setEditingId(item.id);
    if (activeTab === 'activities') setActivityForm({ title: item.title, organization: item.organization, age_group: item.age_group || '', description: item.description || '', location_name: item.location_name });
    if (activeTab === 'announcements') setAnnouncementForm({ title: item.title, content: item.content, priority: item.priority });
    if (activeTab === 'crime') setCrimeForm({ incident_type: item.incident_type, description: item.description, location_description: item.location_description || '', severity_level: item.severity_level });
    if (activeTab === 'centers') setCenterForm({ center_name: item.center_name, focus_area: item.focus_area || '', address: item.address, contact_number: item.contact_number || '' });
  };

  // ==========================================
  // MASTER MUTATION HANDLER (SUBMIT CREATE OR UPDATE)
  // ==========================================
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSystemMessage(null);

    let targetSlug = activeTab === 'crime' ? 'crime-spottings' : activeTab === 'centers' ? 'empowerment-centers' : activeTab;
    let endpoint = `http://localhost:5000/api/admin/${targetSlug}`;
    let method = editingId ? 'PUT' : 'POST';
    if (editingId) endpoint = `${endpoint}/${editingId}`;

    let payload = activeTab === 'activities' ? activityForm : 
                  activeTab === 'announcements' ? announcementForm : 
                  activeTab === 'crime' ? crimeForm : centerForm;

    try {
      const res = await fetchWithAuth(endpoint, {
        method: method,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server rejected operational payload.');

      setSystemMessage({ type: 'success', text: data.message || 'Operation executed successfully.' });
      clearForms();
      loadTabContent(); 
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyActivity = async (id) => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/admin/activities/${id}/verify`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSystemMessage({ type: 'success', text: data.message });
      loadTabContent();
    } catch (err) {
      setSystemMessage({ type: 'error', text: err.message });
    }
  };

  // ==========================================
  // UNAUTHENTICATED VIEW (LOGIN SCREEN)
  // ==========================================
  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '24px' }}>🛡️ Admin Gateway</h2>
          
          {systemMessage && (
            <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: '#fde8e8', color: '#9b1c1c', fontSize: '14px' }}>
              {systemMessage.text}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email Operator ID</label>
            <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Security Cipher (Password)</label>
            <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
          </div>

          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}>
            Authenticate Session
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED VIEW (DASHBOARD)
  // ==========================================
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', textAlign: 'left' }}>
      
      {/* HEADER SECTION */}
      <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🛡️ Central Mobile Service Control</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Manage data payloads streaming to the ecosystem</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
          Terminate Session
        </button>
      </div>

      {/* STATUS TELEMETRY BANNERS */}
      {systemMessage && (
        <div style={{ padding: '12px', borderRadius: '6px', marginBottom: '20px', fontWeight: '500', backgroundColor: systemMessage.type === 'success' ? '#def7ec' : '#fde8e8', color: systemMessage.type === 'success' ? '#03543f' : '#9b1c1c', border: `1px solid ${systemMessage.type === 'success' ? '#bcf0da' : '#f8b4b4'}` }}>
          {systemMessage.text}
          {editingId && <button onClick={clearForms} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}>Cancel Edit</button>}
        </div>
      )}

      {/* CORE NAVIGATION CONTAINER */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '1px' }}>
        <button onClick={() => handleTabChange('activities')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'activities' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'activities' ? '#2563eb' : '#4b5563' }}>🎯 Youth Activities</button>
        <button onClick={() => handleTabChange('announcements')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'announcements' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'announcements' ? '#2563eb' : '#4b5563' }}>📢 Broadcasts</button>
        <button onClick={() => handleTabChange('crime')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'crime' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'crime' ? '#2563eb' : '#4b5563' }}>🚨 Safety Feed</button>
        <button onClick={() => handleTabChange('centers')} style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'centers' ? '3px solid #2563eb' : 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: 'transparent', color: activeTab === 'centers' ? '#2563eb' : '#4b5563' }}>🛠️ Empowerment Centers</button>
      </div>

      {/* WORKING MUTATION SCREEN SPLIT LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: CONTEXTUAL UPSERT FORM PANEL */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>
            {editingId ? '🔄 Restructure Operational Payload' : '🌱 Register New System Resource'}
          </h3>
          
          <form onSubmit={handleFormSubmit}>
            {/* DYNAMIC FORMS CONTEXT INJECTION */}
            {activeTab === 'activities' && (
              <>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Activity Name</label>
                <input type="text" required value={activityForm.title} onChange={e => setActivityForm({...activityForm, title: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Host Organization</label>
                <input type="text" required value={activityForm.organization} onChange={e => setActivityForm({...activityForm, organization: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Target Age Group</label>
                <input type="text" value={activityForm.age_group} onChange={e => setActivityForm({...activityForm, age_group: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} placeholder="e.g. Teens, 6-12 years" /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Venue / Location Name</label>
                <input type="text" required value={activityForm.location_name} onChange={e => setActivityForm({...activityForm, location_name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Brief Description</label>
                <textarea rows="3" value={activityForm.description} onChange={e => setActivityForm({...activityForm, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
              </>
            )}

            {activeTab === 'announcements' && (
              <>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Broadcast Header</label>
                <input type="text" required value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Message Body Content</label>
                <textarea rows="4" required value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Priority Allocation Tier</label>
                <select value={announcementForm.priority} onChange={e => setAnnouncementForm({...announcementForm, priority: parseInt(e.target.value)})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }}>
                  <option value={1}>Standard General Info</option>
                  <option value={2}>Elevated Notice</option>
                  <option value={3}>Critical Security Alert</option>
                </select></div>
              </>
            )}

            {activeTab === 'crime' && (
              <>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Incident Classification Type</label>
                <input type="text" required value={crimeForm.incident_type} onChange={e => setCrimeForm({...crimeForm, incident_type: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} placeholder="e.g. Suspicious Activity, Trespassing" /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Geographic Perimeter / Address Location</label>
                <input type="text" required value={crimeForm.location_description} onChange={e => setCrimeForm({...crimeForm, location_description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Severity Matrix Vector</label>
                <select value={crimeForm.severity_level} onChange={e => setCrimeForm({...crimeForm, severity_level: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }}>
                  <option value="Low">Low Risk Perimeter</option>
                  <option value="Medium">Medium Warning Matrix</option>
                  <option value="High">High Security Threat</option>
                </select></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Detailed Scenario Analysis</label>
                <textarea rows="4" required value={crimeForm.description} onChange={e => setCrimeForm({...crimeForm, description: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
              </>
            )}

            {activeTab === 'centers' && (
              <>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Center Nomenclature Name</label>
                <input type="text" required value={centerForm.center_name} onChange={e => setCenterForm({...centerForm, center_name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Primary Development Focus Area</label>
                <input type="text" required value={centerForm.focus_area} onChange={e => setCenterForm({...centerForm, focus_area: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} placeholder="e.g. Trade Skills, General Mentorship" /></div>
                <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Physical Location / Infrastructure Address</label>
                <input type="text" required value={centerForm.address} onChange={e => setCenterForm({...centerForm, address: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
                <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Contact Telemetry Comms Line</label>
                <input type="text" value={centerForm.contact_number} onChange={e => setCenterForm({...centerForm, contact_number: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827' }} /></div>
              </>
            )}

            <button type="submit" style={{ width: '100%', backgroundColor: editingId ? '#7c3aed' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>
              {editingId ? '⚡ Finalize Server Modifications' : '➕ Transmit Package to Pipeline'}
            </button>
            {editingId && (
              <button type="button" onClick={clearForms} style={{ width: '100%', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', marginTop: '8px' }}>
                Cancel Operational Overhaul
              </button>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: REFRESHING SYSTEM STREAMS DATA VIEWER */}
        <div>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Interrogating system database tables...</p>
          ) : (
            <>
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
                          {act.is_verified ? '● Live Stream' : '○ Pending Audit'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button onClick={() => startEditMode(act)} style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                          {!act.is_verified && <button onClick={() => handleVerifyActivity(act.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Verify</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'announcements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {announcements.map(ann => (
                    <div key={ann.id} style={{ backgroundColor: '#fff', borderLeft: `4px solid ${ann.priority === 3 ? '#ef4444' : ann.priority === 2 ? '#f59e0b' : '#3b82f6'}`, padding: '12px 16px', borderRadius: '0 8px 8px 0', borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
                      <button onClick={() => startEditMode(ann)} style={{ position: 'absolute', right: '12px', top: '12px', backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Modify Payload</button>
                      <h4 style={{ margin: '0 0 4px 0' }}>{ann.title}</h4>
                      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#4b5563', paddingRight: '100px' }}>{ann.content}</p>
                      <small style={{ color: '#9ca3af' }}>Priority Weight Index: {ann.priority}</small>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'crime' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Incident Class</th>
                      <th style={{ padding: '12px' }}>Details / Description</th>
                      <th style={{ padding: '12px' }}>Context Location</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crimes.map(crime => (
                      <tr key={crime.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#dc2626' }}>⚠️ {crime.incident_type}</td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>{crime.description}</td>
                        <td style={{ padding: '12px', color: '#4b5563', fontSize: '13px' }}>{crime.location_description}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button onClick={() => startEditMode(crime)} style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Modify</button>
                        </td>
                      </tr>
                    ))}
                    {crimes.length === 0 && (
                      <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No vector nodes streaming security data. Secure array verified.</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'centers' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Nomenclature Title</th>
                      <th style={{ padding: '12px' }}>Focus Core</th>
                      <th style={{ padding: '12px' }}>Telemetry Line</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empowermentCenters.map(center => (
                      <tr key={center.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#2563eb' }}>🏢 {center.center_name}</td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#7c3aed', fontWeight: '500' }}>{center.focus_area}</td>
                        <td style={{ padding: '12px', color: '#4b5563', fontSize: '13px' }}>{center.contact_number || 'No link config'}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button onClick={() => startEditMode(center)} style={{ backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>Modify</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}