const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../community.db');

// Checkpoint 1: Is the user logged in at all?
const requireLogin = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Access denied. Missing user context.' });
    }

    req.userId = userId; 
    next(); 
};

// Checkpoint 2: Is the user authorized as an Admin or Superadmin?
const requireAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Access denied. Missing user context.' });
    }

    // Connect to DB
    const db = new sqlite3.Database(dbPath);

    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, row) => {
        db.close(); 

        // 🛡️ FIX: We must log the ACTUAL database error so we aren't debugging blind
        if (err) {
            console.error('🛑 [AUTH DB ERROR]:', err.message);
            return res.status(500).json({ 
                error: 'Internal Server Error during authorization.',
                details: err.message // Send the real error to the frontend network tab too
            });
        }

        if (!row) {
            return res.status(403).json({ error: 'Forbidden: User identity not found in database.' });
        }

        if (row.role === 'admin' || row.role === 'superadmin') {
            req.userRole = row.role;
            next(); 
        } else {
            res.status(403).json({ error: `Forbidden: Clear access denied. Role '${row.role}' lacks privileges.` });
        }
    });
};

module.exports = { requireLogin, requireAdmin };