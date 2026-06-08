// src/utils/api.js

export const fetchWithAuth = async (endpoint, token, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const res = await fetch(`http://localhost:5000${endpoint}`, { ...options, headers });
  
  // Intercept expired or invalid tokens automatically
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  
  return res;
};