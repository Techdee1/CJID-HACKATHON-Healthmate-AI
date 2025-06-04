# HealthMate AI 🩺🤖

**Live Site:** [https://frontendhealthmate.vercel.app/](https://frontendhealthmate.vercel.app/)

## 📖 Overview

**HealthMate AI** is an AI-powered web assistant designed to provide users with basic, reliable health guidance. It helps individuals understand their symptoms, receive general health tips, and access simplified health awareness articles—all through a smooth, interactive interface.

This project aims to promote early awareness, discourage harmful self-medication, and support better everyday health decisions through accessible technology.

## 🔑 Key Features

* Home page with introduction and navigation
* Health chat interface for direct AI interactions
* Symptom Analysis
* Health tips and facts
* Health awareness articles

## 🚀 Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express
* **AI Engine:** Python (symptom analysis + health content generation)
* **Deployment:** Vercel (Frontend), Local/Render (Backend & AI)

## 📁 Project Category

**AI for Social Good**

---

## 🛠 Deployment (Local Setup)

To run the project locally, follow the steps below for both frontend and backend.

### 🔹 Clone the Repository

```bash
git clone https://github.com/yourusername/healthmate-ai.git
cd healthmate-ai
```

---

## 🧠 Backend & AI Engine Setup (Python)

### 🔧 Prerequisites

* **Python 3.10 or higher**
* **API keys** for OpenAI and Azure services

### 📦 Installation

1. **Create and activate a virtual environment**

   ```bash
   python -m venv venv
   ```

   **For Windows:**

   ```bash
   venv\Scripts\activate
   ```

   **For macOS/Linux:**

   ```bash
   source venv/bin/activate
   ```

2. **Install dependencies**

   ```bash
   pip install -r ../requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root (one level up from the `backend` folder), based on `.env.example`. Add your OpenAI and Azure API keys.

4. **Run the Python backend**

   ```bash
   python app.py
   ```

---

## 🌐 Frontend Setup

1. Navigate to the `frontend` folder:

   ```bash
   cd frontend
   ```

2. Open the project with **Live Server** (e.g., using VS Code Live Server extension) or any local static server tool.

> Make sure the backend (`app.py`) is running before you interact with the frontend. The frontend communicates with the AI server for processing health queries.

---

## 💡 Contributing

Contributions are welcome!
Feel free to fork the repo and submit a pull request. For major changes, open an issue first to discuss your proposal.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
