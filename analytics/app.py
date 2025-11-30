from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request
from pymongo import MongoClient
from flask_pymongo import PyMongo
from flask_cors import CORS
from urllib.parse import quote_plus
from bson import json_util
import traceback
import logging
import os
from datetime import datetime, timedelta
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import jwt
from functools import wraps

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"},
                     r"/api/*": {"origins": "*"},
                     r"/stats/*": {"origins": "*"}},
     methods="GET,HEAD,POST,OPTIONS,PUT,PATCH,DELETE")

load_dotenv()
mongo_uri = os.getenv('MONGO_URI')
mongo_db = os.getenv('MONGO_DB')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

client = MongoClient(mongo_uri)
db = client[mongo_db]

# JWT verification
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)
        if not auth_header:
            return jsonify({'error': 'Missing token'}), 401
        
        try:
            token = auth_header.split(' ')[1]
            decoded_token = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            request.user = decoded_token
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated

# Public health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify(status='healthy', timestamp=datetime.now().isoformat()), 200


@app.route('/')
@token_required
def index():
    try:
        exercises = db.exercises.find()
        exercises_list = list(exercises)
        return json_util.dumps(exercises_list)
    except Exception as e:
        logging.error(f"Error fetching index data: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500

@app.route('/stats')
@token_required
def stats():
    pipeline = [
        {
            "$group": {
                "_id": {
                    "username": "$username",
                    "exerciseType": "$exerciseType"
                },
                "totalDuration": {"$sum": "$duration"}
            }
        },
        {
            "$group": {
                "_id": "$_id.username",
                "exercises": {
                    "$push": {
                        "exerciseType": "$_id.exerciseType",
                        "totalDuration": "$totalDuration"
                    }
                }
            }
        },
        {
            "$project": {
                "username": "$_id",
                "exercises": 1,
                "_id": 0
            }
        }
    ]

    try:
        stats = list(db.exercises.aggregate(pipeline))
        return jsonify(stats=stats)
    except Exception as e:
        logging.error(f"Error fetching all stats: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500


@app.route('/stats/<username>', methods=['GET'])
@token_required
def user_stats(username):
    pipeline = [
        {
            "$match": {"username": username}
        },
        {
            "$group": {
                "_id": {
                    "username": "$username",
                    "exerciseType": "$exerciseType"
                },
                "totalDuration": {"$sum": "$duration"}
            }
        },
        {
            "$group": {
                "_id": "$_id.username",
                "exercises": {
                    "$push": {
                        "exerciseType": "$_id.exerciseType",
                        "totalDuration": "$totalDuration"
                    }
                }
            }
        },
        {
            "$project": {
                "username": "$_id",
                "exercises": 1,
                "_id": 0
            }
        }
    ]

    try:
        stats = list(db.exercises.aggregate(pipeline))
        return jsonify(stats=stats)
    except Exception as e:
        logging.error(f"Error fetching user stats for {username}: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500

# Fetch total duration aggregated by day for the last 7 days
@app.route('/stats/daily_trend/<username>', methods=['GET'])
@token_required
def daily_trend_stats(username):
    # Calculate the start date (7 days ago)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=6)
    
    # Normalize start_date to the beginning of the day for accurate matching
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Match: Filter by user and last 7 days
    # 2. Group: Aggregate duration by the date of the exercise
    # 3. Sort: Order the data chronologically
    pipeline = [
        {
            "$match": {
                "username": username,
                "date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
        },
        {
            "$group": {
                "_id": { 
                    "dayOfWeek": {"$dayOfWeek": "$date"},
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}
                },
                "totalDuration": {"$sum": "$duration"}
            }
        },
        {
            "$sort": {"_id.date": 1}
        },
        {
            "$project": {
                "_id": 0,
                # Map MongoDB's day index (1=Sun, 2=Mon) to a name and use 'Duration' key for Recharts
                "name": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$_id.dayOfWeek", 2]}, "then": "Mon"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 3]}, "then": "Tue"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 4]}, "then": "Wed"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 5]}, "then": "Thu"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 6]}, "then": "Fri"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 7]}, "then": "Sat"},
                            {"case": {"$eq": ["$_id.dayOfWeek", 1]}, "then": "Sun"}
                        ],
                        "default": "Unknown"
                    }
                },
                "Duration": "$totalDuration",
                "date": "$_id.date"
            }
        }
    ]

    try:
        stats = list(db.exercises.aggregate(pipeline))
        
        date_data = {item['date']: item for item in stats}
        full_range = []
        current = start_date
        
        while current <= end_date:
            date_str = current.strftime("%Y-%m-%d")
            day_name = current.strftime("%a")
            
            if date_str in date_data:
                full_range.append(date_data[date_str])
            else:
                full_range.append({
                    "name": day_name,
                    "Duration": 0,
                    "date": date_str
                })
            current += timedelta(days=1)
            
        return jsonify(trend=full_range)
    except Exception as e:
        logging.error(f"An error occurred while querying MongoDB: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500

@app.route('/stats/weekly/', methods=['GET'])
@token_required
def weekly_journal_stats():
    username = request.args.get('user')
    start_date_str = request.args.get('start')
    end_date_str = request.args.get('end')
    date_format = "%Y-%m-%d"

    if not all([username, start_date_str, end_date_str]):
        return jsonify(error="Missing required parameters: user, start, end"), 400

    try:
        start_date = datetime.strptime(start_date_str, date_format)
        end_date = datetime.strptime(end_date_str, date_format) + timedelta(days=1)
    except Exception as e:
        logging.error(f"Error parsing dates for weekly journal: {e}")
        return jsonify(error="Invalid date format"), 400

    pipeline = [
        {
            "$match": {
                "username": username,
                "date": {
                    "$gte": start_date,
                    "$lt": end_date
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "exerciseType": "$exerciseType"
                },
                "totalDuration": {"$sum": "$duration"}
            }
        },
        {
            "$project": {
                "exerciseType": "$_id.exerciseType",
                "totalDuration": 1,
                "_id": 0
            }
        }
    ]

    try:
        stats = list(db.exercises.aggregate(pipeline))
        return jsonify(stats=stats)
    except Exception as e:
        logging.error(f"An error occurred while querying MongoDB for weekly journal: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500


# Utility function to get the start of the current week (Monday)
def get_start_of_week():
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    # Python's weekday() returns 0 for Monday, 6 for Sunday
    start_of_week = today - timedelta(days=today.weekday())
    return start_of_week

'''
# Provides Total Duration and Distribution for the CURRENT WEEK
@app.route('/stats/weekly_summary/<username>', methods=['GET'])
@token_required
def weekly_summary_stats(username):
    start_date = get_start_of_week()
    end_date = datetime.now()

    # Pipeline filters by user and date, then aggregates duration by exercise type
    pipeline = [
        {
            "$match": {
                "username": username,
                "date": {
                    "$gte": start_date,
                    "$lt": end_date
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "exerciseType": "$exerciseType"
                },
                "totalDuration": {"$sum": "$duration"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "exerciseType": "$_id.exerciseType",
                "totalDuration": "$totalDuration"
            }
        }
    ]

    try:
        weekly_exercises = list(db.exercises.aggregate(pipeline))
        
        # Calculate overall weekly total and total exercise types from the aggregated list
        total_duration = sum(e['totalDuration'] for e in weekly_exercises)
        total_types = len(weekly_exercises)
        
        return jsonify(
            totalDuration=total_duration,
            totalTypes=total_types,
            exercises=weekly_exercises
        )
    except Exception as e:
        logging.error(f"An error occurred while querying MongoDB for weekly summary: {e}")
        traceback.print_exc()
        return jsonify(error="An internal error occurred"), 500
'''


@app.route('/api/activities/range', methods=['GET'])
@token_required
def get_activities_by_range():
    username = request.args.get('user')
    start_date_str = request.args.get('start')
    end_date_str = request.args.get('end')

    if not all([username, start_date_str, end_date_str]):
        return jsonify(error="Missing required query parameters: user, start, end"), 400

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
    except Exception:
        return jsonify(error="Invalid date format. Use YYYY-MM-DD."), 400

    query = {
        "username": username,
        "date": {"$gte": start_date, "$lt": end_date}
    }

    try:
        # sort newest first
        activities_list = list(db.exercises.find(query).sort("date", -1))

        uk = ZoneInfo("Europe/London")
        out = []
        for a in activities_list:
            # group date
            dt = a.get("date")
            if isinstance(dt, datetime):
                date_str = dt.astimezone(uk).strftime("%Y-%m-%d")
            else:
                date_str = a["_id"].generation_time.replace(tzinfo=timezone.utc).astimezone(uk).strftime("%Y-%m-%d")

            created = a.get("created_at")
            if not isinstance(created, datetime):
                # For old records without created_at, derive from ObjectId and UPDATE the record
                created = a["_id"].generation_time.replace(tzinfo=timezone.utc)
                # Store it permanently so we don't recalculate next time
                db.exercises.update_one(
                    {"_id": a["_id"]},
                    {"$set": {"created_at": created}}
                )
                
            time_str = created.astimezone(uk).strftime("%H:%M")

            out.append({
                "id": str(a["_id"]),
                "username": a.get("username"),
                "date": date_str,
                "time": time_str,
                "activityType": a.get("exerciseType"),
                "duration": a.get("duration"),
                "comments": a.get("description", ""),
                "createdAt": created.isoformat()
            })

        return jsonify(out)
    except Exception as e:
        logging.error(f"activities/range error: {e}")
        traceback.print_exc()
        return jsonify(error="An internal server error occurred"), 500


@app.route('/api/activities/<activity_id>', methods=['PATCH'])
@token_required
def update_activity_comment(activity_id):
    try:
        body = request.get_json(silent=True) or {}
        comments = body.get('comments', body.get('description'))
        if comments is None:
            return jsonify(error="comments is required"), 400

        ors = []
        try:
            ors.append({'_id': ObjectId(activity_id)})
        except Exception:
            pass
        ors.append({'_id': activity_id})   # in case _id is stored as string
        ors.append({'id': activity_id})    # in case 'id' field is used

        query = {'$or': ors}

        result = db.exercises.update_one(query, {'$set': {'description': comments}})
        app.logger.info(
            f"PATCH /api/activities/{activity_id} matched={result.matched_count} modified={result.modified_count}"
        )

        if result.matched_count == 0:
            return jsonify(error="activity not found", tried=query), 404

        return jsonify(ok=True)
    except Exception as e:
        logging.error(f"Error updating activity note: {e}")
        traceback.print_exc()
        return jsonify(error="internal error"), 500


@app.post("/api/activities")
@token_required
def create_activity():
    body = request.get_json(force=True)

    username = body.get("username")
    exerciseType = body.get("exerciseType")
    description = body.get("description", "")
    duration = body.get("duration", 0)
    date_in = body.get("date") # expected in ISO format or "YYYY-MM-DD"

    if not all([username, exerciseType, date_in]):
        return jsonify(error="username, exerciseType and date are required"), 400

    # normalise the chosen calendar date to midnight UTC
    if isinstance(date_in, str):
        # accepts "YYYY-MM-DD" or ISO
        try:
            if len(date_in) == 10:
                dt = datetime.strptime(date_in, "%Y-%m-%d")
            else:
                dt = datetime.fromisoformat(date_in.replace("Z", "+00:00"))
        except Exception:
            return jsonify(error="date must be YYYY-MM-DD or ISO"), 400
    else:
        dt = datetime.timezone.utc.localize()

    date_utc = dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)

    doc = {
        "username": username,
        "exerciseType": exerciseType,
        "description": description,
        "duration": int(duration),
        "date": date_utc,
        # fixed time of logging set by the server once
        "created_at": datetime.now(timezone.utc),
    }

    db.exercises.insert_one(doc)
    return jsonify(ok=True)


if __name__ == "__main__":

    app.run(debug=True, host='0.0.0.0', port=5050)