// Development Helper Script
document.addEventListener('DOMContentLoaded', function() {
  // Only run in development mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Create a dev indicator
    const devIndicator = document.createElement('div');
    devIndicator.style.position = 'fixed';
    devIndicator.style.bottom = '10px';
    devIndicator.style.left = '10px';
    devIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    devIndicator.style.color = '#333';
    devIndicator.style.padding = '5px 10px';
    devIndicator.style.borderRadius = '4px';
    devIndicator.style.fontSize = '12px';
    devIndicator.style.zIndex = '9999';
    devIndicator.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    // Show environment info
    devIndicator.innerHTML = `
      <strong>Development Mode</strong><br>
      API: ${config.apiBaseUrl}<br>
      Frontend: ${config.frontendUrl}
    `;
    
    document.body.appendChild(devIndicator);
    
    // Log development info to console
    console.log('%c HealthMate AI - Development Mode ', 'background: #2db36f; color: white; padding: 4px;');
    console.log('API URL:', config.apiBaseUrl);
    console.log('Frontend URL:', config.frontendUrl);
    console.log('Version:', config.version);
  }
});