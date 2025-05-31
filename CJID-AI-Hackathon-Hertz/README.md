# HealthMate AI 2.0

![HealthMate AI Logo](https://via.placeholder.com/150?text=HealthMate+AI)

## 📋 Overview

HealthMate AI is a multilingual health assistant designed to provide reliable health information and guidance in multiple Nigerian languages. It combines advanced AI technologies to deliver personalized health advice, symptom analysis, and health awareness content.

> ⚠️ **Disclaimer**: HealthMate AI is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

## ✨ Features

- **Multilingual Health Analysis**: Process health queries in English, Igbo, Yoruba, Hausa, and Nigerian Pidgin
- **Symptom Analysis**: Identify symptoms, body parts, and medical terms from user descriptions
- **Health Facts & Tips**: Retrieve relevant health information and wellness tips
- **Health Awareness Content**: Access educational content on various health topics
- **Translation Services**: Automatically translate content between supported languages
- **User-friendly Interface**: Simple and intuitive web interface for all users

## 🛠️ Technology Stack

### Backend
- Python 3.10+
- Flask (Web framework)
- OpenAI API (AI processing)
- Azure Cognitive Services (Language detection, translation, health entity recognition)

### Frontend
- HTML5, CSS3, JavaScript
- Firebase (Authentication and storage)

## 🚀 Installation

### Prerequisites
- Python 3.10 or higher
- Node.js and npm (for frontend development)
- API keys for OpenAI and Azure services

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/healthmate-ai.git
cd healthmate-ai
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example` and add your API keys:
```
AZURE_TRANSLATOR_KEY=your_translator_key_here
AZURE_TRANSLATOR_ENDPOINT=your_translator_endpoint_here
OPENAI_API_KEY=your_openai_key_here
AZURE_LANGUAGE_KEY=your_language_key_here
AZURE_LANGUAGE_ENDPOINT=your_language_endpoint_here
```

5. Start the backend server:
```bash
cd backend
python app.py
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend server:
```bash
node server.js
```

4. Access the application at http://localhost:3000

## 📖 Usage

1. **Health Queries**: Type your health concern in any supported language in the chat interface
2. **Symptom Checker**: Navigate to the Symptoms page to check specific symptoms
3. **Health Tips**: Explore the Tips page for health advice and wellness information
4. **Health Awareness**: Learn about various health topics on the Awareness page

## 🔌 API Reference

HealthMate AI provides several API endpoints for integration with other applications. For detailed API documentation, see [API_DOCS.md](API_DOCS.md).

Key endpoints include:
- `/api/health/analyze` - Analyze health concerns
- `/api/health/languages` - Get supported languages
- `/api/health/facts` - Get health facts
- `/api/health/awareness/content` - Get health awareness content

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](frontend/LICENSE) file for details.

## 👥 Team

- CJID AI Hackathon Team Hertz

## 🙏 Acknowledgements

- OpenAI for providing the AI capabilities
- Azure Cognitive Services for language processing features
- Contributors and supporters of the CJID AI Hackathon