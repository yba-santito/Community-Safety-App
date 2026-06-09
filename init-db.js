require('dotenv').config();
const sqlite3 = require('@libsql/sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); 

// 1. Establish the connection to your database file
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Logic: Use Cloud URL if available, otherwise fallback to local file
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

db.serialize(() => {
    console.log('🏗️ Setting up database tables...');

    // 1. AFTER-SCHOOL ACTIVITIES
    db.run(`CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        organization TEXT NOT NULL,
        age_group TEXT,
        description TEXT,
        location_name TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        schedule TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. EMPOWERMENT CENTERS
    db.run(`CREATE TABLE IF NOT EXISTS empowerment_centers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        center_name TEXT NOT NULL,
        focus_area TEXT,
        description TEXT,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        contact_number TEXT,
        website TEXT
    )`);

    // 3. CLOSEST FACILITIES
    db.run(`CREATE TABLE IF NOT EXISTS facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_name TEXT NOT NULL,
        facility_type TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        operating_hours TEXT DEFAULT '24/7',
        emergency_contact TEXT
    )`);

    // 4. CRIME SPOTTINGS
    db.run(`CREATE TABLE IF NOT EXISTS crime_spottings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_type TEXT NOT NULL,
        description TEXT NOT NULL,
        location_description TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        severity_level TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Active',
        spotted_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. ANNOUNCEMENTS
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_type TEXT DEFAULT 'Community Leader',
        priority TEXT DEFAULT 'Normal',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. USERS 
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        password TEXT NOT NULL, 
        role TEXT DEFAULT 'resident',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ Tables checked/created successfully.');

    // ==========================================
    // SEED DATA MANAGEMENT: JOBURG SOUTH GRID
    // ==========================================
    db.get('SELECT COUNT(*) AS count FROM activities', (err, row) => {
        if (err) {
            return console.error('❌ Error checking activities count:', err.message);
        }
        
        if (row.count === 0) {
            console.log('🌱 Tables empty. Seeding Joburg South operational grid...');

            db.serialize(() => {
                // 1. Activities across the basin
                db.run(`INSERT INTO activities (title, organization, age_group, description, location_name, schedule, is_verified) VALUES 
                    ('Youth Coding & Robotics', 'Code4Change', 'Teens', 'Introductory Python and basic building blocks.', 'Rotunda Park Hall, Turffontein', 'Wednesdays 16:00', 1),
                    ('Rosettenville Soccer Clinic', 'Joburg South Sports', '10-15 years', 'After-school sports and teamwork development.', 'Rosettenville Sports Grounds', 'Tue & Thu 15:30', 1),
                    ('Community Art Workshop', 'The Hill Creatives', 'All Ages', 'Painting and community mural planning.', 'The Hill Recreation Centre', 'Saturdays 10:00', 1)`);

                // 2. Empowerment Centers
                db.run(`INSERT INTO empowerment_centers (center_name, focus_area, address, latitude, longitude, contact_number) VALUES 
                    ('South Skills Vocational', 'Trade Skills', '120 Turf Club Street, Turffontein', -26.2389, 28.0461, '011-555-0192'),
                    ('Kenilworth Youth Hub', 'Digital Literacy', '45 Main Street, Kenilworth', -26.2485, 28.0310, '011-555-0200'),
                    ('Chrisville Support Deck', 'Mentorship & Counseling', '12 Rifle Range Rd, Chrisville', -26.2415, 28.0180, '011-555-0441')`);

                // 3. Facilities
                db.run(`INSERT INTO facilities (facility_name, facility_type, address, latitude, longitude, operating_hours) VALUES 
                    ('South Rand Hospital', 'Hospital', 'Friars Hill Rd, The Hill', -26.2519, 28.0538, '24/7'),
                    ('Rosettenville Police Station', 'Security', 'Geranium St, Rosettenville', -26.2470, 28.0515, '24/7'),
                    ('Wemmer Pan Recreation', 'Park', 'Pioneer Park', -26.2280, 28.0530, '06:00 - 18:00')`);

                // 4. Announcements
                db.run(`INSERT INTO announcements (title, content, author_type, priority) VALUES 
                    ('Scheduled Power Outage', 'City Power maintenance will affect Chrisville and Kenilworth this Sunday from 06:00 to 14:00.', 'City Power', 'Urgent'),
                    ('Neighborhood Watch Meeting', 'Join us at the Rosettenville hall to discuss new street patrol rotations.', 'Joburg South CPF', 'Normal')`);

                // 5. Crime Spottings (Distributed across the suburbs)
                db.run(`INSERT INTO crime_spottings (incident_type, description, location_description, latitude, longitude, severity_level, spotted_at) VALUES 
                    ('Suspicious Activity', 'Unrecognized individuals checking gate latch mechanisms.', 'Turffontein Racecourse Outer Wall', -26.2410, 28.0430, 'Medium', datetime('now', '-2 hours')),
                    ('Cable Theft', 'Active tampering with the mini-substation box reported by residents.', 'Donnelly St, Kenilworth', -26.2490, 28.0350, 'High', datetime('now', '-5 hours')),
                    ('Vandalism', 'Graffiti and broken streetlights along the main walking route.', 'Mabel St, Rosettenville', -26.2550, 28.0520, 'Low', datetime('now', '-1 day')),
                    ('Suspicious Vehicle', 'White panel van idling near the community center for over two hours.', 'Rifle Range Rd, Chrisville', -26.2405, 28.0200, 'Medium', datetime('now', '-30 minutes'))`);

                // 6. Secure Users
                const defaultPassword = 'password123';
                const saltRounds = 10;

                bcrypt.hash(defaultPassword, saltRounds, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        return console.error('❌ Error hashing default password:', hashErr.message);
                    }

                    db.run(`INSERT OR IGNORE INTO users (id, email, display_name, password, role) VALUES 
                        ('uid_resident_123', 'john@neighborhood.com', 'John Doe', ?, 'resident'),
                        ('uid_admin_456', 'admin_sarah@community.org', 'Sarah Jenkins', ?, 'admin'),
                        ('uid_super_789', 'super_ceo@platform.com', 'Mogau Kganana', ?, 'superadmin')`, 
                    [hashedPassword, hashedPassword, hashedPassword], (err) => {
                        if (err) {
                            console.error('❌ Error seeding users:', err.message);
                        } else {
                            console.log('🏁 Joburg South tracking logs successfully initialized!');
                            console.log('🔑 Default login password for all seeded users is: password123');
                        }
                    });
                });
            });

        } else {
            console.log('⏩ Logs detected. Retaining database structural persistence.');
        }
    });
});