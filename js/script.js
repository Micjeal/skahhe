// Global variables
let visitorsData = [];
let activityData = [];

// Show alert message
function showAlert(message, type = 'info') {
    // Create alert element if it doesn't exist
    let alertDiv = document.getElementById('alert-message');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'alert-message';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.padding = '15px 20px';
        alertDiv.style.borderRadius = '4px';
        alertDiv.style.color = 'white';
        alertDiv.style.zIndex = '1000';
        alertDiv.style.maxWidth = '300px';
        alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        alertDiv.style.transition = 'all 0.3s ease';
        document.body.appendChild(alertDiv);
    }

    // Set alert type and message
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    alertDiv.textContent = message;
    alertDiv.style.backgroundColor = colors[type] || colors.info;
    alertDiv.style.display = 'block';
    alertDiv.style.opacity = '1';

    // Auto hide after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 300);
    }, 5000);
}

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

// Track navigation item clicks
function trackNavigation(page) {
    // Get the current user's name from the UI or use a default
    const userInput = document.getElementById('currentUser');
    let currentUser = 'Guest';
    
    if (userInput && userInput.value.trim() !== '') {
        currentUser = userInput.value.trim();
        // Save to localStorage
        localStorage.setItem('trackingUserName', currentUser);
    } else {
        // Try to get from localStorage
        const savedName = localStorage.getItem('trackingUserName');
        if (savedName) {
            currentUser = savedName;
            if (userInput) {
                userInput.value = currentUser;
            }
        }
    }
    
    const visit = {
        page: page,
        timestamp: new Date().toISOString(),
        userName: currentUser,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height
    };
    
    // Add to activity data
    activityData.push({
        type: 'page_visit',
        page: page,
        time: visit.timestamp,
        device: getDeviceType(),
        userName: currentUser
    });
    
    // Update the visitor list with the current user
    updateVisitorList(currentUser, page);
    
    // Update the UI
    updateDashboard();
    
    // In a real app, you would also send this to your server
    // sendToServer('/api/track', visit);
}

// Update the visitor list with the current user
function updateVisitorList(userName, page) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // Check if user already exists in visitorsData
    const existingVisitorIndex = visitorsData.findIndex(v => v.name === userName);
    
    if (existingVisitorIndex >= 0) {
        // Update existing visitor
        const visitor = visitorsData[existingVisitorIndex];
        visitor.lastVisit = now.toISOString();
        visitor.visitCount = (visitor.visitCount || 0) + 1;
        visitor.lastPage = page;
    } else {
        // Add new visitor
        visitorsData.push({
            id: 'user-' + Date.now(),
            name: userName,
            device: getDeviceType(),
            location: 'Unknown', // Could be enhanced with geolocation
            lastVisit: now.toISOString(),
            visitCount: 1,
            lastPage: page,
            status: 'online'
        });
    }
    
    // Update the visitors table
    updateVisitorsTable();
}

// API functions for content management
async function fetchSection(sectionId) {
    try {
        console.log(`Fetching section: ${sectionId}`);
        const response = await fetch(`/api/website/section/${sectionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Important for CORS with credentials
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error (${response.status}):`, errorText);
            throw new Error(`Failed to fetch section: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received section data:', data);
        return data;
    } catch (error) {
        console.error('Error in fetchSection:', {
            error: error.message,
            sectionId,
            timestamp: new Date().toISOString()
        });
        showAlert(`Failed to load section: ${error.message}`, 'warning');
        return null;
    }
}

async function saveSection(sectionId, content) {
    try {
        const response = await fetch(`/api/website/section/${sectionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save section');
        }
        
        const data = await response.json();
        showAlert('Section saved successfully!', 'success');
        return data;
    } catch (error) {
        console.error('Error saving section:', error);
        showAlert('Failed to save section. Changes not published to website.', 'danger');
        return null;
    }
}

// Helper function to determine device type
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'Tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'Mobile';
    }
    return 'Desktop';
}

// Check server health
async function checkServerHealth() {
    try {
        console.log('Checking server health...');
        const response = await fetch('/api/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Server health check:', data);
        
        if (!data.exists) {
            console.error('Website directory not found at:', data.websitePath);
            showAlert(`Warning: Website directory not found at ${data.websitePath}. Content changes won't be saved.`, 'warning');
        }
        
        return data;
    } catch (error) {
        console.error('Server health check failed:', error);
        showAlert('Unable to connect to the server. Please make sure the server is running.', 'danger');
        return null;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Check server health first
    const health = await checkServerHealth();
    
    if (health && health.status === 'ok') {
        // Only initialize content management if server is healthy
        initializeContentManagement();
    } else {
        // Show error in the UI
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Connection Error</h4>
                    <p>Unable to connect to the server. Please make sure the server is running.</p>
                    <p>Error details: ${health ? health.error : 'Server not responding'}</p>
                    <button class="btn btn-primary mt-2" onclick="window.location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    // Load settings and initial data
    loadSettings();
    loadVisitorData();
    initializeEventListeners();
    
    // Initialize user name from localStorage if available
    const savedName = localStorage.getItem('trackingUserName');
    const userInput = document.getElementById('currentUser');
    if (savedName && userInput) {
        userInput.value = savedName;
    }
    
    // Update user name in tracking when it changes
    if (userInput) {
        userInput.addEventListener('change', function() {
            const name = this.value.trim();
            if (name) {
                localStorage.setItem('trackingUserName', name);
                // Update the current tracking with the new name
                trackNavigation('Page Load');
            }
        });
    }
    
    // Initial dashboard update
    updateDashboard();
    
    // Initialize content management
    initializeContentManagement();
    
    // Simulate real-time updates
    setInterval(simulateRealTimeUpdates, 10000);
    
    // Set up navigation tracking
    document.querySelectorAll('a[data-track]').forEach(link => {
        link.addEventListener('click', function(e) {
            const page = this.getAttribute('data-track');
            if (page) {
                trackNavigation(page);
            }
        });
    });
    
    // Set up tab switching
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Set up auto-refresh
    setInterval(updateDashboard, 60000); // Refresh every minute
    
    // Track initial page load
    trackNavigation('Home');
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

// Content Management
let currentSection = 'home';
const defaultSections = {
    home: {
        title: 'Welcome to Our Website',
        content: 'This is the home section. Edit this content in the admin panel.',
        image: ''
    },
    about: {
        title: 'About Us',
        content: 'This is the about section. Edit this content in the admin panel.',
        image: ''
    },
    products: {
        title: 'Our Products',
        content: 'This is the products section. Edit this content in the admin panel.',
        image: ''
    },
    gallery: {
        title: 'Gallery',
        content: 'This is the gallery section. Edit this content in the admin panel.',
        image: ''
    },
    testimonials: {
        title: 'Testimonials',
        content: 'This is the testimonials section. Edit this content in the admin panel.',
        image: ''
    },
    contact: {
        title: 'Contact Us',
        content: 'This is the contact section. Edit this content in the admin panel.',
        image: ''
    }
};

// Load section data from localStorage
function loadSectionData() {
    const savedSections = localStorage.getItem('websiteSections');
    return savedSections ? JSON.parse(savedSections) : {...defaultSections};
}

// Save section data to localStorage
function saveSectionData(sections) {
    localStorage.setItem('websiteSections', JSON.stringify(sections));
}

// Load section into the editor
async function loadSection(sectionId) {
    try {
        // Show loading state
        const form = document.getElementById('sectionForm');
        const titleInput = document.getElementById('sectionTitle');
        const contentInput = document.getElementById('sectionContent');
        const imageInput = document.getElementById('sectionImage');
        
        if (form) form.classList.add('loading');
        
        // Update active state in the sidebar
        document.querySelectorAll('[data-section]').forEach(item => {
            if (item.getAttribute('data-section') === sectionId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Store current section
        currentSection = sectionId;
        
        // Try to load from the actual website first
        const sectionData = await fetchSection(sectionId);
        
        if (sectionData && sectionData.content) {
            // Parse the HTML content to extract title and content
            const parser = new DOMParser();
            const doc = parser.parseFromString(sectionData.content, 'text/html');
            const section = doc.querySelector('section');
            
            if (section) {
                // Extract title (assuming it's in an h2 or h3)
                const titleElement = section.querySelector('h2, h3');
                const title = titleElement ? titleElement.textContent : 
                    `${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} Section`;
                
                // Remove the title from content
                if (titleElement) titleElement.remove();
                
                // Get the remaining content
                const content = section.innerHTML.trim();
                
                // Update form fields with actual content
                if (titleInput) titleInput.value = title;
                if (contentInput) contentInput.value = content;
                
                // Try to extract image URL if exists
                const img = section.querySelector('img');
                if (imageInput) {
                    imageInput.value = img ? img.src : '';
                }
                
                // Update preview
                updatePreview();
                return;
            }
        }
        
        // Fallback to localStorage if no section data found
        const sections = loadSectionData();
        const section = sections[sectionId] || {
            title: `${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} Section`,
            content: `This is the ${sectionId} section. Edit this content to update your website.`,
            image: ''
        };
        
        // Update form fields
        if (titleInput) titleInput.value = section.title;
        if (contentInput) contentInput.value = section.content;
        if (imageInput) imageInput.value = section.image || '';
        
        // Update preview
        updatePreview();
    } catch (error) {
        console.error('Error loading section:', error);
        showAlert('Failed to load section content', 'danger');
    } finally {
        // Remove loading state
        const form = document.getElementById('sectionForm');
        if (form) form.classList.remove('loading');
    }
}

// Update preview
function updatePreview() {
    const title = document.getElementById('sectionTitle')?.value || 'Section Title';
    const content = document.getElementById('sectionContent')?.value || 'This is a preview of the section content.';
    const imageUrl = document.getElementById('sectionImage')?.value || '';
    
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');
    
    if (previewTitle) previewTitle.textContent = title;
    
    if (previewContent) {
        // Create a preview that matches the website's styling
        let htmlContent = `
            <div class="container">
                <h2 class="section-title">${title}</h2>
                ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="img-fluid mb-4 rounded shadow">` : ''}
                <div class="section-content">
                    ${content.replace(/\n/g, '</p><p>')}
                </div>
            </div>
        `;
        
        // Apply some basic styling to match the website
        const style = `
            <style>
                .preview-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }
                .section-title {
                    color: #2c3e50;
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #f0f0f0;
                }
                .section-content p {
                    margin-bottom: 1rem;
                }
                .img-fluid {
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                }
                .shadow {
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
                }
            </style>
        `;
        
        previewContent.innerHTML = style + htmlContent;
    }
}

// Initialize content management
function initializeContentManagement() {
    const sections = document.querySelectorAll('[data-section]');
    const form = document.getElementById('sectionForm');
    const previewBtn = document.getElementById('previewBtn');
    const previewCard = document.getElementById('previewCard');
    
    // Load first section by default
    loadSection('home');
    
    // Handle section switching
    sections.forEach(section => {
        section.addEventListener('click', (e) => {
            e.preventDefault();
            loadSection(section.getAttribute('data-section'));
        });
    });
    
    // Handle form submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('sectionTitle')?.value || '';
            const content = document.getElementById('sectionContent')?.value || '';
            const imageUrl = document.getElementById('sectionImage')?.value || '';
            
            // Create HTML content for the section
            let sectionHtml = `
                <div class="container">
                    <h2>${title}</h2>
                    ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="img-fluid mb-4">` : ''}
                    <div class="section-content">
                        ${content}
                    </div>
                </div>
            `;
            
            try {
                // Show loading state
                form.classList.add('loading');
                
                // Save to the actual website file
                const result = await saveSection(currentSection, sectionHtml);
                
                if (result && result.success) {
                    // Also save to localStorage for backup
                    const sections = loadSectionData();
                    sections[currentSection] = { title, content, image: imageUrl };
                    saveSectionData(sections);
                    
                    showAlert('Section published successfully to website!', 'success');
                }
            } catch (error) {
                console.error('Error saving section:', error);
                showAlert('Failed to publish changes to website', 'danger');
            } finally {
                // Remove loading state
                form.classList.remove('loading');
            }
        });
    }
    
    // Handle preview button
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            updatePreview();
            previewCard.classList.remove('d-none');
        });
    }
    
    // Update preview on content change
    ['input', 'change'].forEach(event => {
        form?.addEventListener(event, updatePreview);
    });
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

// Chart instances
let visitorChart = null;
let trafficSourceChart = null;
let deviceChart = null;

// Update charts with real data
function updateCharts() {
    if (visitorsData.length === 0 || activityData.length === 0) return;
    
    updateAnalyticsStats();
    updateVisitorChart();
    updateTrafficSourceChart();
    updateDeviceChart();
    updateTopPagesList();
}

// Update analytics stats cards
function updateAnalyticsStats() {
    // Update stats cards
    document.getElementById('analyticsTotalVisitors').textContent = visitorsData.length.toLocaleString();
    
    // Active visitors (online in last 5 minutes)
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    const activeVisitors = visitorsData.filter(visitor => 
        new Date(visitor.lastVisit) > fiveMinutesAgo
    ).length;
    document.getElementById('analyticsActiveVisitors').textContent = activeVisitors.toLocaleString();
    
    // Total page views
    const totalPageViews = visitorsData.reduce((sum, visitor) => sum + (visitor.pageViews || 0), 0);
    document.getElementById('analyticsPageViews').textContent = totalPageViews.toLocaleString();
    
    // Average session duration
    if (activityData.length > 0) {
        const totalDuration = activityData.reduce((sum, activity) => sum + (activity.sessionDuration || 0), 0);
        const avgDuration = Math.round(totalDuration / activityData.length);
        const minutes = Math.floor(avgDuration / 60);
        const seconds = avgDuration % 60;
        document.getElementById('analyticsAvgSession').textContent = `${minutes}m ${seconds}s`;
    } else {
        document.getElementById('analyticsAvgSession').textContent = '0m';
    }
}

// Create/update visitor chart (line chart)
function updateVisitorChart() {
    const canvas = document.getElementById('visitorChart');
    if (!canvas) return;
    
    // Get or create chart instance
    const chartContainer = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    
    // Group activity by day
    const last7Days = Array(7).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });
    
    const dailyVisits = {};
    last7Days.forEach(day => dailyVisits[day] = 0);
    
    activityData.forEach(activity => {
        const day = activity.time.split('T')[0];
        if (dailyVisits.hasOwnProperty(day)) {
            dailyVisits[day]++;
        }
    });
    
    const data = {
        labels: last7Days.map(day => new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
            label: 'Visitors',
            data: last7Days.map(day => dailyVisits[day] || 0),
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            pointBackgroundColor: 'rgb(75, 192, 192)',
            pointBorderColor: '#fff',
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgb(75, 192, 192)',
            pointHoverBorderColor: '#fff',
            pointHitRadius: 10,
            pointBorderWidth: 2,
            pointRadius: 3
        }]
    };
    
    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            responsiveAnimationDuration: 0,
            plugins: {
                legend: { 
                    display: false
                },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    position: 'nearest',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { 
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: { 
                        size: 13 
                    },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Visitors: ${context.raw}`;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest',
                axis: 'x'
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 6,
                        padding: 5
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 5
                    }
                }
            },
            layout: {
                padding: 10
            }
        }
    };
    
    // Check if we have a previous chart instance and clean it up
    if (window.visitorChart) {
        if (window.visitorChart.chart) {
            window.visitorChart.chart.destroy();
        }
        if (window.visitorChart.resizeObserver) {
            window.visitorChart.resizeObserver.disconnect();
        }
    }
    
    // Create new chart instance and store it
    const chart = new Chart(ctx, config);
    
    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        if (chart) {
            chart.resize();
        }
    });
    
    // Start observing the chart container
    resizeObserver.observe(chartContainer);
    
    // Store the chart and observer for cleanup
    window.visitorChart = {
        chart: chart,
        resizeObserver: resizeObserver
    };
}

// Create/update traffic source chart (doughnut)
function updateTrafficSourceChart() {
    const canvas = document.getElementById('trafficSourceChart');
    if (!canvas) return;
    
    const chartContainer = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    
    // Simulate traffic sources (in a real app, this would come from your data)
    const sources = {
        'Direct': Math.floor(Math.random() * 50) + 30,
        'Organic Search': Math.floor(Math.random() * 40) + 20,
        'Social': Math.floor(Math.random() * 30) + 10,
        'Referral': Math.floor(Math.random() * 20) + 5,
        'Email': Math.floor(Math.random() * 15) + 5
    };
    
    const data = {
        labels: Object.keys(sources),
        datasets: [{
            data: Object.values(sources),
            backgroundColor: [
                'rgba(54, 162, 235, 0.9)',
                'rgba(75, 192, 192, 0.9)',
                'rgba(255, 206, 86, 0.9)',
                'rgba(153, 102, 255, 0.9)',
                'rgba(255, 159, 64, 0.9)'
            ],
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };
    
    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800,
                easing: 'easeInOutQuart'
            },
            responsiveAnimationDuration: 0,
            cutout: '65%',
            radius: '90%',
            plugins: {
                legend: { 
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        boxHeight: 8,
                        font: {
                            size: 11,
                            family: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    const style = meta.controller.getStyle(i);
                                    
                                    return {
                                        text: label,
                                        fillStyle: style.backgroundColor,
                                        strokeStyle: style.borderColor,
                                        lineWidth: style.borderWidth,
                                        hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { 
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: { 
                        size: 12 
                    },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 10
            }
        }
    };
    
    // Check if we have a previous chart instance and clean it up
    if (window.trafficSourceChart) {
        if (window.trafficSourceChart.chart) {
            window.trafficSourceChart.chart.destroy();
        }
        if (window.trafficSourceChart.resizeObserver) {
            window.trafficSourceChart.resizeObserver.disconnect();
        }
    }
    
    // Create new chart instance and store it
    const chart = new Chart(ctx, config);
    
    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        if (chart) {
            chart.resize();
        }
    });
    
    // Start observing the chart container
    resizeObserver.observe(chartContainer);
    
    // Store the chart and observer for cleanup
    window.trafficSourceChart = {
        chart: chart,
        resizeObserver: resizeObserver
    };
}

// Create/update device distribution chart (pie)
function updateDeviceChart() {
    const canvas = document.getElementById('deviceChart');
    if (!canvas) return;
    
    const chartContainer = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    
    // Count devices
    const deviceCounts = {
        'Mobile': 0,
        'Desktop': 0,
        'Tablet': 0
    };
    
    visitorsData.forEach(visitor => {
        if (deviceCounts.hasOwnProperty(visitor.device)) {
            deviceCounts[visitor.device]++;
        } else {
            deviceCounts[visitor.device] = 1;
        }
    });
    
    // Sort devices by count (descending)
    const sortedDevices = Object.entries(deviceCounts)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value
        }), {});
    
    const colors = [
        'rgba(75, 192, 192, 0.9)',
        'rgba(54, 162, 235, 0.9)',
        'rgba(255, 159, 64, 0.9)'
    ];
    
    const data = {
        labels: Object.keys(sortedDevices),
        datasets: [{
            data: Object.values(sortedDevices),
            backgroundColor: colors.slice(0, Object.keys(sortedDevices).length),
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 8
        }]
    };
    
    const config = {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800,
                easing: 'easeInOutQuart'
            },
            responsiveAnimationDuration: 0,
            plugins: {
                legend: { 
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 8,
                        boxHeight: 8,
                        font: {
                            size: 11,
                            family: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { 
                        size: 12,
                        weight: '600'
                    },
                    bodyFont: { 
                        size: 12 
                    },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: 10
            },
            // Add percentage in the center of the doughnut
            plugins: {
                datalabels: {
                    formatter: (value, ctx) => {
                        const dataArr = ctx.chart.data.datasets[0].data;
                        const sum = dataArr.reduce((a, b) => a + b, 0);
                        const percentage = (value * 100 / sum).toFixed(1) + "%";
                        return percentage;
                    },
                    color: '#fff',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                }
            }
        }
    };
    
    // Check if we have a previous chart instance and clean it up
    if (window.deviceChart) {
        if (window.deviceChart.chart) {
            window.deviceChart.chart.destroy();
        }
        if (window.deviceChart.resizeObserver) {
            window.deviceChart.resizeObserver.disconnect();
        }
    }
    
    // Create new chart instance and store it
    const chart = new Chart(ctx, config);
    
    // Handle window resize
    const resizeObserver = new ResizeObserver(entries => {
        if (chart) {
            chart.resize();
        }
    });
    
    // Start observing the chart container
    resizeObserver.observe(chartContainer);
    
    // Store the chart and observer for cleanup
    window.deviceChart = {
        chart: chart,
        resizeObserver: resizeObserver
    };
}

// Update top pages list
function updateTopPagesList() {
    const topPagesList = document.getElementById('topPagesList');
    if (!topPagesList) return;
    
    // Count page views (in a real app, this would come from your data)
    const pageViews = {};
    activityData.forEach(activity => {
        const page = activity.page || '/unknown';
        pageViews[page] = (pageViews[page] || 0) + 1;
    });
    
    // Sort by view count
    const sortedPages = Object.entries(pageViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Calculate total views for percentage
    const totalViews = sortedPages.reduce((sum, [_, count]) => sum + count, 0);
    
    // Update the list
    topPagesList.innerHTML = sortedPages.map(([page, count]) => {
        const percentage = totalViews > 0 ? ((count / totalViews) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td>${page}</td>
                <td>${count.toLocaleString()}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }).join('');
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
