require('dotenv').config(); 

const express = require('express');
// Drop-in replacement for sqlite3 that talks to Turso
const sqlite3 = require('@libsql/sqlite3').verbose(); 
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_development_key_123';

// ==========================================
// 1. INITIALIZE MIDDLEWARE
// ==========================================
// Restrict CORS in production: { origin: 'http://localhost:3000' }
app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'build')));
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// ==========================================
// 2. CONNECT TO SQLITE DATABASE
// ==========================================
const connectionString = tursoUrl && tursoToken
    ? `${tursoUrl}?authToken=${tursoToken}`
    : path.resolve(__dirname, 'community.db');

const db = new sqlite3.Database(connectionString, (err) => {
    if (err) {
        console.error('🛑 Error opening database:', err.message);
    } else {
        const mode = tursoUrl ? 'Turso Cloud (Ohio)' : 'Local File';
        console.log(`✅ Connected to the database via [${mode}].`);
        // Enforce WAL mode for live concurrency
        db.run('PRAGMA journal_mode = WAL;');
    }
});

// ==========================================
// CENTRAL CUSTOM SECURITY MIDDLEWARE
// ==========================================
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

const requireAdmin = (req, res, next) => {
    requireLogin(req, res, () => {
        const role = req.user && req.user.role;
        if (role === 'admin' || role === 'superadmin') {
            next(); 
        } else {
            res.status(403).json({ error: `Forbidden: Clear access denied. Role '${role}' lacks privileges.` });
        }
    });
};

// ==========================================
// SECURE AUTHENTICATION INFRASTRUCTURE
// ==========================================
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT id, display_name, email, role, password FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('🛑 [LOGIN DB ERROR]:', err.message);
            return res.status(500).json({ error: 'Internal server error processing request.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials. Operator not found.' });
        }

        // RESTORED BCRYPT VALIDATION
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid security cipher.' });
        }

        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ error: `Access Denied: Role '${user.role}' lacks admin privileges.` });
        }

        // RESTORED JWT TOKEN GENERATION
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Authentication successful',
            token: token,
            user: { id: user.id, name: user.display_name, role: user.role } 
        });
    });
});
// / NEW ROUTE: Securely register new admin operators
// NEW ROUTE: Securely register new admin operators
app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required operator details.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // FIXED 'name' to 'display_name'
        const sql = `INSERT INTO users (display_name, email, password, role) VALUES (?, ?, ?, ?)`;
        
        db.run(sql, [name, email, hashedPassword, role], function(err) {
            if (err) {
                console.error('DB Error adding user:', err.message);
                return res.status(500).json({ error: 'Failed to register operator into system.' });
            }
            res.json({ message: 'Secure operator added successfully.', id: this.lastID });
        });
    } catch (error) {
        console.error('Encryption error:', error.message);
        res.status(500).json({ error: 'Failed to encrypt operator credentials.' });
    }
});
// ==========================================
// PUBLIC API ENDPOINTS
// ==========================================
app.get('/api/activities', (req, res) => {
    const sql = 'SELECT * FROM activities WHERE is_verified = 1 ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database pipeline processing failure.' });
        res.json({ data: rows });
    });
});

app.get('/api/facilities', (req, res) => {
    const { type } = req.query; 
    let sql = 'SELECT * FROM facilities';
    const params = [];

    if (type) {
        sql += ' WHERE facility_type = ?';
        params.push(type);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database pipeline processing failure.' });
        res.json({ data: rows });
    });
});

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
            console.error(err.message);
            return res.status(500).json({ error: 'Failed to log safety alert.' });
        }
        res.status(201).json({ message: 'Safety alert submitted successfully.', id: this.lastID });
    });
});

app.get('/api/empowerment-centers', (req, res) => {
    const sql = 'SELECT * FROM empowerment_centers';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database pipeline processing failure.' });
        res.json({ data: rows });
    });
});

// ==========================================
// SYSTEM TELEMETRY & ANALYTICS PIPELINE
// ==========================================
app.get('/api/admin/telemetry', requireAdmin, async (req, res) => {
    try {
        // Wrap SQLite callbacks in Promises so we can execute them concurrently
        const getCrimeStats = new Promise((resolve, reject) => {
            db.all(`SELECT severity_level, COUNT(*) as count FROM crime_spottings GROUP BY severity_level`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const getActiveActivities = new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM activities WHERE is_verified = 1`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });

        const getActiveBroadcasts = new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM announcements`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });

        const getTotalCenters = new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM empowerment_centers`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });

        // Fire all database queries at the exact same time for maximum speed
        const [crimeStats, activitiesCount, broadcastsCount, centersCount] = await Promise.all([
            getCrimeStats, 
            getActiveActivities, 
            getActiveBroadcasts, 
            getTotalCenters
        ]);
        
        res.json({
            data: {
                crime_distribution: crimeStats,
                metrics: {
                    activities: activitiesCount,
                    broadcasts: broadcastsCount,
                    centers: centersCount
                }
            }
        });
    } catch (err) {
        console.error('Telemetry Error:', err.message);
        res.status(500).json({ error: 'Failed to aggregate system telemetry.' });
    }
});

app.get('/api/announcements', (req, res) => {
    const sql = 'SELECT * FROM announcements ORDER BY priority DESC, created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database pipeline processing failure.' });
        res.json({ data: rows });
    });
});

// ==========================================
// ADMIN CRUD API ENDPOINTS (requireAdmin Enforced)
// ==========================================
app.post('/api/admin/activities', requireAdmin, (req, res) => {
    const { title, organization, age_group, description, location_name } = req.body;
    const sql = `INSERT INTO activities (title, organization, age_group, description, location_name, is_verified) VALUES (?, ?, ?, ?, ?, 1)`;
    db.run(sql, [title, organization, age_group, description, location_name], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to write activity to database.' });
        res.json({ message: 'Activity created successfully!', id: this.lastID });
    });
});

app.put('/api/admin/activities/:id', requireAdmin, (req, res) => {
    const { title, organization, age_group, description, location_name, is_verified } = req.body;
    const sql = `UPDATE activities SET title = ?, organization = ?, age_group = ?, description = ?, location_name = ?, is_verified = ? WHERE id = ?`;
    db.run(sql, [title, organization, age_group, description, location_name, is_verified, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update activity.' });
        res.json({ message: 'Activity updated successfully!' });
    });
});

app.put('/api/admin/activities/:id/verify', requireAdmin, (req, res) => {
    const { id } = req.params;
    const sql = 'UPDATE activities SET is_verified = 1 WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to verify activity.' });
        if (this.changes === 0) return res.status(404).json({ error: `Activity with ID ${id} not found.` });
        res.json({ message: `Activity ID ${id} verified successfully.` });
    });
});

app.post('/api/admin/announcements', requireAdmin, (req, res) => {
    const { title, content, priority } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Missing title or content.' });

    const sql = `INSERT INTO announcements (title, content, priority, created_at) VALUES (?, ?, ?, datetime('now'))`;
    db.run(sql, [title, content, priority || 1], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to broadcast announcement.' });
        res.status(201).json({ message: 'Announcement broadcasted successfully.', id: this.lastID });
    });
});

app.put('/api/admin/announcements/:id', requireAdmin, (req, res) => {
    const { title, content, priority } = req.body;
    const sql = `UPDATE announcements SET title = ?, content = ?, priority = ? WHERE id = ?`;
    db.run(sql, [title, content, priority, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update announcement.' });
        res.json({ message: 'Announcement updated successfully!' });
    });
});

app.get('/api/admin/crime-spottings', requireAdmin, (req, res) => {
    const sql = 'SELECT * FROM crime_spottings ORDER BY spotted_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('🔥 DB Route Error:', err.message);
            return res.status(500).json({ error: 'Database pipeline processing failure.' });
        }
        res.json({ data: rows });
    });
});

app.post('/api/admin/crime-spottings', requireAdmin, (req, res) => {
    const { incident_type, description, location_description, latitude, longitude, severity_level } = req.body;
    const sql = `INSERT INTO crime_spottings (incident_type, description, location_description, latitude, longitude, severity_level, spotted_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    db.run(sql, [incident_type, description, location_description, latitude || 0.0, longitude || 0.0, severity_level || 'Medium'], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to log incident.' });
        res.json({ message: 'Incident logged to ecosystem!', id: this.lastID });
    });
});

app.put('/api/admin/crime-spottings/:id', requireAdmin, (req, res) => {
    const { incident_type, description, location_description, severity_level } = req.body;
    const sql = `UPDATE crime_spottings SET incident_type = ?, description = ?, location_description = ?, severity_level = ? WHERE id = ?`;
    db.run(sql, [incident_type, description, location_description, severity_level, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update incident record.' });
        res.json({ message: 'Incident record updated.' });
    });
});

app.post('/api/admin/empowerment-centers', requireAdmin, (req, res) => {
    const { center_name, focus_area, address, contact_number } = req.body;
    const sql = `INSERT INTO empowerment_centers (center_name, focus_area, address, contact_number) VALUES (?, ?, ?, ?)`;
    db.run(sql, [center_name, focus_area, address, contact_number], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to save empowerment center.' });
        res.json({ message: 'Empowerment Center saved!', id: this.lastID });
    });
});

app.put('/api/admin/empowerment-centers/:id', requireAdmin, (req, res) => {
    const { center_name, focus_area, address, contact_number } = req.body;
    const sql = `UPDATE empowerment_centers SET center_name = ?, focus_area = ?, address = ?, contact_number = ? WHERE id = ?`;
    db.run(sql, [center_name, focus_area, address, contact_number, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update empowerment center.' });
        res.json({ message: 'Empowerment Center details modified.' });
    });
});

// ==========================================
// SPA FALLBACK CATCH-ALL
// ==========================================
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API route ${req.originalUrl} not found on this server.` });
    }
    if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
    }
    next();
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const server = app.listen(PORT, () => {
    console.log(`[BOOT] HTTP Server is actively listening on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('🛑 [SERVER ERROR] Network layer crashed:', err);
});

server.on('close', () => {
    console.log('⚠️ [SERVER CLOSE] The HTTP server was forcefully shut down.');
});