// Updated api.js
export const fetchWithAuth = async (endpoint, token, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  // Drop the localhost prefix. 
  // The browser will automatically prepend the current domain.
  const res = await fetch(endpoint, { ...options, headers });
  
  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }
  
  return res;
};