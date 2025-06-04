// HealthMate AI Configuration

// Determine if we're running locally or on the deployed version
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// Configuration object
const config = {
  // API URLs
  apiBaseUrl: isLocalhost 
    ? 'http://127.0.0.1:5000'  // Make sure this matches your backend URL
    : 'https://cjid-hackathon-healthmate-ai.onrender.com',  // Production
  
  // Frontend URLs
  frontendUrl: isLocalhost
    ? 'http://localhost:5000'  // Local development
    : 'https://frontend-rosy-seven-17.vercel.app',  // Production
  
  // Version information
  version: '1.1',
  
  // Cache duration in milliseconds
  cacheDuration: 60 * 60 * 1000, // 24 hours
};

// Prevent modifications to the config object
Object.freeze(config);