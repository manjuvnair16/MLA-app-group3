import json
import pytest
from app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_valid_activity_parsing(client):
    """Test if a valid sentence returns expected structured fields"""
    payload = {"transcript": "I ran 5km yesterday morning"}
    response = client.post("/speech_to_text_parser", json=payload)
    assert response.status_code == 200

    data = json.loads(response.data)
    parsed = data.get("parsed")
    assert parsed is not None
    assert parsed["exerciseType"].lower() in ["running", "other"]
    assert isinstance(parsed["duration"], (int, float))
    assert parsed["date"]

def test_invalid_input(client):
    """Test if random text returns nulls"""
    payload = {"transcript": "What's the weather today?"}
    response = client.post("/speech_to_text_parser", json=payload)
    data = json.loads(response.data)
    parsed = data.get("parsed")
    assert parsed["exerciseType"] is ''
    assert parsed["duration"] is ''
  #  assert parsed["description"] is ''
    assert parsed["date"] is ''
