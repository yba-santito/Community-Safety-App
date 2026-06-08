const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { requireLogin, requireAdmin } = require('./middleware/auth');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allows Express to read incoming JSON data in requests

// Connect to SQLite Database
const dbPath = path.resolve(__dirname, 'community.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite community database.');
    }
});

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Get all youth activities
app.get('/api/activities', (req, res) => {
    const sql = 'SELECT * FROM activities WHERE is_verified = 1 ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 2. Get closest facilities filtered by type (e.g., Park, Hospital)
app.get('/api/facilities', (req, res) => {
    const { type } = req.query; // optional query filter: /api/facilities?type=Hospital
    let sql = 'SELECT * FROM facilities';
    const params = [];

    if (type) {
        sql += ' WHERE facility_type = ?';
        params.push(type);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 3. Post a new Crime Spotting / Safety Alert
app.post('/api/crime-spottings', (req, res) => {
    const { incident_type, description, location_description, latitude, longitude, severity_level } = req.body;
    
    if (!incident_type || !description || !latitude || !longitude) {
        return res.status(400).json({ error: 'Missing required safety details.' });
    }

    const sql = `INSERT INTO crime_spottings (incident_type, description, location_description, latitude, longitude, severity_level, spotted_at) 
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    const params = [incident_type, description, location_description, latitude, longitude, severity_level || 'Medium'];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Safety alert submitted successfully.',
            id: this.lastID
        });
    });
});

// 4. Get active announcements
app.get('/api/announcements', (req, res) => {
    const sql = 'SELECT * FROM announcements ORDER BY priority DESC, created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 6. Create a new announcement (Restricted - Requires Admin)
app.post('/api/admin/announcements', requireAdmin, (req, res) => {
    const { title, content, priority } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: 'Missing title or content for the announcement.' });
    }

    const sql = `INSERT INTO announcements (title, content, priority, created_at) 
                 VALUES (?, ?, ?, datetime('now'))`;
    const params = [title, content, priority || 1];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Announcement broadcasted successfully to the network.',
            id: this.lastID
        });
    });
});

// 7. Get all crime spottings for admin review (Restricted - Requires Admin)
// 🛡️ FIX 1: Added `requireAdmin` here to prevent frontend 404 mismatch
app.get('/api/admin/crime-spottings', requireAdmin, (req, res) => {
    try {
        const sql = 'SELECT * FROM crime_spottings ORDER BY spotted_at DESC';
        
        // If the 'db' reference is closed or corrupt, this line throws a synchronous error instantly
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ data: rows });
        });

    } catch (syncError) {
        // 🛡️ This catches the database panic before Express turns it into an HTML page
        console.error('🔥 Caught a live route crash:', syncError.message);
        
        res.status(500).json({ 
            error: 'The backend engine failed to communicate with the SQLite file.',
            details: syncError.message 
        });
    }
});

app.put('/api/admin/activities/:id/verify', requireAdmin, (req, res) => {
    const { id } = req.params;

    const sql = 'UPDATE activities SET is_verified = 1 WHERE id = ?';
    
    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Check if the record actually existed to be updated
        if (this.changes === 0) {
            return res.status(404).json({ error: `Activity with ID ${id} not found.` });
        }

        res.json({ message: `Activity ID ${id} verified successfully by authorized admin.` });
    });
});


// ==========================================
// SPA FALLBACK CATCH-ALL (Express 5 Compliant)
// ==========================================

// 🛡️ FIX 2: Passing no path string completely bypasses path-to-regexp compilation
app.use((req, res, next) => {
    // 1. If a request reaches this point and starts with /api, it's a dead API endpoint
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API route ${req.originalUrl} not found on this server.` });
    }

    // 2. Otherwise, if it's a page layout request, serve up the React frontend build
    if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
    }

    next();
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`[BOOT] HTTP Server is actively listening on port ${PORT}`);
});

// 1. Catch Network/Port Errors (e.g., Port already in use)
server.on('error', (err) => {
    console.error('🛑 [SERVER ERROR] Network layer crashed:', err);
});

// 2. Catch if the server is commanded to close
server.on('close', () => {
    console.log('⚠️ [SERVER CLOSE] The HTTP server was forcefully shut down.');
});