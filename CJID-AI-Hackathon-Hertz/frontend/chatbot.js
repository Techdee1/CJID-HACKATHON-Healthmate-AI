// API base URL - change to your local server address for testing
const API_BASE_URL = 'http://localhost:5000';

// DOM Elements
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const promptButtons = document.querySelectorAll('.prompt-button');
const refreshPromptsBtn = document.querySelector('.refresh-prompts-button');
const promptSuggestionArea = document.querySelector('.prompt-suggestion-area');
const loadingDiagnosis = document.querySelector('.loading-diagnosis');
const diagnosisPanel = document.querySelector('.diagnosis-panel');
const closeDiagnosisPanel = document.getElementById('close-diagnosis-panel');
const reopenPanelButton = document.getElementById('reopen-panel-button');

// Chat history storage
let chatHistory = [];
const STORAGE_KEY = 'healthmate_chat_history';

// Load chat history from localStorage
function loadChatHistory() {
  const savedHistory = localStorage.getItem(STORAGE_KEY);
  if (savedHistory) {
    try {
      chatHistory = JSON.parse(savedHistory);
      
      // Display the loaded messages
      chatHistory.forEach(message => {
        addMessageToUI(message.content, message.role, false);
      });
      
      // Hide prompt suggestions if we have chat history
      if (chatHistory.length > 0) {
        promptSuggestionArea.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }
}

// Save message to history
function saveMessageToHistory(content, role) {
  const message = {
    role: role, // 'user' or 'assistant'
    content: content,
    timestamp: new Date().toISOString()
  };
  
  chatHistory.push(message);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
}

// Add message to UI
function addMessageToUI(text, sender, saveToHistory = true) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
  
  const messageContent = document.createElement('div');
  messageContent.classList.add('message-content');
  messageContent.textContent = text;
  
  const messageTime = document.createElement('div');
  messageTime.classList.add('message-time');
  messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.appendChild(messageContent);
  messageDiv.appendChild(messageTime);
  
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  
  // Save to history if needed
  if (saveToHistory) {
    saveMessageToHistory(text, sender);
  }
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.classList.add('message', 'ai-message', 'typing-indicator');
  typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  typingDiv.id = 'typing-indicator';
  chatWindow.appendChild(typingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Send message to AI
async function sendMessageToAI(message) {
  try {
    showTypingIndicator();
    
    // Hide prompt suggestions once user sends a message
    promptSuggestionArea.style.display = 'none';
    
    // Check if this might be a symptom description
    const mightBeSymptoms = checkForSymptomDescription(message);
    
    // API call
    console.log("Sending message to API:", message);
    console.log("API URL:", `${API_BASE_URL}/api/health/analyze`);
    
    const response = await fetch(`${API_BASE_URL}/api/health/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: message
      })
    });
    
    const data = await response.json();
    console.log("API Response:", data);
    
    removeTypingIndicator();
    
    if (data.success) {
      // Add AI response to chat
      addMessageToUI(data.response, 'assistant');
      
      // If there's health analysis data and it looks like symptoms, show diagnosis panel
      if (data.health_analysis && mightBeSymptoms) {
        updateAndShowDiagnosisPanel(data.health_analysis);
      }
    } else {
      addMessageToUI("I'm sorry, I couldn't process your request. Please try again.", 'assistant');
    }
  } catch (error) {
    console.error('Error sending message to AI:', error);
    removeTypingIndicator();
    addMessageToUI("Sorry, there was an error connecting to the server. Please check your connection and try again.", 'assistant');
  }
}

// Check if message might be describing symptoms
function checkForSymptomDescription(message) {
  const symptomKeywords = [
    'pain', 'ache', 'hurt', 'sore', 'tender', 'throb', 
    'fever', 'chills', 'cold', 'flu', 'headache', 'migraine',
    'nausea', 'vomit', 'dizzy', 'vertigo', 'faint', 'weak',
    'tired', 'fatigue', 'exhaust', 'cough', 'sneeze', 'congestion',
    'runny', 'stuffy', 'breathing', 'breath', 'chest', 'heart',
    'stomach', 'diarrhea', 'constipation', 'blood', 'bleeding',
    'rash', 'itch', 'swelling', 'swell', 'I feel', 'I am feeling',
    'have been', 'experiencing', 'symptom'
  ];
  
  const lowercaseMsg = message.toLowerCase();
  return symptomKeywords.some(keyword => lowercaseMsg.includes(keyword));
}

// Update and show diagnosis panel
function updateAndShowDiagnosisPanel(healthData) {
  // Hide loading, show diagnosis
  loadingDiagnosis.style.display = 'none';
  diagnosisPanel.style.display = 'block';
  reopenPanelButton.style.display = 'none';
  
  // Update condition
  if (healthData.symptoms && healthData.symptoms.length > 0) {
    document.getElementById('diagnosis-condition').textContent = 
      healthData.condition || "Possible " + healthData.symptoms[0];
  }
  
  // Update triage level based on symptoms (simple logic)
  const triageElement = document.getElementById('diagnosis-triage');
  triageElement.innerHTML = '';
  
  let indicator = '🟡';
  let color = '#f59e0b';
  let text = 'Moderate (Consult a doctor)';
  
  const levelSpan = document.createElement('span');
  levelSpan.classList.add('level-indicator');
  levelSpan.textContent = indicator;
  
  triageElement.appendChild(levelSpan);
  triageElement.appendChild(document.createTextNode(' ' + text));
  triageElement.style.backgroundColor = '#fff8e6';
  triageElement.style.color = '#92400e';
  
  // Update analysis summary
  if (healthData.symptoms && healthData.symptoms.length > 0) {
    const summaryList = document.getElementById('analysis-summary-list');
    summaryList.innerHTML = '';
    
    healthData.symptoms.forEach(symptom => {
      const li = document.createElement('li');
      li.textContent = symptom;
      summaryList.appendChild(li);
    });
  }
  
  // Update confidence score
  document.getElementById('confidence-value').textContent = "85%";
  
  // Update next steps
  const nextStepsList = document.getElementById('next-steps-list');
  nextStepsList.innerHTML = '';
  
  const defaultSteps = [
    "Rest if possible",
    "Stay hydrated",
    "Monitor your symptoms"
  ];
  
  defaultSteps.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    nextStepsList.appendChild(li);
  });
}

// Function to initialize the chat event listeners
function initChat() {
  console.log("Initializing chat...");
  
  // Event listener for send button
  if (sendBtn) {
    console.log("Adding event listener to send button");
    sendBtn.addEventListener('click', () => {
      const message = userInput.value.trim();
      if (message) {
        console.log("Sending message:", message);
        addMessageToUI(message, 'user');
        userInput.value = '';
        sendMessageToAI(message);
      }
    });
  } else {
    console.error("Send button not found");
  }
  
  // Event listener for Enter key in input field
  if (userInput) {
    console.log("Adding event listener to input field");
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const message = userInput.value.trim();
        if (message) {
          console.log("Sending message (Enter key):", message);
          addMessageToUI(message, 'user');
          userInput.value = '';
          sendMessageToAI(message);
        }
      }
    });
  } else {
    console.error("User input field not found");
  }
  
  // Event listeners for prompt buttons
  if (promptButtons.length > 0) {
    console.log("Adding event listeners to prompt buttons");
    promptButtons.forEach(button => {
      button.addEventListener('click', () => {
        const promptText = button.getAttribute('data-prompt');
        console.log("Using prompt:", promptText);
        addMessageToUI(promptText, 'user');
        sendMessageToAI(promptText);
      });
    });
  }
  
  // Close diagnosis panel
  if (closeDiagnosisPanel) {
    closeDiagnosisPanel.addEventListener('click', () => {
      diagnosisPanel.style.display = 'none';
      reopenPanelButton.style.display = 'block';
    });
  }
  
  // Reopen diagnosis panel
  if (reopenPanelButton) {
    reopenPanelButton.addEventListener('click', () => {
      diagnosisPanel.style.display = 'block';
      reopenPanelButton.style.display = 'none';
    });
  }
  
  // Add welcome message
  if (chatWindow && chatWindow.children.length === 0) {
    addMessageToUI("Hello! I'm HealthMate AI, your health assistant. How can I help you today?", 'assistant', false);
  }
  
  // Focus on input field
  if (userInput) {
    userInput.focus();
  }
}

// Load chat history and initialize chat when page is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing chat");
  initChat();
  loadChatHistory();
});
