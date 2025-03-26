# app.py - Main Flask Application
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy 
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://username:password@localhost/instacash_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    id_number = db.Column(db.String(20), unique=True, nullable=False)
    address = db.Column(db.String(200), nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    
    # Relationship to other tables
    loans = db.relationship('Loan', backref='customer', lazy=True)
    collaterals = db.relationship('Collateral', backref='customer', lazy=True)

class Collateral(db.Model):
    __tablename__ = 'collaterals'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    collateral_type = db.Column(db.String(100), nullable=False)
    forced_sale_value = db.Column(db.Float, nullable=False)

class Loan(db.Model):
    __tablename__ = 'loans'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    loan_amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)
    loan_period_months = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.Date, nullable=False)

# API Routes
@app.route('/api/register-customer', methods=['POST'])
def register_customer():
    data = request.json
    
    # Validate input
    required_fields = ['firstName', 'lastName', 'idNumber', 'address', 'gender', 'dob']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing {field}'}), 400
    
    try:
        # Create Customer
        new_customer = Customer(
            first_name=data['firstName'],
            last_name=data['lastName'],
            id_number=data['idNumber'],
            address=data['address'],
            gender=data['gender'],
            date_of_birth=datetime.strptime(data['dob'], '%Y-%m-%d').date()
        )
        db.session.add(new_customer)
        
        # Create Collateral
        if 'collateral' in data and 'forcedSaleValue' in data:
            new_collateral = Collateral(
                customer_id=new_customer.id,
                collateral_type=data['collateral'],
                forced_sale_value=float(data['forcedSaleValue'])
            )
            db.session.add(new_collateral)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Customer registered successfully', 
            'customer_id': new_customer.id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculate-loan', methods=['POST'])
def calculate_loan():
    data = request.json
    
    try:
        loan_amount = float(data['calcLoanAmount'])
        interest_rate = float(data['calcInterest'])
        months = int(data['calcPeriod'])
        start_date = datetime.strptime(data['calcStartDate'], '%Y-%m-%d').date()
        
        # Loan calculation logic
        monthly_payment = loan_amount / months
        monthly_interest = (loan_amount * interest_rate) / 100
        
        payment_schedule = []
        outstanding_balance = loan_amount
        
        for i in range(months):
            repayment_date = start_date.replace(month=start_date.month + i)
            payment_schedule.append({
                'payment_date': repayment_date.strftime('%Y-%m-%d'),
                'principal': round(monthly_payment, 2),
                'interest': round(monthly_interest, 2),
                'total_payment': round(monthly_payment + monthly_interest, 2)
            })
            outstanding_balance -= monthly_payment
        
        return jsonify(payment_schedule), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/upload-documents', methods=['POST'])
def upload_documents():
    if 'documents' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    files = request.files.getlist('documents')
    
    # Setup upload directory
    upload_dir = 'uploads'
    os.makedirs(upload_dir, exist_ok=True)
    
    uploaded_files = []
    for file in files:
        if file.filename == '':
            continue
        
        filename = f"{int(datetime.now().timestamp())}_{file.filename}"
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        uploaded_files.append(filename)
    
    return jsonify({
        'message': 'Documents uploaded successfully',
        'files': uploaded_files
    }), 200

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    app.run(debug=True)