// API base URL - change to your local server address for testing
const API_BASE_URL = 'http://localhost:5000';

// Update the checkSymptoms function to work with the new HTML structure
async function checkSymptoms() {
  const input = document.getElementById("symptomInput");
  const resultsDiv = document.getElementById("symptomResults");
  
  if (!input || !input.value.trim()) {
    alert("Please describe your symptoms.");
    return;
  }
  
  // Show the results container and add loading state
  resultsDiv.classList.remove("hidden");
  resultsDiv.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Analyzing your symptoms...</p>
    </div>
  `;
  
  try {
    // Call the backend API
    const response = await fetch(`${API_BASE_URL}/api/health/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: input.value })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Format detected symptoms
      let symptomsHtml = '';
      if (data.health_analysis && data.health_analysis.symptoms.length > 0) {
        symptomsHtml = `
          <div class="detected-info">
            Detected symptoms: ${data.health_analysis.symptoms.join(', ')}
          </div>
        `;
      }
      
      // Format duration
      let durationHtml = '';
      if (data.health_analysis && data.health_analysis.time_expressions.length > 0) {
        durationHtml = `
          <div class="detected-info warning-tag">
            Duration: ${data.health_analysis.time_expressions.join(', ')}
          </div>
        `;
      }
      
      // Update the results area with the AI response
      resultsDiv.innerHTML = `
        <h3>Analysis Results</h3>
        <div class="result-summary">${data.response}</div>
        <div class="detection-tags">
          ${symptomsHtml}
          ${durationHtml}
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `
        <h3>Analysis Error</h3>
        <p class="result-summary">Sorry, I couldn't analyze your symptoms. Please try again.</p>
      `;
    }
  } catch (error) {
    console.error('Error calling API:', error);
    resultsDiv.innerHTML = `
      <h3>Connection Error</h3>
      <p class="result-summary">Network error. Please check your connection and try again.</p>
    `;
  }
}

const quizData = [
  {
    question: "How many hours of sleep are recommended for adults?",
    options: ["5-6 hours", "7-9 hours", "10-12 hours"],
    answer: "7-9 hours"
  },
  // Add more questions as needed
];

let currentQuestion = 0;

function loadQuestion() {
  const questionEl = document.getElementById('question');
  const optionsEl = document.getElementById('options');
  const current = quizData[currentQuestion];

  // Check if elements exist before trying to access properties
  if (questionEl) {
    questionEl.textContent = current.question;
  }
  if (optionsEl) {
    optionsEl.innerHTML = '';

    current.options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.addEventListener('click', () => {
        if (option === current.answer) {
          console.log('Correct!'); // Replaced alert
        } else {
          console.log('Incorrect!'); // Replaced alert
        }
      });
      optionsEl.appendChild(btn);
    });
  }
}

// Ensure nextBtn exists before adding event listener
const nextBtn = document.getElementById('nextBtn');
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    currentQuestion = (currentQuestion + 1) % quizData.length;
    loadQuestion();
  });
}

// Ensure symptomChart exists before initializing Chart
const ctx = document.getElementById('symptomChart');
if (ctx) {
  const symptomChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3'],
      datasets: [{
        label: 'Headache Severity',
        data: [3, 2, 4],
        borderColor: 'rgba(45, 179, 111, 1)',
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 5
        }
      }
    }
  });
}

// Create sidebar overlay dynamically
function createSidebarOverlay() {
  const overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    const newOverlay = document.createElement('div');
    newOverlay.className = 'sidebar-overlay';
    newOverlay.addEventListener('click', toggleSidebar);
    document.body.appendChild(newOverlay);
  }
}

// Function to toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const toggleButton = document.querySelector('.nav-toggle');
  
  // Toggle sidebar visibility
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
  
  // Toggle overlay
  if (overlay) {
    overlay.classList.toggle('active');
  }
  
  // Toggle aria-expanded attribute for accessibility
  if (toggleButton) {
    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
    toggleButton.setAttribute('aria-expanded', !isExpanded);
  }
  
  // Prevent body scrolling when sidebar is open
  document.body.classList.toggle('no-scroll');
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Close sidebar when clicking on overlay
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', toggleSidebar);
  }
  
  // Close sidebar when pressing Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        toggleSidebar();
      }
    }
  });
  
  // Handle back buttons
  const backButtons = document.querySelectorAll('.back-button');
  backButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.history.back();
    });
  });

  // Create sidebar overlay if it doesn't exist
  createSidebarOverlay();
});

// Initial load of quiz question if elements are present
if (document.getElementById('question') && document.getElementById('options')) {
  loadQuestion();
}
