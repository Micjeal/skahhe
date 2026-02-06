const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.set('trust proxy', true);

// Enable detailed request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
});

// Path to the website files
const WEBSITE_PATH = process.env.WEBSITE_PATH || path.join(__dirname);
console.log('Website path:', WEBSITE_PATH);

// Verify website directory exists
if (!fs.existsSync(WEBSITE_PATH)) {
    console.error('ERROR: Website directory not found at:', WEBSITE_PATH);
    console.log('Current working directory:', process.cwd());
    const parentDir = path.dirname(WEBSITE_PATH);
    if (fs.existsSync(parentDir)) {
        console.log('Directory contents:', fs.readdirSync(parentDir));
    }
}

// Configure CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(__dirname));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test endpoint is working!',
        timestamp: new Date().toISOString(),
        directory: __dirname,
        files: fs.readdirSync(__dirname)
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const websiteExists = fs.existsSync(WEBSITE_PATH);
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        websitePath: WEBSITE_PATH,
        exists: websiteExists,
        files: websiteExists ? fs.readdirSync(WEBSITE_PATH) : []
    });
});

app.get('/api/client-ip', (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : (forwarded ? forwarded.split(',')[0].trim() : req.ip);
    res.json({ ip });
});

// Serve favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

// In-memory storage (in a real app, use a database)
let visitors = [];
let activities = [];

// WEBSITE_PATH is already defined at the top of the file

// Store version history for sections
const versionHistory = new Map();

// Get version history for a section
function getSectionHistory(sectionId) {
    if (!versionHistory.has(sectionId)) {
        versionHistory.set(sectionId, []);
    }
    return versionHistory.get(sectionId);
}

// Add a new version to the section's history
function addToHistory(sectionId, content) {
    const history = getSectionHistory(sectionId);
    history.unshift({
        timestamp: new Date().toISOString(),
        content: content
    });
    
    // Keep only the last 10 versions
    if (history.length > 10) {
        history.length = 10;
    }
    
    return history[0]; // Return the newly added version
}

// Create a backup of the website file
function backupWebsiteFile() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = path.join(WEBSITE_PATH, 'backups')
        const backupFile = path.join(backupPath, `backup-${timestamp}.html`)
        
        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true })
        }
        
        // Copy the current file to create a backup
        fs.copyFileSync(WEBSITE_INDEX_PATH, backupFile)
        console.log(`Backup created: ${backupFile}`)
        return backupFile
    } catch (error) {
        console.error('Error creating backup:', error)
        return null
    }
}

// Function to safely read website files
function readWebsiteFile(filePath) {
    try {
        const fullPath = path.join(WEBSITE_PATH, filePath);
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf8');
        }
        return null;
    } catch (error) {
        console.error('Error reading website file:', error);
        return null;
    }
}

// Function to safely write to website files
function writeWebsiteFile(filePath, content) {
    try {
        const fullPath = path.join(WEBSITE_PATH, filePath);
        const dir = path.dirname(fullPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing to website file:', error);
        return false;
    }
}

// Function to update section in HTML
function updateHtmlSection(html, sectionId, newContent) {
    // This is a simplified version - in a real app, you'd want to use a proper HTML parser
    const sectionStart = `<section id="${sectionId}">`;
    const sectionEnd = '</section>';
    
    const startIndex = html.indexOf(sectionStart);
    if (startIndex === -1) return html;
    
    const endIndex = html.indexOf(sectionEnd, startIndex);
    if (endIndex === -1) return html;
    
    const beforeSection = html.substring(0, startIndex);
    const afterSection = html.substring(endIndex + sectionEnd.length);
    
    return beforeSection + sectionStart + newContent + sectionEnd + afterSection;
}

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

// Map frontend section IDs to actual HTML element IDs for MUGISHA GEORGE website
const sectionIdMap = {
    'home': 'hero',
    'about': 'about',
    'products': 'products',
    'gallery': 'gallery',
    'testimonials': 'testimonials',
    'contact': 'contact',
    'partnerships': 'partnerships',
    'business-cards': 'business-cards'
};

// API routes for content management
app.get('/api/website/sections', (req, res) => {
    try {
        // Return the frontend section IDs
        const sections = Object.keys(sectionIdMap);
        res.json({ sections });
    } catch (error) {
        console.error('Error getting sections:', error);
        res.status(500).json({ error: 'Failed to get sections' });
    }
});

app.get('/api/website/section/:id', (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[${new Date().toISOString()}] Fetching section: ${id}`);
        
        // Map the frontend section ID to the actual HTML element ID
        const htmlId = sectionIdMap[id];
        if (!htmlId) {
            console.error(`No mapping found for section ID: ${id}`);
            return res.status(404).json({ error: 'Section not found' });
        }
        
        console.log(`Mapped section ID '${id}' to HTML ID '${htmlId}'`);
        const fileContent = readWebsiteFile('index.html');
        
        if (!fileContent) {
            console.error('Error: index.html not found in website directory');
            return res.status(404).json({ error: 'Website file not found' });
        }
        
        // Log the first 1000 characters of the file to see its structure
        console.log('File content preview (first 1000 chars):', fileContent.substring(0, 1000));
        
        // Look for a section with the matching ID
        // The structure is: <section id="section-id">
        console.log(`Looking for section with id '${htmlId}'`);
        
        // Find the start of the section
        const sectionStartPattern = new RegExp(`<section[^>]*id=["']${htmlId}["'][^>]*>`, 'i');
        const startMatch = fileContent.match(sectionStartPattern);
        
        if (!startMatch) {
            console.error(`Could not find section with id '${htmlId}'`);
            return res.status(404).json({ error: `Section with id '${htmlId}' not found` });
        }
        
        const startIndex = startMatch.index;
        console.log(`Found start of section '${htmlId}' at position ${startIndex}`);
        
        // Find the matching closing section tag
        let currentIndex = startIndex + startMatch[0].length;
        let sectionDepth = 1; // We're inside one section
        let endIndex = -1;
        
        while (currentIndex < fileContent.length && sectionDepth > 0) {
            const nextSectionOpen = fileContent.indexOf('<section', currentIndex);
            const nextSectionClose = fileContent.indexOf('</section>', currentIndex);
            
            // If no more section tags, break
            if (nextSectionOpen === -1 && nextSectionClose === -1) break;
            
            // Check which comes first - an opening or closing section tag
            if (nextSectionOpen !== -1 && (nextSectionOpen < nextSectionClose || nextSectionClose === -1)) {
                // Found an opening section tag
                sectionDepth++;
                currentIndex = nextSectionOpen + 8; // Move past '<section'
            } else {
                // Found a closing section tag
                sectionDepth--;
                if (sectionDepth === 0) {
                    // This is the matching closing tag
                    endIndex = nextSectionClose + 10; // Include the full '</section>'
                    break;
                }
                currentIndex = nextSectionClose + 10; // Move past '</section>'
            }
        }
        
        if (endIndex === -1) {
            console.error(`Could not find matching closing tag for section '${htmlId}'`);
            return res.status(500).json({ error: 'Invalid HTML structure - could not find matching closing tag' });
        }
        
        // Extract the complete section including the opening and closing tags
        const sectionContent = fileContent.substring(startIndex, endIndex);
        
        // For debugging
        console.log(`Successfully extracted section '${htmlId}' (${sectionContent.length} chars)`);
        
        res.json({
            id: id,
            content: sectionContent,
            lastModified: fs.statSync(path.join(WEBSITE_PATH, 'index.html')).mtime
        });
        return;
        
        res.json({
            id,
            content: sectionContent,
            lastModified: fs.statSync(path.join(WEBSITE_PATH, 'index.html')).mtime
        });
    } catch (error) {
        console.error('Error getting section:', error);
        res.status(500).json({ error: 'Failed to get section' });
    }
});

// Get version history for a section
app.get('/api/website/section/:id/history', (req, res) => {
    try {
        const { id } = req.params;
        const history = getSectionHistory(id);
        res.json({
            success: true,
            sectionId: id,
            history: history
        });
    } catch (error) {
        console.error('Error getting section history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve section history' 
        });
    }
});

// Restore a specific version of a section
app.post('/api/website/section/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const { versionIndex } = req.body;
        
        const history = getSectionHistory(id);
        if (versionIndex < 0 || versionIndex >= history.length) {
            return res.status(400).json({ error: 'Invalid version index' });
        }
        
        const version = history[versionIndex];
        
        // Create a backup before making changes
        const backupFile = await backupWebsiteFile();
        if (!backupFile) {
            console.warn('Proceeding without backup - could not create backup file');
        }
        
        // Update the section with the restored content
        const filePath = 'index.html';
        const currentContent = readWebsiteFile(filePath);
        
        // Find and replace the section content
        const sectionTag = `<section id="${id}"`;
        const sectionStart = currentContent.indexOf(sectionTag);
        
        if (sectionStart === -1) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        // Find the end of the section
        const afterSectionStart = currentContent.substring(sectionStart);
        const sectionEnd = afterSectionStart.indexOf('</section>');
        
        if (sectionEnd === -1) {
            return res.status(500).json({ error: 'Invalid section format' });
        }
        
        // Reconstruct the section with the restored content
        const beforeSection = currentContent.substring(0, sectionStart);
        const afterSection = afterSectionStart.substring(sectionEnd);
        const updatedContent = beforeSection + version.content + afterSection;
        
        // Write the updated content back to the file
        fs.writeFileSync(path.join(WEBSITE_PATH, filePath), updatedContent, 'utf8');
        
        res.json({
            success: true,
            message: 'Section restored successfully',
            sectionId: id,
            version: version
        });
    } catch (error) {
        console.error('Error restoring section version:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to restore section version' 
        });
    }
});

// Update a section in the website
app.put('/api/website/section/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Create a backup before making changes
        const backupFile = await backupWebsiteFile();
        if (!backupFile) {
            console.warn('Proceeding without backup - could not create backup file');
        }
        
        const filePath = 'index.html';
        const currentContent = readWebsiteFile(filePath);
        
        // Add current version to history before updating
        const sectionTag = `<section id="${id}"`;
        const sectionStart = currentContent.indexOf(sectionTag);
        
        if (sectionStart !== -1) {
            // Find the end of the section
            const afterSectionStart = currentContent.substring(sectionStart);
            const sectionEnd = afterSectionStart.indexOf('</section>');
            
            if (sectionEnd !== -1) {
                const currentSectionContent = afterSectionStart.substring(0, sectionEnd + '</section>'.length);
                addToHistory(id, currentSectionContent);
            }
        }
        
        if (!currentContent) {
            return res.status(404).json({ error: 'Website file not found' });
        }
        
        // Update the section in the HTML
        const updatedContent = updateHtmlSection(currentContent, id, content);
        
        // Save the updated content
        const success = writeWebsiteFile(filePath, updatedContent);
        
        if (success) {
            res.json({ 
                success: true, 
                message: 'Section updated successfully',
                lastModified: fs.statSync(path.join(WEBSITE_PATH, filePath)).mtime
            });
        } else {
            res.status(500).json({ error: 'Failed to update section' });
        }
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({ error: 'Failed to update section' });
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
app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Dashboard available at http://${HOST}:${PORT}`);
});

// Save data on exit
process.on('SIGINT', () => {
    saveData();
    process.exit();
});
