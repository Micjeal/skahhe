// Global variables
let visitorsData = [];
let activityData = [];
let settings = {
    enableTracking: true,
    trackLocation: true,
    trackDevices: true,
    adminEmail: 'admin@example.com',
    timezone: 'GMT+3',
    dataRetention: 365
};

// DOM Elements
const totalVisitorsEl = document.getElementById('totalVisitors');
const activeVisitorsEl = document.getElementById('activeVisitors');
const pageViewsEl = document.getElementById('pageViews');
const avgSessionEl = document.getElementById('avgSession');
const recentActivityBody = document.getElementById('recentActivityBody');
const visitorsTableBody = document.getElementById('visitorsTableBody');
const topPagesBody = document.getElementById('topPagesBody');

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadVisitorData();
    initializeEventListeners();
    updateDashboard();
    
    // Simulate real-time updates
    setInterval(simulateRealTimeUpdates, 10000);
});

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('adminDashboardSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        updateSettingsForm();
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('adminDashboardSettings', JSON.stringify(settings));
}

// Update settings form with current values
function updateSettingsForm() {
    document.getElementById('enableTracking').checked = settings.enableTracking;
    document.getElementById('trackLocation').checked = settings.trackLocation;
    document.getElementById('trackDevices').checked = settings.trackDevices;
    document.getElementById('adminEmail').value = settings.adminEmail;
    document.getElementById('timezone').value = settings.timezone;
    document.getElementById('dataRetention').value = settings.dataRetention;
}

// Load sample visitor data
function loadVisitorData() {
    const savedData = localStorage.getItem('visitorData');
    const savedActivity = localStorage.getItem('visitorActivity');
    
    if (savedData && savedActivity) {
        visitorsData = JSON.parse(savedData);
        activityData = JSON.parse(savedActivity);
    } else {
        generateSampleData();
    }
}

// Generate sample visitor data
function generateSampleData() {
    const pages = ['/index.html', '/about.html', '/services.html', '/contact.html', '/blog.html'];
    const locations = ['Nairobi, Kenya', 'Kampala, Uganda', 'Dar es Salaam, Tanzania', 'Kigali, Rwanda'];
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    
    // Generate visitors
    for (let i = 1; i <= 30; i++) {
        const visitorId = 'visitor-' + Math.random().toString(36).substr(2, 9);
        const firstVisit = new Date();
        firstVisit.setDate(firstVisit.getDate() - Math.floor(Math.random() * 30));
        
        const lastVisit = new Date();
        lastVisit.setHours(lastVisit.getHours() - Math.floor(Math.random() * 72));
        
        visitorsData.push({
            id: visitorId,
            firstVisit: firstVisit.toISOString(),
            lastVisit: lastVisit.toISOString(),
            pageViews: Math.floor(Math.random() * 50) + 1,
            location: locations[Math.floor(Math.random() * locations.length)],
            device: devices[Math.floor(Math.random() * devices.length)]
        });
        
        // Generate activity
        const visitCount = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < visitCount; j++) {
            const visitTime = new Date(lastVisit);
            visitTime.setMinutes(visitTime.getMinutes() - Math.floor(Math.random() * 1440));
            
            activityData.push({
                visitorId: visitorId,
                time: visitTime.toISOString(),
                page: pages[Math.floor(Math.random() * pages.length)],
                location: visitorsData[i-1].location,
                device: visitorsData[i-1].device,
                sessionDuration: Math.floor(Math.random() * 600) + 10
            });
        }
    }
    
    activityData.sort((a, b) => new Date(b.time) - new Date(a.time));
    saveVisitorData();
}

// Save visitor data to localStorage
function saveVisitorData() {
    localStorage.setItem('visitorData', JSON.stringify(visitorsData));
    localStorage.setItem('visitorActivity', JSON.stringify(activityData));
}

// Initialize event listeners
function initializeEventListeners() {
    // Settings form submission
    document.getElementById('trackingSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        settings.enableTracking = document.getElementById('enableTracking').checked;
        settings.trackLocation = document.getElementById('trackLocation').checked;
        settings.trackDevices = document.getElementById('trackDevices').checked;
        saveSettings();
        showAlert('Settings saved successfully!', 'success');
    });
    
    // Admin settings form submission
    document.getElementById('adminSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        settings.adminEmail = document.getElementById('adminEmail').value;
        settings.timezone = document.getElementById('timezone').value;
        settings.dataRetention = parseInt(document.getElementById('dataRetention').value);
        saveSettings();
        showAlert('Admin settings saved successfully!', 'success');
    });
}

// Update dashboard with current data
function updateDashboard() {
    updateDashboardStats();
    updateRecentActivity();
    updateVisitorsTable();
    updateCharts();
}

// Update dashboard statistics
function updateDashboardStats() {
    // Total visitors
    totalVisitorsEl.textContent = visitorsData.length.toLocaleString();
    
    // Active visitors (online in last 5 minutes)
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    const activeVisitors = visitorsData.filter(visitor => 
        new Date(visitor.lastVisit) > fiveMinutesAgo
    ).length;
    activeVisitorsEl.textContent = activeVisitors.toLocaleString();
    
    // Total page views
    const totalPageViews = visitorsData.reduce((sum, visitor) => sum + visitor.pageViews, 0);
    pageViewsEl.textContent = totalPageViews.toLocaleString();
    
    // Average session duration
    if (activityData.length > 0) {
        const totalDuration = activityData.reduce((sum, activity) => sum + (activity.sessionDuration || 0), 0);
        const avgDuration = Math.round(totalDuration / activityData.length);
        const minutes = Math.floor(avgDuration / 60);
        const seconds = avgDuration % 60;
        avgSessionEl.textContent = `${minutes}m ${seconds}s`;
    } else {
        avgSessionEl.textContent = '0m';
    }
}

// Update recent activity table
function updateRecentActivity() {
    if (!recentActivityBody) return;
    
    // Clear existing rows
    recentActivityBody.innerHTML = '';
    
    // Get most recent 10 activities
    const recentActivities = [...activityData]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);
    
    // Add rows to the table
    recentActivities.forEach(activity => {
        const row = document.createElement('tr');
        const time = new Date(activity.time);
        const timeString = time.toLocaleTimeString();
        const dateString = time.toLocaleDateString();
        
        row.innerHTML = `
            <td>${dateString} ${timeString}</td>
            <td>${activity.page}</td>
            <td>${activity.location || 'Unknown'}</td>
            <td>${activity.device || 'Unknown'}</td>
            <td>${activity.sessionDuration || 0}s</td>
        `;
        recentActivityBody.appendChild(row);
    });
}

// Update visitors table
function updateVisitorsTable() {
    if (!visitorsTableBody) return;
    
    // Clear existing rows
    visitorsTableBody.innerHTML = '';
    
    // Add rows for each visitor
    visitorsData.forEach(visitor => {
        const row = document.createElement('tr');
        const firstVisit = new Date(visitor.firstVisit);
        const lastVisit = new Date(visitor.lastVisit);
        
        row.innerHTML = `
            <td>${visitor.id}</td>
            <td>${firstVisit.toLocaleDateString()}</td>
            <td>${lastVisit.toLocaleDateString()}</td>
            <td>${visitor.pageViews}</td>
            <td>${visitor.location || 'Unknown'}</td>
            <td>${visitor.device || 'Unknown'}</td>
        `;
        visitorsTableBody.appendChild(row);
    });
}

// Update charts (placeholder function)
function updateCharts() {
    // This would be implemented with a charting library like Chart.js
    console.log('Updating charts...');
}

// Simulate real-time updates
function simulateRealTimeUpdates() {
    // Only simulate updates if there's data
    if (visitorsData.length === 0 || activityData.length === 0) return;
    
    // Randomly decide whether to add a new activity (30% chance)
    if (Math.random() < 0.3) {
        const randomVisitor = visitorsData[Math.floor(Math.random() * visitorsData.length)];
        const pages = ['/index.html', '/about.html', '/services.html', '/contact.html', '/blog.html'];
        
        // Create a new activity
        const newActivity = {
            visitorId: randomVisitor.id,
            time: new Date().toISOString(),
            page: pages[Math.floor(Math.random() * pages.length)],
            location: randomVisitor.location,
            device: randomVisitor.device,
            sessionDuration: Math.floor(Math.random() * 300) + 30 // 30-330 seconds
        };
        
        // Add to activity data
        activityData.unshift(newActivity);
        
        // Update the visitor's last visit time
        randomVisitor.lastVisit = newActivity.time;
        randomVisitor.pageViews++;
        
        // Save the updated data
        saveVisitorData();
        
        // Update the UI
        updateDashboard();
    }
}
