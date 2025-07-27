// Tracking script for the main website
(function() {
    // Configuration
    const config = {
        apiEndpoint: 'http://localhost:3000/api/visitor', // Update with your actual API endpoint
        trackPageViews: true,
        trackSessions: true,
        trackLocation: true,
        trackDevices: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        heartbeatInterval: 5 * 60 * 1000 // 5 minutes
    };

    // Visitor data
    let visitorId = localStorage.getItem('visitorId');
    let sessionId = null;
    let lastActivity = Date.now();
    let heartbeatInterval = null;

    // Initialize tracking
    function init() {
        // Generate visitor ID if it doesn't exist
        if (!visitorId) {
            visitorId = 'visitor-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitorId', visitorId);
        }

        // Start a new session
        startNewSession();

        // Track page view
        if (config.trackPageViews) {
            trackPageView();
        }

        // Set up activity listeners
        setupActivityListeners();

        // Start heartbeat
        startHeartbeat();
    }

    // Start a new session
    function startNewSession() {
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
        lastActivity = Date.now();
        
        // Send session start event
        sendEvent('session_start', {
            url: window.location.href,
            referrer: document.referrer
        });
    }

    // Track page view
    function trackPageView() {
        const pageData = {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        };

        // Get device and browser info
        if (config.trackDevices) {
            pageData.device = getDeviceInfo();
            pageData.browser = getBrowserInfo();
            pageData.screen = getScreenInfo();
        }

        // Get location if enabled
        if (config.trackLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                pageData.location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                sendEvent('page_view', pageData);
            }, () => {
                // If geolocation fails, send without location
                sendEvent('page_view', pageData);
            }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        } else {
            sendEvent('page_view', pageData);
        }
    }

    // Set up activity listeners
    function setupActivityListeners() {
        const events = ['mousemove', 'scroll', 'keydown', 'click', 'touchstart'];
        
        events.forEach(event => {
            window.addEventListener(event, () => {
                lastActivity = Date.now();
                // Extend session if it was about to expire
                if (Date.now() - lastActivity > config.sessionTimeout - 60000) {
                    sendEvent('session_heartbeat');
                }
            }, { passive: true });
        });

        // Check for session timeout
        setInterval(() => {
            if (Date.now() - lastActivity > config.sessionTimeout) {
                endSession();
            }
        }, 60000); // Check every minute

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Page is hidden, consider ending the session
                endSession();
            } else if (document.visibilityState === 'visible') {
                // Page is visible again, start a new session
                startNewSession();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', endSession);
    }

    // Start heartbeat to keep session alive
    function startHeartbeat() {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        heartbeatInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                sendEvent('session_heartbeat');
            }
        }, config.heartbeatInterval);
    }

    // End current session
    function endSession() {
        if (!sessionId) return;
        
        const sessionDuration = Math.floor((Date.now() - lastActivity) / 1000);
        
        sendEvent('session_end', {
            duration: sessionDuration,
            url: window.location.href
        });
        
        sessionId = null;
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    // Send event to server
    function sendEvent(eventType, eventData = {}) {
        const data = {
            event: eventType,
            visitor_id: visitorId,
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            ...eventData
        };

        // In a real implementation, you would send this to your server
        // For now, we'll log it to the console
        console.log('Tracking event:', data);
        
        // Example fetch request (commented out as we don't have an API yet)
        /*
        fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .catch(error => console.error('Error sending tracking data:', error));
        */
    }

    // Helper functions to get device/browser info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        
        return {
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            isMobile: /Mobi|Android|iPhone|iPad|iPod/i.test(ua),
            isTablet: /iPad|Android(?!.*Mobile)|Tablet/i.test(ua),
            isDesktop: !/Mobi|Android|iPhone|iPad|iPod/i.test(ua)
        };
    }

    function getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = '';
        
        // Detect browser
        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/([0-9.]+)/)[1];
        } else if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/([0-9.]+)/)[1];
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
            version = ua.match(/Version\/([0-9.]+)/)[1];
        } else if (ua.indexOf('Edge') > -1) {
            browser = 'Edge';
            version = ua.match(/Edge\/([0-9.]+)/)[1];
        } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
            browser = 'Internet Explorer';
            version = ua.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/)[1];
        }
        
        return { name: browser, version };
    }

    function getScreenInfo() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
            pixelRatio: window.devicePixelRatio || 1
        };
    }

    // Start tracking
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
