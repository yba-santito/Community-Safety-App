const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'community.db');

// Connect to (or create) the database file
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error('❌ Error opening database:', err.message);
    }
    console.log('📦 Connected to SQLite database.');
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

    console.log('✅ Tables checked/created successfully.');

    // ==========================================
    // SEED DATA (Only inserts if tables are empty)
    // ==========================================
    db.get('SELECT COUNT(*) AS count FROM activities', (err, row) => {
        if (err) return console.error(err.message);
        
        if (row.count === 0) {
            console.log('🌱 Tables empty. Seeding mock data...');

            // Seed Activities
            db.run(`INSERT INTO activities (title, organization, age_group, description, location_name, schedule, is_verified) VALUES 
                ('Youth Coding & Robotics', 'Code4Change', 'Teens', 'Introductory Python and basic building blocks', 'Main Library Hall', 'Wednesdays 16:00', 1),
                ('After-School Homework Club', 'Community Library', '6-12 years', 'Quiet study space with peer tutors.', 'Central Public Library', 'Mon-Thu 15:00 - 17:00', 1)`);

            // Seed Empowerment Centers
            db.run(`INSERT INTO empowerment_centers (center_name, focus_area, address, contact_number) VALUES 
                ('Apex Vocational Centre', 'Trade Skills & Mentorship', '45 Industrial Ave', '011-555-0192')`);

            // Seed Facilities
            db.run(`INSERT INTO facilities (facility_name, facility_type, address, latitude, longitude, operating_hours) VALUES 
                ('Greenwood Community Park', 'Park', '12 Urban Green Way', -26.1234, 27.9876, '06:00 - 18:00'),
                ('St. Jude Community Hospital', 'Hospital', '100 Medical Drive', -26.1240, 27.9900, '24/7')`);

            // Seed Announcements
            db.run(`INSERT INTO announcements (title, content, author_type, priority) VALUES 
                ('Scheduled Water Maintenance', 'Water supply will be restricted this Thursday from 08:00 to 14:00 for pipe upgrades.', 'Municipality', 'Urgent'),
                ('Neighborhood Watch General Meeting', 'Join us at the community hall this Friday at 18:00 to discuss new street patrol rotations.', 'Neighborhood Watch', 'Normal')`);

            console.log('🏁 Database successfully seeded!');
        } else {
            console.log('⏩ Database already contains records. Skipping seed step.');
        }
    });
});

// Close database handle cleanly
db.close((err) => {
    if (err) console.error(err.message);
    console.log('🔒 Database configuration finalized.');
});