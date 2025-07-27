const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(__dirname));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// In-memory storage (in a real app, use a database)
let visitors = [];
let activities = [];

// Load data from file if it exists
function loadData() {
    try {
        if (fs.existsSync('data/visitors.json')) {
            visitors = JSON.parse(fs.readFileSync('data/visitors.json', 'utf8'));
        }
        if (fs.existsSync('data/activities.json')) {
            activities = JSON.parse(fs.readFileSync('data/activities.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Save data to file
function saveData() {
    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync('data')) {
            fs.mkdirSync('data');
        }
        
        fs.writeFileSync('data/visitors.json', JSON.stringify(visitors, null, 2));
        fs.writeFileSync('data/activities.json', JSON.stringify(activities, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Track visitor activity
app.post('/api/track', (req, res) => {
    try {
        const { event, visitor_id, session_id, ...data } = req.body;
        
        // Add timestamp if not provided
        const timestamp = data.timestamp || new Date().toISOString();
        
        // Create activity record
        const activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event,
            visitor_id,
            session_id,
            timestamp,
            ...data
        };
        
        // Add to activities
        activities.push(activity);
        
        // Update or create visitor
        let visitor = visitors.find(v => v.id === visitor_id);
        
        if (!visitor) {
            // New visitor
            visitor = {
                id: visitor_id,
                first_seen: timestamp,
                last_seen: timestamp,
                sessions: [session_id],
                page_views: 0,
                devices: new Set(),
                locations: new Set()
            };
            
            if (data.device) visitor.devices.add(JSON.stringify(data.device));
            if (data.location) visitor.locations.add(JSON.stringify(data.location));
            
            visitors.push(visitor);
        } else {
            // Update existing visitor
            visitor.last_seen = timestamp;
            
            if (!visitor.sessions.includes(session_id)) {
                visitor.sessions.push(session_id);
            }
            
            if (data.device) visitor.devices.add(JSON.stringify(data.device));
            if (data.location) visitor.locations.add(JSON.stringify(data.location));
        }
        
        // Update page views
        if (event === 'page_view') {
            visitor.page_views = (visitor.page_views || 0) + 1;
        }
        
        // Convert Sets to arrays for JSON serialization
        visitor.devices = Array.from(visitor.devices).map(d => JSON.parse(d));
        visitor.locations = Array.from(visitor.locations).map(l => JSON.parse(l));
        
        // Save data
        saveData();
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get visitor data
app.get('/api/visitors', (req, res) => {
    try {
        res.json(visitors);
    } catch (error) {
        console.error('Error getting visitors:', error);
        res.status(500).json({ error: 'Failed to get visitors' });
    }
});

// Get activities
app.get('/api/activities', (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const result = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
            
        res.json({
            data: result,
            total: activities.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error getting activities:', error);
        res.status(500).json({ error: 'Failed to get activities' });
    }
});

// Get visitor details
app.get('/api/visitors/:id', (req, res) => {
    try {
        const visitor = visitors.find(v => v.id === req.params.id);
        if (!visitor) {
            return res.status(404).json({ error: 'Visitor not found' });
        }
        
        const visitorActivities = activities
            .filter(a => a.visitor_id === visitor.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
        res.json({
            ...visitor,
            activities: visitorActivities
        });
    } catch (error) {
        console.error('Error getting visitor details:', error);
        res.status(500).json({ error: 'Failed to get visitor details' });
    }
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        
        // Total visitors
        const totalVisitors = visitors.length;
        
        // Active visitors (active in last 5 minutes)
        const activeVisitors = new Set(
            activities
                .filter(a => new Date(a.timestamp) > new Date(now - 5 * 60 * 1000))
                .map(a => a.visitor_id)
        ).size;
        
        // New visitors today
        const newVisitorsToday = visitors.filter(
            v => new Date(v.first_seen) > oneDayAgo
        ).length;
        
        // Page views today
        const pageViewsToday = activities.filter(
            a => a.event === 'page_view' && new Date(a.timestamp) > oneDayAgo
        ).length;
        
        // Browser usage
        const browserUsage = activities
            .filter(a => a.browser)
            .reduce((acc, curr) => {
                const browser = curr.browser.name;
                acc[browser] = (acc[browser] || 0) + 1;
                return acc;
            }, {});
        
        // Device types
        const deviceTypes = activities
            .filter(a => a.device)
            .reduce((acc, curr) => {
                const type = curr.device.isMobile ? 'Mobile' : curr.device.isTablet ? 'Tablet' : 'Desktop';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
        
        // Recent activities
        const recentActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        res.json({
            totalVisitors,
            activeVisitors,
            newVisitorsToday,
            pageViewsToday,
            browserUsage,
            deviceTypes,
            recentActivities,
            lastUpdated: now.toISOString()
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Serve the admin dashboard
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Create data directory if it doesn't exist
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Load existing data
loadData();

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}`);
});

// Save data on exit
process.on('SIGINT', () => {
    saveData();
    process.exit();
});
