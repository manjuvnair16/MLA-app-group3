from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from jinja2 import Template
from langchain_groq.chat_models import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers.structured import StructuredOutputParser, ResponseSchema

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
                temperature=0.0,
                max_retries=2)

# Define output schema
schemas = [
    ResponseSchema(name="exerciseType", description="The type of activity from the list ['Running', 'Cycling', 'Swimming', 'Gym', 'Other']. If the activity is not one of the first four (for example 'Yoga', 'Walking', 'Football', 'Stretching', 'Pilates', 'Cricket', 'Sports', etc.), return 'Other'"),
    ResponseSchema(name="duration", description="The time spent on the exercise in **minutes**, extracted as a **plain integer**. For '30mins running', the value should be **30**. Do not include units like 'minutes' or 'hrs'. For duration like4mins 10seconds five hours, the value should be converted to minutes, **304.16**."),
   # ResponseSchema(name="distance", description="Distance covered, e.g., 5 km"),
   # ResponseSchema(name="intensity", description="Low, medium, high"),
   # ResponseSchema(name="time_of_day", description="Morning, afternoon, evening"),
    ResponseSchema(name="description", description="Short summary like the intensity of the activity, location, time of the day or anything else mentioned other then duration, activity or date"),
    ResponseSchema(name="date", description="The date the exercise was performed. If the input uses relative terms (e.g., 'yesterday', 'today', 'last week', 'tomorrow', 'this week), convert it to the **yyyy/MM/dd** format. If a specific date is mentioned, ensure it is in the **yyyy/MM/dd** format. For example, 'yesterday' might become '2025/10/25'.")
]

# Define output parser
parser = StructuredOutputParser(response_schemas=schemas)

prompt_template = ChatPromptTemplate.from_template("""
You are an expert workout data extraction tool. **Analyze the following text and only extract structured workout data in JSON format.**
**If the text does not contain any recognizable workout or exercise information, you MUST return an empty JSON object, i.e., {{}}**.

Extract structured workout data in JSON from this text:
{input_text}
{format_instructions}
""")

def parse_activity(transcript: str):
    prompt = prompt_template.format_prompt(
        input_text=transcript,
        format_instructions=parser.get_format_instructions()
    )

    response = groq.invoke(prompt)
    return parser.parse(response.content)


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
        # Define prompt template
        parsed_data = parse_activity(transcript)
        return jsonify({"parsed": parsed_data}), 200
    except Exception as e:
        print("Error parsing activity:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5051)