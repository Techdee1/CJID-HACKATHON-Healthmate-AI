import httpx # Import httpx
import os
import sys
import requests
import uuid
import json
# import openai
from openai import OpenAI
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient
import logging

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from translation_service import detect_language, translate_to_english, translate_to_language

# Load environment variables
load_dotenv()

# Azure Health Analytics configuration
AZURE_LANGUAGE_KEY = os.getenv("AZURE_HEALTH_KEY")
AZURE_LANGUAGE_ENDPOINT = os.getenv("AZURE_HEALTH_ENDPOINT")

# OpenAI configuration
# openai.api_key = os.getenv("OPENAI_API_KEY")

# Supported languages
SUPPORTED_LANGUAGES = {
    "en": "English",
    "ig": "Igbo",
    "yo": "Yoruba",
    "ha": "Hausa",
    "pcm": "Nigerian Pidgin"
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        # logging.FileHandler("healthmate.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("healthmate")

def process_user_message(user_input):
    """
    Process user message through the full pipeline:
    1. Detect language
    2. Translate to English if needed
    3. Analyze with Azure Health
    4. Process with OpenAI
    5. Translate back to original language
    """
    # Step 1: Detect language
    detected_language = detect_language(user_input)
    
    # Step 2: Check if language is supported
    if detected_language not in SUPPORTED_LANGUAGES:
        return {
            "success": False,
            "message": "Language not supported. We currently support English, Igbo, Yoruba, Hausa, and Nigerian Pidgin."
        }
    
    # Step 3: Translate to English if necessary
    if detected_language != "en":
        english_text = translate_to_english(user_input, detected_language)
    else:
        english_text = user_input
    
    # Step 4: Analyze with Azure Health
    health_analysis = analyze_with_azure_health(english_text)
    
    # Step 5: Process with OpenAI
    openai_response = process_with_openai(english_text, health_analysis)
    
    # Step 6: Translate back to original language if necessary
    if detected_language != "en":
        final_response = translate_to_language(openai_response, detected_language)
    else:
        final_response = openai_response
    
    # Return results
    return {
        "success": True,
        "detected_language": SUPPORTED_LANGUAGES[detected_language],
        "language_code": detected_language,
        "original_text": user_input,
        "english_translation": english_text if detected_language != "en" else None,
        "health_analysis": health_analysis,
        "response": final_response
    }

def analyze_with_azure_health(text):
    """
    Analyze the text using Azure Health Analytics via the Azure SDK
    with the asynchronous healthcare entities API
    """
    try:
        # Get credentials from environment
        endpoint = os.getenv("AZURE_LANGUAGE_ENDPOINT")
        key = os.getenv("AZURE_LANGUAGE_KEY")
        
        # Initialize the client
        client = TextAnalyticsClient(
            endpoint=endpoint, 
            credential=AzureKeyCredential(key)
        )
        
        # Prepare documents for analysis
        documents = [text]
        
        # Perform health entity recognition (async operation)
        poller = client.begin_analyze_healthcare_entities(documents)
        result = poller.result()
        
        # Process the results
        organized_entities = {
            "symptoms": [],
            "body_parts": [],
            "time_expressions": [],
            "medications": [],
            "relations": []
        }
        
        docs = [doc for doc in result if not doc.is_error]
        
        if docs:
            doc = docs[0]  # Get the first document
            
            # Extract entities
            for entity in doc.entities:
                if entity.category == "SymptomOrSign":
                    organized_entities["symptoms"].append({
                        "text": entity.text,
                        "normalized": entity.normalized_text or entity.text
                    })
                elif entity.category == "BodyStructure":
                    organized_entities["body_parts"].append({
                        "text": entity.text,
                        "normalized": entity.normalized_text or entity.text
                    })
                elif entity.category == "Time":
                    organized_entities["time_expressions"].append(entity.text)
                elif entity.category == "MedicationName":
                    organized_entities["medications"].append({
                        "text": entity.text,
                        "normalized": entity.normalized_text or entity.text
                    })
            
            # Extract important relations
            for relation in doc.entity_relations:
                if relation.relation_type in ["TimeOfCondition", "QualifierOfCondition", "DosageOfMedication"]:
                    relation_info = {
                        "type": relation.relation_type,
                        "roles": []
                    }
                    
                    for role in relation.roles:
                        relation_info["roles"].append({
                            "name": role.name,
                            "entity": role.entity.text
                        })
                    
                    organized_entities["relations"].append(relation_info)
        
        # Simplify the return format for the OpenAI prompt
        simplified = {
            "symptoms": [s["text"] for s in organized_entities["symptoms"]],
            "body_parts": [b["text"] for b in organized_entities["body_parts"]],
            "time_expressions": organized_entities["time_expressions"],
            "medications": [m["text"] for m in organized_entities["medications"]]
        }
        
        return simplified
        
    except Exception as e:
        logger.error(f"Error analyzing with Azure Health: {e}")
        return {
            "symptoms": [],
            "body_parts": [],
            "time_expressions": [],
            "medications": []
        }

def process_with_openai(text, health_analysis):
    """
    Process the analyzed text with OpenAI to get a helpful response
    """
    # Create a prompt that includes the health analysis
    symptoms = ", ".join(health_analysis["symptoms"]) if health_analysis["symptoms"] else "none specified"
    body_parts = ", ".join(health_analysis["body_parts"]) if health_analysis["body_parts"] else "none specified"
    time_expressions = ", ".join(health_analysis["time_expressions"]) if health_analysis["time_expressions"] else "none specified"
    medications = ", ".join(health_analysis["medications"]) if health_analysis["medications"] else "none mentioned"
    
    # Add citation guidance to the prompt
    prompt = f"""
    You are 'Healthmate AI', a friendly and compassionate AI health information assistant. Your purpose is to help users in a Nigerian/African context understand their symptoms in a general way and to strongly and clearly encourage them to consult a qualified healthcare professional (like a doctor or nurse) for an accurate diagnosis and treatment. You MUST NOT provide a medical diagnosis or suggest specific medications. Your communication style should be warm, respectful, patient, and very easy to understand, as if you were a trusted, knowledgeable community health advisor or a caring elder.
    Patient message: "{text}"
    
    Extracted health information:
    - Symptoms: {symptoms}
    - Body parts: {body_parts}
    - Duration/Time: {time_expressions}
    - Medications: {medications}

    Provide a brief and helpful response addressing their health concerns. Please structure your response meticulously as follows:

    1. **Warm, Empathetic & Respectful Acknowledgement:**
    * Start by sincerely acknowledging the symptoms they've shared. Validate their concerns and how they might be feeling.
    * Use phrases like: "I hear you, and I understand that experiencing [mention a general nature of the symptom, e.g., 'this discomfort,' 'these feelings of being unwell,' 'this worry'] can be quite distressing/uncomfortable."
    * Maintain a tone of genuine care and respect throughout the entire response.

    2. **General, Non-Alarming Health Information :**
    * Provide *very general* information about what *might* be associated with such symptoms. Focus on broad categories or common, less serious possibilities without causing alarm.
    * **Crucially, use extremely simple language.** Avoid all medical jargon. If you absolutely must use a term that might be unfamiliar, immediately explain it in plain, everyday terms. For instance, instead of just saying 'inflammation,' you could say 'inflammation, which is like a redness, swelling, or irritation your body uses to protect itself.'
    * Frame this information as general possibilities, not a diagnosis for the user. E.g., "Sometimes, when people experience symptoms like [user's symptom], it could be related to general things such as [general category 1, e.g., 'the body reacting to something new it encountered'], or perhaps [general category 2, e.g., 'a sign that the body needs more rest or different nutrients'], or even [general category 3, e.g., 'a common bug that many people get']."
    * **Never list multiple serious diseases as possibilities.** Keep it general and focused on steering them to a doctor.

    3. **Clear, Kind, and Firm Guidance to See a Doctor/Healthcare Professional:**
    * This is the MOST CRITICAL part. Clearly, kindly, but firmly explain *why* it is essential to see a doctor, nurse, or visit a clinic/hospital.
    * Emphasize that your information is *not* a diagnosis and cannot replace the expertise of a healthcare professional who can examine them in person.
    * Use direct but gentle phrasing: "It is very important, my dear, to talk to a doctor or a qualified nurse about these symptoms. They are the only ones who can do a proper check-up, find out exactly what is happening, and give you the right advice and treatment to help you feel better."
    * Reinforce the limitations: "While I can share some general information, I am an AI and cannot see you or know your full health history. A healthcare professional can do that."

    4. **Basic, Safe, and Supportive Self-Care Suggestions :**
    * Offer 1-2 very general, safe, and widely accepted self-care suggestions that *might* provide some comfort *while they are arranging to see a doctor*. These are not cures or treatments.
    * Examples: "While you prepare to see the doctor, simple things like making sure you are drinking enough clean water and getting adequate rest can be helpful for your body's overall well-being." Or, "Sometimes, depending on the nature of the discomfort, a warm (or cool) compress can offer a bit of temporary relief, but please discuss this with your doctor too."
    * **Strictly avoid suggesting any specific medications (traditional or Western) or complex remedies.**

    5. **Empathetic Closing & Encouragement for Doctor's Visit:**
    * End on a supportive, encouraging, and reassuring note.
    * Empower them for their medical consultation: "When you go to see the doctor, it can be very helpful to write down all your symptoms, when they started, what makes them better or worse, and any questions you have. This way, you can make sure you get all the information you need."
    * Reiterate care: "Your health is very important, and seeking professional advice is the best step you can take for yourself and your peace of mind. I wish you well."
    
    6. **Citations & Further Information:**
    * End your response with 1-2 relevant, authoritative sources where the user can learn more general information about their symptoms or health concern.
    * Format each citation as: "For more information: [Brief Source Description](URL)"
    * Preferred sources include: WHO, CDC, PubMed, Nigerian Centre for Disease Control (NCDC), Nigeria's Federal Ministry of Health, or other reputable medical organizations.
    * Example: "For more information: [WHO Fact Sheet on Headaches](https://www.who.int/news-room/fact-sheets/detail/headaches)"

    **Key Instructions for the AI's Character and Approach :**

    * **Persona Voice:** Adopt the persona of 'Healthmate AI' consistently. Think of a calm, patient, and wise community figure who people trust for sound, caring advice.
    * **Language - Simple & Relatable:** Prioritize extreme simplicity and clarity. Explain concepts as you would to a cherished family member who has no medical training. Use relatable analogies if they simplify without confusing or being trivial.
    * **Cultural Resonance :** The emphasis on a warm, respectful, and slightly more narrative or explanatory tone (rather than purely clinical bullet points) aims for better cultural resonance. Avoid direct claims of understanding specific cultural beliefs unless you have a curated, verifiable knowledge base for it (which is complex). The respectful, guiding tone is key.
    * **No Diagnosis - Absolute Rule:** Under NO circumstances suggest the user *has* a specific illness. Do not even list specific illnesses as "you might have X, Y, or Z." Focus on symptom categories and the process of seeking professional help.
    * **Positive Framing :** While being realistic, try to frame the advice to see a doctor as a positive, empowering step towards getting answers and relief.
    """
    
    
    try:
        # Explicitly create an httpx client with no proxy settings
        http_client = httpx.Client(proxies=None)
        
        # Pass the http_client to the OpenAI constructor
        client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            http_client=http_client  # Add this line to use the proxy-disabled client
        )
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful healthcare assistant who provides general health information. You are not a doctor and should not give specific medical advice or diagnoses."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Error processing with OpenAI: {e}")
        return "I'm sorry, I couldn't process your health question. Please try again later."

def generate_health_facts(topic="general health", count=5):
    """Generate interesting health facts using OpenAI"""
    try:
        # Create a prompt for health facts
        prompt = f"""
        Generate {count} interesting, accurate health facts about {topic}. 
        Focus on information that is:
        1. Evidence-based and scientifically accurate
        2. Useful for everyday health decisions
        3. Relevant to diverse populations including Nigerians
        4. Presented in a clear, concise format
        
        Format each fact as a JSON object with 'title' and 'description' fields.
        """
        
        # Initialize OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Generate response
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a health educator providing accurate, helpful health information."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=1000
        )
        
        # Parse JSON response
        result = json.loads(response.choices[0].message.content)
        
        # Extract facts from result
        if 'facts' in result:
            return result['facts']
        else:
            # Handle case where OpenAI might return in a different format
            return [{'title': f"Fact about {topic}", 'description': fact} 
                    for fact in result.get('facts', [fact for fact in result.values() if isinstance(fact, str)])]
            
    except Exception as e:
        logger.error(f"Error generating health facts: {e}")
        # Return some default facts if API fails
        return [
            {
                "title": "Stay Hydrated",
                "description": "Drinking adequate water is essential for overall health, helping maintain body temperature and remove waste."
            },
            {
                "title": "Sleep Matters",
                "description": "Adults need 7-9 hours of quality sleep per night for optimal cognitive function and physical health."
            }
        ]

# Example usage
if __name__ == "__main__":
    # Take user input directly
    print("HealthMate AI - Multilingual Health Assistant")
    print("----------------------------------------------")
    print(f"Supported languages: {', '.join(SUPPORTED_LANGUAGES.values())}")
    print("Type 'exit' to quit")
    print()
    
    while True:
        user_input = input("Describe your health concern: ")
        
        if user_input.lower() in ['exit', 'quit', 'bye']:
            print("Thank you for using HealthMate AI. Goodbye!")
            break
        
        if not user_input.strip():
            print("Please enter a health concern or type 'exit' to quit.")
            continue
            
        print("\nProcessing your request...")
        result = process_user_message(user_input)
        
        if result["success"]:
            print(f"\nDetected Language: {result['detected_language']}")
            if result["english_translation"]:
                print(f"Translated to English: {result['english_translation']}")
            
            print("\nResponse:")
            print("---------")
            print(result["response"])
        else:
            print(f"\nError: {result.get('message', 'An unknown error occurred')}")
        
        print("\n" + "="*50)

    # Commented test inputs for reference
    """
    test_inputs = [
        "I have a headache and fever for two days",  # English
        "Isi na-ewute m ruo ụbọchị abụọ",          # Igbo
        "Mo ni irora ori fun ọjọ meji",             # Yoruba
        "Ina ciwo a kai tsawon kwana biyu",         # Hausa
        "I dey get serious headache for two days now"  # Nigerian Pidgin
    ]
    
    for input_text in test_inputs:
        print("\n" + "="*50)
        print(f"Testing: {input_text}")
        result = process_user_message(input_text)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    """
