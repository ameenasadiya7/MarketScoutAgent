from flask import Blueprint, request, jsonify
import bcrypt
from models import db, User

register_bp = Blueprint('register', __name__)

@register_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid request"}), 400
        
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400
        
    # Check if user exists
    if User.query.filter_by(email=email).first() or User.query.filter_by(username=username).first():
        return jsonify({"message": "User already exists"}), 409
        
    # Hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = User(username=username, email=email, password_hash=hashed)
    db.session.add(new_user)
    try:
        db.session.commit()
        return jsonify({"message": "Registration successful"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Database error", "error": str(e)}), 500
