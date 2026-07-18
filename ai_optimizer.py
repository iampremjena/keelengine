import os
import subprocess
from supabase import create_client, Client
from google import genai  # Modern 2026 unified Google GenAI architecture

# 1. Establish Secure Connection to Your Database
SUPABASE_URL = "https://lsokajyrqpodytvtpczt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzb2thanlycXBvZHl0dnRwY3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjk4MzYsImV4cCI6MjA5OTEwNTgzNn0.xgks23X8C2eRExANCMu51PWfxZ7wxfwwHhG44a_66Kw"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def autonomous_weekly_optimization_loop():
    print("🤖 Booting Autonomous Optimization Agent...")

    # 2. Extract Active User Feedback Queue
    # 2. Extract ONLY feedback rows that you have manually verified and approved
    feedback_response = supabase.table("customer_feedback_queue") \
        .select("feedback_text") \
        .eq("approved", True) \
        .execute()
        
    feedbacks = [row['feedback_text'] for row in feedback_response.data]
    
    if not feedbacks:
        print("💡 Zero user feedback anomalies detected. Sleeping optimizer script.")
        return

    print(f"📈 Found {len(feedbacks)} user feedback entries. Reading data_models.py...")

    # 3. Read Current Mathematical Routing Logic File
    try:
        with open("data_models.py", "r", encoding="utf-8") as f:
            current_code = f.read()
    except FileNotFoundError:
        print("❌ Error: data_models.py file not found in current execution folder.")
        return

    # 4. Compile Optimization Prompt Instructions
    compiled_feedback = "\n".join([f"- {text}" for text in feedbacks])
    
    prompt = f"""
    You are an autonomous senior python architecture refactoring agent for KeelEngine.
    
    Here is the active raw user feedback gathered from live users this week:
    {compiled_feedback}
    
    Here is the active code for 'data_models.py':
    {current_code}
    
    Task: Optimize or adapt the mathematical matrix configurations inside 'data_models.py' to address the user feedback directly.
    Return ONLY valid, functional executable python code blocks. Do not include any chat commentary or markdown wrappers like ```python. Start directly with imports or variables.
    """

    # 5. Execute Gemini Code Generation Call
    # Make sure you run 'set GEMINI_API_KEY=your_key' in your terminal environment before executing this script
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt
        )
        optimized_code = response.text.strip().replace("```python", "").replace("```", "")
    except Exception as e:
        print(f"❌ Gemini Generation Call Failed: {e}")
        return

    # 6. Safely Backup and Write Refactored Logic Code
    with open("data_models.py", "w", encoding="utf-8") as f:
        f.write(optimized_code)
    print("📝 Code matrix successfully refactored natively inside data_models.py!")

    # 7. Automated Verification Check Phase
    # Runs your backend startup check to verify the AI code changes didn't break execution syntax
    print("test_compile Verification running...")
    try:
        import data_models
        print("🎉 Verification passed! The new code compiles flawlessly without syntax syntax issues.")
    except Exception as err:
        print(f"❌ AI Code verification loop failed. Rolling back changes. Error: {err}")
        with open("data_models.py", "w", encoding="utf-8") as f:
            f.write(current_code)

if __name__ == "__main__":
    autonomous_weekly_optimization_loop()