document.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.querySelector('.welcome-screen');
    const chatScreen = document.querySelector('.chat-screen');
    const firstAidScreen = document.querySelector('.first-aid-screen');

    // NEW: Sidebar Elements
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarToggleButton = document.querySelector('.sidebar-toggle-button');
    const closeSidebarButton = document.querySelector('.close-sidebar-button');
    const navItems = document.querySelectorAll('.nav-item'); // All sidebar navigation links

    // NEW: New Screen Elements
    const symptomsHistoryScreen = document.querySelector('.symptoms-history-screen');
    const healthFactsScreen = document.querySelector('.health-facts-screen');
    const emergencyContactsScreen = document.querySelector('.emergency-contacts-screen');
    const settingsScreen = document.querySelector('.settings-screen');
    const allBackButtons = document.querySelectorAll('.app-screen .back-button');


    const startChatButton = document.getElementById('start-chat-button');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.querySelector('.chat-messages');
    const loadingDiagnosis = document.querySelector('.loading-diagnosis');
    const diagnosisPanel = document.querySelector('.diagnosis-panel');
    
    // Elements for integrated diagnosis panel
    const diagnosisPanelTitle = document.getElementById('diagnosis-panel-title');
    const urgentDiagnosisContent = document.getElementById('urgent-diagnosis-content');
    const analysisSummarySection = document.getElementById('analysis-summary-section');
    const confidenceScoreSection = document.getElementById('confidence-score-section');
    const nextStepsSection = document.getElementById('next-steps-section');

    // Prompting UI elements
    const promptSuggestionArea = document.querySelector('.prompt-suggestion-area');
    const promptButtons = document.querySelectorAll('.prompt-button');
    const refreshPromptsButton = document.querySelector('.refresh-prompts-button');

    // Buttons
    const closeDiagnosisPanelButton = document.getElementById('close-diagnosis-panel');
    const reopenPanelButton = document.getElementById('reopen-panel-button');
    const callEmergencyButton = document.getElementById('call-emergency-button');
    const performFirstAidButton = document.getElementById('perform-first-aid-button');

    const backToChatButton = document.getElementById('back-to-chat'); // Specific to First Aid screen

    let chatHistory = [];
    let conversationStep = 0; // To control AI interview flow
    let symptomsCollected = {}; // Store collected symptoms
    let currentTriageLevel = ''; // Store the last determined triage level

    // Keep track of the currently active main content screen
    let currentActiveContentScreen = welcomeScreen; 

    // --- Screen Management Functions ---
    function showScreen(screenToShow, fromSidebar = false) {
        // Hide all major app content screens
        [welcomeScreen, chatScreen, firstAidScreen, symptomsHistoryScreen, healthFactsScreen, emergencyContactsScreen, settingsScreen].forEach(screen => {
            screen.classList.remove('active-screen');
        });

        // Activate the desired screen
        screenToShow.classList.add('active-screen');
        currentActiveContentScreen = screenToShow; // Update the tracking variable

        // If navigation happened from sidebar, close the sidebar
        if (fromSidebar) {
            closeSidebar();
        }
    }

    // --- Sidebar Functions ---
    // function openSidebar() {
    //     sidebar.classList.add('active');
    //     sidebarOverlay.classList.add('active');
    // }

    // function closeSidebar() {
    //     sidebar.classList.remove('active');
    //     sidebarOverlay.classList.remove('active');
    // }

    // --- Chat Functions ---
    function addMessage(text, sender) {
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble', sender);
        messageBubble.textContent = text;
        chatMessages.appendChild(messageBubble);

        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function simulateAiTyping() {
        const typingBubble = document.createElement('div');
        typingBubble.classList.add('message-bubble', 'ai', 'typing-indicator');
        typingBubble.innerHTML = '<span>.</span><span>.</span><span>.</span>'; // Simple ellipsis animation
        chatMessages.appendChild(typingBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingBubble;
    }

    function removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.remove();
        }
    }

    // --- AI Conversation Logic ---
    async function handleAiConversation(userMessage) {
        let aiResponse = '';
        let typingIndicator = simulateAiTyping();

        // Simple delay to simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 800));
        removeTypingIndicator(typingIndicator);

        if (conversationStep === 0) {
            symptomsCollected.mainSymptom = userMessage;
            aiResponse = "How long have you had this symptom?";
            conversationStep++;
        } else if (conversationStep === 1) {
            symptomsCollected.duration = userMessage;
            aiResponse = "Do you have a fever, body aches, or fatigue?";
            conversationStep++;
        } else if (conversationStep === 2) {
            symptomsCollected.additionalSymptoms = userMessage;
            aiResponse = "Are you on any medication, or have any pre-existing conditions?";
            conversationStep++;
        } else if (conversationStep === 3) {
            symptomsCollected.otherInfo = userMessage;
            aiResponse = "Thank you for providing the information. Let me analyze your symptoms...";
            conversationStep++;
            // Trigger diagnosis after final question
            triggerDiagnosis();
            return; // Don't add a regular message bubble here, as diagnosis will take over
        } else {
            // Fallback for unexpected inputs or after diagnosis
            aiResponse = "I'm currently focused on analyzing your symptoms. Please wait for the diagnosis or start a new chat if you have a different concern.";
        }

        addMessage(aiResponse, 'ai');
    }

    function triggerDiagnosis() {
        chatInput.disabled = true;
        sendButton.disabled = true;
        loadingDiagnosis.style.display = 'flex'; // Show loading state
        
        reopenPanelButton.style.display = 'none'; // Hide reopen button while diagnosis is being prepared/displayed

        // Simulate network delay for diagnosis
        setTimeout(() => {
            loadingDiagnosis.style.display = 'none'; // Hide loading state

            // Determine diagnosis based on collected symptoms (simplified logic)
            let condition = "Common Cold";
            let triage = "mild";
            let analysis = [
                "Symptoms include: " + symptomsCollected.mainSymptom,
                "Duration: " + symptomsCollected.duration,
                "Additional notes: " + (symptomsCollected.additionalSymptoms || "None specified.")
            ];
            let nextSteps = [
                "Rest and stay hydrated.",
                "Over-the-counter pain relievers can help with discomfort.",
                "Symptoms usually resolve within a week."
            ];
            let confidence = "92%";

            // Simple logic for urgent/moderate for demo purposes
            const mainSymptomLower = symptomsCollected.mainSymptom.toLowerCase();
            if (mainSymptomLower.includes("chest pain") ||
                mainSymptomLower.includes("difficulty breathing") ||
                mainSymptomLower.includes("sudden weakness on one side") ||
                mainSymptomLower.includes("sudden numbness") ||
                mainSymptomLower.includes("slurred speech")) {
                triage = "urgent";
                condition = "Possible Stroke/Heart Attack Warning Signs"; // More accurate phrasing
                analysis = [
                    "User reported " + symptomsCollected.mainSymptom + ".",
                    "Immediate medical attention required based on symptom. These symptoms are consistent with serious conditions."
                ];
                nextSteps = ["Call emergency services immediately.", "Do not drive yourself.", "Stay calm and wait for help."];
            } else if (mainSymptomLower.includes("severe headache") ||
                        mainSymptomLower.includes("high fever for days") ||
                        mainSymptomLower.includes("abdominal pain")) {
                triage = "moderate";
                condition = "Migraine/Persistent Fever/Abdominal Issue";
                analysis = [
                    "Severe headache, persistent fever, or significant abdominal pain experienced.",
                    "Symptoms warrant a timely medical consultation."
                ];
                nextSteps = [
                    "See a doctor within 24 hours.",
                    "Monitor symptoms closely for changes.",
                    "Avoid self-medicating without professional advice."
                ];
            }
            
            currentTriageLevel = triage; // Store for later use if needed

            displayDiagnosis(condition, triage, analysis, confidence, nextSteps);

        }, 2000); // 2-second loading simulation
    }

    function displayDiagnosis(condition, triage, analysisSummary, confidence, nextSteps) {
        document.getElementById('diagnosis-condition').textContent = condition;

        const triageElem = document.getElementById('diagnosis-triage');
        let triageText = triage.charAt(0).toUpperCase() + triage.slice(1);
        let triageTime = '';
        if (triage === 'urgent') triageTime = 'immediately';
        else if (triage === 'moderate') triageTime = 'within 24 hrs';
        else triageTime = 'within 3-5 days';

        triageElem.innerHTML = `<span class="level-indicator"></span> ${triageText} (See doctor ${triageTime})`;
        triageElem.className = 'triage-level ' + triage; // Set class for styling

        // Set indicator based on triage level
        const indicatorSpan = triageElem.querySelector('.level-indicator');
        if (triage === 'urgent') indicatorSpan.textContent = '🟥';
        else if (triage === 'moderate') indicatorSpan.textContent = '🟡';
        else indicatorSpan.textContent = '🟢';

        // Handle urgent vs. regular diagnosis panel content
        if (triage === 'urgent') {
            diagnosisPanel.classList.add('urgent'); // Add class for specific styling
            diagnosisPanelTitle.textContent = 'Urgent Action Required';
            urgentDiagnosisContent.style.display = 'flex'; // Show urgent content
            analysisSummarySection.style.display = 'none'; // Hide regular sections
            confidenceScoreSection.style.display = 'none';
            nextStepsSection.style.display = 'none';
        } else {
            diagnosisPanel.classList.remove('urgent'); // Remove urgent class
            diagnosisPanelTitle.textContent = 'Diagnosis Result';
            urgentDiagnosisContent.style.display = 'none'; // Hide urgent content
            analysisSummarySection.style.display = 'block'; // Show regular sections
            confidenceScoreSection.style.display = 'block';
            nextStepsSection.style.display = 'block';

            const analysisList = document.getElementById('analysis-summary-list');
            analysisList.innerHTML = ''; // Clear previous
            analysisSummary.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                analysisList.appendChild(li);
            });

            document.getElementById('confidence-value').textContent = confidence;

            const nextStepsList = document.getElementById('next-steps-list');
            nextStepsList.innerHTML = ''; // Clear previous
            nextSteps.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                nextStepsList.appendChild(li);
            });
        }
        diagnosisPanel.style.display = 'flex'; // Show panel
        diagnosisPanel.classList.add('active');
        chatInput.disabled = false; // Re-enable input
        sendButton.disabled = false;
        chatInput.value = ''; // Clear any remaining input
    }


    // --- Event Listeners ---
    startChatButton.addEventListener('click', () => {
        showScreen(chatScreen);
        // Show the prompt suggestion area when chat screen is activated
        promptSuggestionArea.style.display = 'flex';
        // Set Chat nav item as active
        document.querySelector('.nav-item[data-target-screen="chat-screen"]').classList.add('active');
        setTimeout(() => chatInput.focus(), 600);
    });

    sendButton.addEventListener('click', () => {
        const userMessage = chatInput.value.trim();
        if (userMessage) {
            // Hide the prompt suggestion area when user sends a message
            promptSuggestionArea.style.display = 'none';

            addMessage(userMessage, 'user');
            chatInput.value = ''; // Clear input
            handleAiConversation(userMessage);
            
            // Hide diagnosis panel and any reopen button when user sends new message (starting new diagnosis)
            diagnosisPanel.classList.remove('active', 'urgent'); // Also remove urgent class
            diagnosisPanel.style.display = 'none'; // Explicitly hide
            reopenPanelButton.style.display = 'none'; // Hide any reopen button immediately
            
            // Reset conversation step for a new "interview" if desired, or allow continuous chat
            if(conversationStep >= 4) { // If diagnosis was triggered, reset for next chat
                conversationStep = 0; 
                symptomsCollected = {}; // Clear collected data
            }
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });

    // Handle input field changes to hide/show prompt area
    chatInput.addEventListener('input', () => {
        if (chatInput.value.length > 0) {
            promptSuggestionArea.style.display = 'none'; // Hide if user starts typing
        } else {
            // Only show if no diagnosis panel is active and input is empty
            if (!diagnosisPanel.classList.contains('active') && !reopenPanelButton.style.display === 'flex') {
                 promptSuggestionArea.style.display = 'flex';
            }
        }
    });

    // Prompt button click listener
    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            const promptText = button.dataset.prompt;
            chatInput.value = promptText;
            sendButton.click(); // Simulate sending the message
        });
    });

    // Refresh prompts button listener
    refreshPromptsButton.addEventListener('click', () => {
        promptSuggestionArea.style.display = 'flex';
        chatInput.value = ''; // Clear input if something was there
    });


    // Close Diagnosis Panel Button
    closeDiagnosisPanelButton.addEventListener('click', () => {
        diagnosisPanel.classList.remove('active');
        setTimeout(() => {
            diagnosisPanel.style.display = 'none';
            // Show reopen button based on current triage level
            if (currentTriageLevel === 'urgent') {
                reopenPanelButton.textContent = 'View Urgent Actions';
                reopenPanelButton.style.display = 'flex'; // Show the reopen button
            } else {
                reopenPanelButton.textContent = 'View Diagnosis';
                reopenPanelButton.style.display = 'flex'; // Show the reopen button
            }
        }, 300); // Small delay to allow transition to complete if any
    });

    // Reopen Diagnosis Panel Button
    reopenPanelButton.addEventListener('click', () => {
        diagnosisPanel.style.display = 'flex';
        diagnosisPanel.classList.add('active');
        reopenPanelButton.style.display = 'none'; // Hide reopen button when panel is open
    });

    // Call Emergency Button
    callEmergencyButton.addEventListener('click', () => {
        // In a real app, this would initiate a phone call
        alert('Calling emergency services...');
        window.location.href = 'tel:911'; // For demo, tries to initiate call
    });

    // Perform First Aid Button
    performFirstAidButton.addEventListener('click', () => {
        showScreen(firstAidScreen);
    });

    // Back button in First Aid Screen
    document.querySelector('.first-aid-screen .back-button').addEventListener('click', () => {
        showScreen(chatScreen);
        // After going back to chat, if the diagnosis was urgent, show the reopen button
        if (currentTriageLevel === 'urgent') {
            reopenPanelButton.textContent = 'View Urgent Actions';
            reopenPanelButton.style.display = 'flex';
        }
    });

    // NEW: Sidebar Toggle Button Event Listener
    sidebarToggleButton.addEventListener('click', openSidebar);

    // NEW: Close Sidebar Button Event Listener
    closeSidebarButton.addEventListener('click', closeSidebar);

    // NEW: Overlay click to close sidebar
    sidebarOverlay.addEventListener('click', closeSidebar);

    // NEW: Sidebar navigation items click listeners
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            const targetScreenId = item.dataset.targetScreen;
            let targetScreen;

            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to the clicked nav item
            item.classList.add('active');

            // Map data-target-screen to actual DOM elements
            switch (targetScreenId) {
                case 'chat-screen':
                    targetScreen = chatScreen;
                    // When navigating to chat from sidebar, ensure prompt area is visible if no chat happened yet
                    if (conversationStep === 0 && chatInput.value === '') {
                        promptSuggestionArea.style.display = 'flex';
                    }
                    break;
                case 'symptoms-history-screen':
                    targetScreen = symptomsHistoryScreen;
                    break;
                case 'health-facts-screen':
                    targetScreen = healthFactsScreen;
                    break;
                case 'emergency-contacts-screen':
                    targetScreen = emergencyContactsScreen;
                    break;
                case 'settings-screen':
                    targetScreen = settingsScreen;
                    break;
                default:
                    targetScreen = welcomeScreen; // Fallback
            }
            showScreen(targetScreen, true); // Pass true to close sidebar
        });
    });

    // NEW: Back buttons for all app screens (except chat which has sidebar toggle)
    allBackButtons.forEach(button => {
        button.addEventListener('click', () => {
            // This simple back will always go to chat screen for now.
            // For more complex navigation, you'd need to track history.
            showScreen(chatScreen);
            // Ensure chat nav item is active when going back to chat
            document.querySelector('.nav-item[data-target-screen="chat-screen"]').classList.add('active');
            // Remove active from other nav items
            navItems.forEach(nav => {
                if (nav.dataset.targetScreen !== 'chat-screen') {
                    nav.classList.remove('active');
                }
            });
        });
    });

    // Initial screen setup
    showScreen(welcomeScreen); 
});