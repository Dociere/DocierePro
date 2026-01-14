from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from instance.db import db

# In-memory DB for demo
users_db = {}


def register_user(data):
    userName = data.get("userName")
    emailId = data.get("emailId")
    password = data.get("password")

    if not userName or not emailId or not password:
        return {"success": False, "error": "Username, EmailID and password required"}, 400

    # Use username as document ID (simple & common)
    if userName in db:
        return {"success": False, "error": "User already exists"}, 400

    user_doc = {
        "_id": userName,              # document ID
        "userId": str(uuid.uuid4()),
        "userName": userName,
        "emailId": emailId,
        "password": generate_password_hash(password),
        "type": "user"
    }

    db.save(user_doc)

    return {"success": True, "message": "User registered successfully"}, 201

def login_user(data):
    userName = data.get("userName")
    emailId = data.get("emailId")
    password = data.get("password")
    user = users_db.get(userName)
    if not user or not check_password_hash(user["password"], password):
        return {"success": False, "error": "Invalid userName or password"}, 401
    token = str(uuid.uuid4())
    return {"success": True, "token": token}, 200
