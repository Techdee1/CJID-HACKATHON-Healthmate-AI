# HealthMate AI Frontend

This directory contains the frontend codebase for the HealthMate AI project, a multilingual health assistant designed to provide reliable health information in multiple Nigerian languages.

## 📋 Overview

The HealthMate AI frontend provides a user-friendly interface for interacting with the HealthMate AI system. It includes pages for:

- Home page with introduction and navigation
- Health chat interface for direct AI interactions
- Symptom checker
- Health tips and facts
- Health awareness resources
- User authentication

## 🛠️ Technology Stack

- HTML5, CSS3, JavaScript
- Firebase (Authentication and storage)
- Node.js server for local testing

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- Firebase account (for authentication features)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Set up Authentication with email/password method
   - Create a web app in your Firebase project
   - Download your Firebase configuration
   - Create a file named `firebase-config.js` with your Firebase configuration

3. Start the development server:
```bash
node server.js
```

4. Access the application at http://localhost:3000

## 📂 Project Structure

- `index.html` - Main landing page
- `chat.html` - Health chatbot interface
- `symptoms.html` - Symptom checker
- `tips.html` - Health tips and facts
- `awareness.html` - Health awareness resources
- `history.html` - Chat history for logged-in users
- `login.html` - User authentication
- `quiz.html` - Health knowledge quiz
- `styles.css`, `index.css`, `chat.css`, `symptoms.css` - Styling files
- `app.js` - Main application JavaScript
- `chatbot.js` - Chatbot functionality
- `awareness.js` - Awareness page functionality
- `server.js` - Local development server

## 🔌 API Integration

The frontend interacts with the HealthMate AI backend API. Key integrations include:

- Health analysis queries
- Language detection and translation
- Health facts retrieval
- Awareness content retrieval

## 🔒 Security Considerations

- Firebase authentication is used for user management
- Sensitive keys should be stored in environment variables, not in the codebase
- CORS is enabled on the backend to allow frontend requests

## 🖼️ UI/UX Design

The interface is designed to be:
- Accessible to users with various levels of technical expertise
- Mobile-responsive for use on different devices
- Clearly labeled with a disclaimer about medical advice
- Simple and intuitive to navigate

## 🧪 Testing

To test the frontend:
1. Ensure the backend server is running
2. Start the frontend server with `node server.js`
3. Navigate to the different pages and test functionality
4. Test with different languages if testing multilingual features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.