const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_development_key_123';

const requireLogin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Access denied. Missing token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        if (err) {
            console.error('🛑 [AUTH TOKEN ERROR]:', err.message);
            return res.status(403).json({ error: 'Forbidden: Invalid or expired session.' });
        }

        req.user = decodedPayload;
        next(); 
    });
};

// requireAdmin now assumes requireLogin has ALREADY run successfully
const requireAdmin = (req, res, next) => {
    // Defensively check that req.user exists and grab the role
    const role = req.user?.role;

    if (role === 'admin' || role === 'superadmin') {
        next(); 
    } else {
        res.status(403).json({ error: `Forbidden: Clear access denied. Role '${role || 'unknown'}' lacks privileges.` });
    }
};

module.exports = { requireLogin, requireAdmin };