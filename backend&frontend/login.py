from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from datetime import datetime
import os
import re

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.urandom(24)  # Random secret key for sessions
CORS(app)  # Enable CORS for all routes

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@localhost/instacash_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), default='customer')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class PasswordReset(db.Model):
    __tablename__ = 'password_resets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reset_token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_used = db.Column(db.Boolean, default=False)

# Helper Functions
def validate_email(email):
    """Validate email format"""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email) is not None

def validate_password(password):
    """
    Validate password strength:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one number
    - Contains at least one special character
    """
    if len(password) < 8:
        return False
    
    # Check for at least one uppercase, one lowercase, one digit, and one special character
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    
    return True

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.json
    
    # Validate input
    required_fields = ['username', 'email', 'password', 'firstName', 'lastName']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    # Validate email
    if not validate_email(data['email']):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password
    if not validate_password(data['password']):
        return jsonify({
            'error': 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        }), 400
    
    try:
        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == data['username']) | (User.email == data['email'])
        ).first()
        
        if existing_user:
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Create new user
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            first_name=data['firstName'],
            last_name=data['lastName']
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully', 
            'user_id': new_user.id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    
    # Validate input
    if 'username' not in data or 'password' not in data:
        return jsonify({'error': 'Missing username or password'}), 400
    
    try:
        # Find user by username
        user = User.query.filter_by(username=data['username']).first()
        
        # Check if user exists and password is correct
        if user and user.check_password(data['password']):
            # Create session for the user
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    # Clear the session
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    
    if 'email' not in data:
        return jsonify({'error': 'Email is required'}), 400
    
    try:
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        
        if not user:
            return jsonify({'error': 'No user found with this email'}), 404
        
        # Generate reset token (in a real app, use a secure random token generator)
        reset_token = bcrypt.generate_password_hash(str(user.id)).decode('utf-8')
        
        # Create password reset record
        reset_request = PasswordReset(
            user_id=user.id,
            reset_token=reset_token
        )
        
        db.session.add(reset_request)
        db.session.commit()
        
        # In a real application, send an email with the reset link
        # For now, we'll just return the token
        return jsonify({
            'message': 'Password reset link generated',
            'reset_token': reset_token
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    
    # Validate input
    if not all(key in data for key in ['reset_token', 'new_password']):
        return jsonify({'error': 'Missing reset token or new password'}), 400
    
    # Validate password
    if not validate_password(data['new_password']):
        return jsonify({
            'error': 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        }), 400
    
    try:
        # Find reset request
        reset_request = PasswordReset.query.filter_by(
            reset_token=data['reset_token'], 
            is_used=False
        ).first()
        
        if not reset_request:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Find user
        user = User.query.get(reset_request.user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update password
        user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        
        # Mark reset token as used
        reset_request.is_used = True
        
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    # Use environment variables or more secure configuration for production
    app.run(debug=True, host='0.0.0.0', port=5000)