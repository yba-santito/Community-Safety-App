const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../community.db');

// Checkpoint 1: Is the user logged in at all?
const requireLogin = (req, res, next) => {
    // We intercept a temporary custom header for tracking identity until Firebase is linked
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Access denied. Missing user context.' });
    }

    req.userId = userId; // Attach the identifier to the request context
    next(); // Pass control to the next function
};

// Checkpoint 2: Is the user authorized as an Admin or Superadmin?
const requireAdmin = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Access denied. Missing user context.' });
    }

    const db = new sqlite3.Database(dbPath);

    // Look up the user's role directly in our SQLite database
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, row) => {
        db.close(); // Always close database handles immediately to avoid leaks

        if (err) {
            return res.status(500).json({ error: 'Internal Server Error during authorization.' });
        }

        if (!row) {
            return res.status(403).json({ error: 'Forbidden: User identity not found.' });
        }

        // Evaluate if the profile holds adequate operational clearance
        if (row.role === 'admin' || row.role === 'superadmin') {
            req.userRole = row.role;
            next(); // Clear access checkpoint! Proceed to the route handler.
        } else {
            res.status(403).json({ error: `Forbidden: Clear access denied. Role '${row.role}' lacks privileges.` });
        }
    });
};

module.exports = { requireLogin, requireAdmin };