const mongoose = require('mongoose');

// Enum for Collateral Types
const CollateralTypeEnum = ['cheque', 'land', 'house', 'car'];

// User Schema
const UserSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 18,
        max: 100
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    marital_status: {
        type: String,
        enum: ['single', 'married', 'divorced'],
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    phone_number: {
        type: String,
        required: true,
        trim: true
    },
    national_id_file_path: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    collateral: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collateral'
    }
});

// Collateral Schema
const CollateralSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collateral_type: {
        type: String,
        enum: CollateralTypeEnum,
        required: true
    },
    forced_sale_value: {
        type: Number,
        required: true,
        min: 0
    },
    monthly_income: {
        type: Number,
        required: true,
        min: 0
    },
    valuation_report_file_path: String,
    bank_statements_file_path: String
});

// Loan Application Schema
const LoanApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    loan_amount: {
        type: Number,
        required: true,
        min: 0
    },
    loan_purpose: {
        type: String,
        required: true,
        maxlength: 500
    },
    loan_tenure: {
        type: Number,
        required: true,
        min: 1
    },
    monthly_interest_rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    monthly_payment: {
        type: Number,
        required: true,
        min: 0
    },
    total_payment: {
        type: Number,
        required: true,
        min: 0
    },
    total_interest: {
        type: Number,
        required: true,
        min: 0
    },
    max_loan_limit: {
        type: Number,
        required: true,
        min: 0
    },
    application_status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    application_date: {
        type: Date,
        default: Date.now
    }
});

// Audit Log Schema
const ApplicationAuditLogSchema = new mongoose.Schema({
    loan_application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoanApplication',
        required: true
    },
    status_changed_to: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        required: true
    },
    changed_by: {
        type: String,
        required: true
    },
    change_timestamp: {
        type: Date,
        default: Date.now
    },
    notes: String
});

// Loan Limit Calculation Function (equivalent to stored procedure)
function calculateLoanLimit(collateral_type, forced_sale_value, monthly_income) {
    let loan_limit = 0;
    
    switch(collateral_type) {
        case 'land':
        case 'house':
            loan_limit = forced_sale_value * 0.5;
            break;
        case 'car':
            loan_limit = forced_sale_value * 0.25;
            break;
        case 'cheque':
            loan_limit = monthly_income * 0.5;
            break;
    }
    
    return Math.floor(loan_limit / 1000) * 1000;
}

// Create Models
const User = mongoose.model('User', UserSchema);
const Collateral = mongoose.model('Collateral', CollateralSchema);
const LoanApplication = mongoose.model('LoanApplication', LoanApplicationSchema);
const ApplicationAuditLog = mongoose.model('ApplicationAuditLog', ApplicationAuditLogSchema);

module.exports = {
    User,
    Collateral,
    LoanApplication,
    ApplicationAuditLog,
    calculateLoanLimit
};
