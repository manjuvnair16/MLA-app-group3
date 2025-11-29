from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from jinja2 import Template
from langchain_groq.chat_models import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers.structured import StructuredOutputParser, ResponseSchema
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}},
     methods="GET,HEAD,POST,OPTIONS,PUT,PATCH,DELETE")


# Get the Groq API key from the .env file
basedir = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(basedir, '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)
groq_api = os.getenv("GROQ_API_KEY")


# Initialize LLM model
groq = ChatGroq(api_key=groq_api, 
                model="llama-3.1-8b-instant", 
               # model="openai/gpt-oss-20b",
                temperature=0.0,
                max_retries=2)

# Define output schema
schemas = [
    ResponseSchema(name="exerciseType", description="""Extract the exercise/activity type from the user's input. 
        Return the EXACT activity name mentioned by the user (e.g., 'Basketball', 'Yoga', 'Rock Climbing', 'Dance', etc.).
        
        Common activities include but are not limited to:
        - Running, Cycling, Swimming, Gym, Dance, Yoga
        - Stretching, Pilates, Rock Climbing, Skating, Boxing
        - Basketball, Football, Cricket, Tennis, Badminton
        - Walking, Hiking, Rowing, Wheelchair Run Pace
        - Or ANY other physical activity mentioned
        
        **Important**: 
        - Capitalize the first letter of each word (e.g., 'basketball' → 'Basketball', 'rock climbing' → 'Rock Climbing')
        - Return the SPECIFIC activity name, NOT 'Other'
        - If the activity type is unclear or not mentioned, return 'Unknown'
        """),
    ResponseSchema(name="duration", description="The time spent on the exercise in **minutes**, extracted as a **plain integer**. For '30mins running', the value should be **30**. Do not include units like 'minutes' or 'hrs'. For duration like 4mins 10seconds five hours, the value should be converted to minutes, **304.16**."),
   # ResponseSchema(name="distance", description="Distance covered, e.g., 5 km"),
   # ResponseSchema(name="intensity", description="Low, medium, high"),
   # ResponseSchema(name="time_of_day", description="Morning, afternoon, evening"),
    ResponseSchema(name="description", description="Short summary like the intensity of the activity, location, time of the day or anything else mentioned other then duration, activity or date"),
    ResponseSchema(name="date", description="The date the exercise was performed. If the input uses relative date terms (e.g., 'yesterday', 'today', 'last week', 'tomorrow', 'this week), get the absolute date using today's date. Calculate the date for the relative term and convert it to the **yyyy/MM/dd** format. Assume 'week' means 7 days prior or after today's date unless a weekday is mentioned. If a specific date is mentioned, ensure it is in the **yyyy/MM/dd** format. If a specific week day is mentioned, infer the date using today's date and from that today's week day")
]

# Define output parser
parser = StructuredOutputParser(response_schemas=schemas)

prompt_template = ChatPromptTemplate.from_template("""
You are an expert workout data extraction tool. **Analyze the following text and only extract structured workout data in JSON format.**

**IMPORTANT RULES:**
1. Extract the EXACT activity name mentioned by the user (e.g., "Basketball", "Yoga", "Rock Climbing")
2. DO NOT categorize activities as "Other" - always return the specific activity name
3. Capitalize properly (e.g., "basketball" → "Basketball", "rock climbing" → "Rock Climbing")
4. If the text does not contain any recognizable workout or exercise information, you MUST return an empty JSON object: {{}}


Extract structured workout data in JSON from this text:
{input_text}
{format_instructions}
""")

def parse_activity(transcript: str, today_date: str = None):
    prompt = prompt_template.format_prompt(
        input_text=f" For your information, today's date is {today_date}. " + transcript,
        format_instructions=parser.get_format_instructions()
    )

    response = groq.invoke(prompt)
    parsed = parser.parse(response.content)

    # Post-processing: Ensure activity name is properly capitalized
    if parsed.get("exerciseType"):
        activity = parsed["exerciseType"]
        # Capitalize each word properly
        parsed["exerciseType"] = ' '.join(word.capitalize() for word in activity.split())
        
    return parsed

# specify the routes
@app.route('/')
def index():
    transcript = "30mins running high intensive yesterday"
    parsed_data = parse_activity(transcript)
    print("in root ai parser")
    return jsonify({"parsed": parsed_data}), 200
    # return ""


# Flask route that exposes the LLM speech to text parser
@app.route("/speech_to_text_parser", methods=["POST"])
def speech_to_text_parser_route():
    data = request.get_json()
    transcript = data.get("transcript", "")
   
    print("Transcript received:", transcript)
    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400

    try:
        today_dt = datetime.now().strftime("%Y/%m/%d")
        # Define prompt template
        parsed_data = parse_activity(transcript, today_dt)
        # Debug logging
        print(f"Parsed activity: {parsed_data.get('exerciseType')}")
        return jsonify({"parsed": parsed_data}), 200
    except Exception as e:
        print("Error parsing activity:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5051)