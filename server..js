const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});