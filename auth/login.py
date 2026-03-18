from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
import bcrypt
from models import db, User

login_bp = Blueprint('login', __name__)

@login_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Invalid request"}), 400
        
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400
        
    user = User.query.filter_by(email=email).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        login_user(user, remember=True)
        return jsonify({
            "message": "Login successful", 
            "user": {"id": user.id, "username": user.username, "email": user.email}
        }), 200
        
    return jsonify({"message": "Invalid credentials"}), 401

@login_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

@login_bp.route('/me', methods=['GET'])
def current_user_info():
    if current_user.is_authenticated:
        return jsonify({"user": {"id": current_user.id, "username": current_user.username, "email": current_user.email}}), 200
    return jsonify({"message": "Not authenticated"}), 401
