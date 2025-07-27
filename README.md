# SKAHHE Admin Dashboard

A comprehensive admin dashboard for tracking and analyzing website visitors. This system allows you to monitor who is visiting your website, their behavior, and other important analytics.

## Features

- Real-time visitor tracking
- Detailed visitor profiles
- Session monitoring
- Page view analytics
- Device and browser detection
- Location tracking
- Responsive admin interface

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```
   cd skahhe
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Configuration

1. The dashboard is pre-configured with default settings. You can modify the following in `server.js` if needed:
   - Server port (default: 3000)
   - Data storage location (default: `./data/`)
   - CORS settings

2. To track visitors on your website, include the following script in your website's HTML:
   ```html
   <script src="http://your-server-address:3000/tracking.js"></script>
   ```
   Replace `your-server-address` with your server's IP address or domain name.

## Running the Application

1. Start the server:
   ```
   npm start
   ```
   For development with auto-reload:
   ```
   npm run dev
   ```

2. Access the admin dashboard at:
   ```
   http://localhost:3000/admin
   ```

## Data Storage

- Visitor data is stored in `./data/visitors.json`
- Activity logs are stored in `./data/activities.json`

## Security Considerations

1. **Production Use**:
   - Set up HTTPS for secure data transmission
   - Implement user authentication for the admin dashboard
   - Set appropriate CORS policies
   - Regularly back up the data directory

2. **Data Privacy**:
   - Comply with privacy regulations (GDPR, CCPA, etc.)
   - Implement data retention policies
   - Provide an opt-out mechanism for visitors

## API Endpoints

- `POST /api/track` - Track visitor activity
- `GET /api/visitors` - Get all visitors
- `GET /api/visitors/:id` - Get visitor details
- `GET /api/activities` - Get activity logs
- `GET /api/stats` - Get dashboard statistics

## Troubleshooting

- **Server not starting**: Check if port 3000 is available
- **Data not saving**: Ensure the `data` directory has write permissions
- **CORS errors**: Verify the allowed origins in `server.js`

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact your system administrator or open an issue in the repository.
