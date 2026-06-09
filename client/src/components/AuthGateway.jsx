// src/components/AuthGateway.jsx
import React, { useState } from 'react';

export default function AuthGateway({ onLoginSuccess }) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
    const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginForm)
});
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLoginSuccess(data.token); // Send token to parent
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui' }}>
      <form onSubmit={handleLogin} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '24px' }}>🛡️ Admin Gateway</h2>
        
        {errorMsg && (
          <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '4px', backgroundColor: '#fde8e8', color: '#9b1c1c', fontSize: '14px' }}>
            {errorMsg}
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