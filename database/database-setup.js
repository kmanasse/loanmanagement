const mongoose = require('mongoose');
const { Schema } = mongoose;

// Database Connection Configuration
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// User Schema
const UserSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
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
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced'],
    required: true
  }
}, { timestamps: true });

// Loan Application Schema
const LoanApplicationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  loanAmount: {
    type: Number,
    required: true,
    min: 10000
  },
  loanPurpose: {
    type: String,
    required: true,
    trim: true
  },
  loanTenure: {
    type: Number,
    required: true,
    max: 12
  },
  interestRate: {
    type: Number,
    required: true,
    min: 4.5,
    max: 10
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  documents: {
    nationalId: {
      type: String,
      required: true
    },
    valuationReport: {
      type: String,
      required: true
    },
    bankStatements: [String]
  },
  collateral: {
    type: {
      type: String,
      enum: ['land', 'house', 'car', 'cheque']
    },
    forcedSaleValue: Number,
    monthlyIncome: Number
  },
  calculatedDetails: {
    monthlyPayment: Number,
    totalPayment: Number,
    totalInterest: Number
  }
}, { timestamps: true });

// Loan Calculation Method (can be used before saving)
LoanApplicationSchema.methods.calculateLoanDetails = function() {
  const rate = this.interestRate / 100;
  const monthlyInterest = this.loanAmount * rate;
  const monthlyPayment = (this.loanAmount / this.loanTenure) + monthlyInterest;
  const totalPayment = monthlyPayment * this.loanTenure;
  const totalInterest = monthlyInterest * this.loanTenure;

  this.calculatedDetails = {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalPayment: parseFloat(totalPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2))
  };
};

// Loan Limit Calculation Method
LoanApplicationSchema.methods.calculateLoanLimit = function() {
  let loanLimit = 0;

  switch (this.collateral.type) {
    case 'land':
    case 'house':
      loanLimit = this.collateral.forcedSaleValue * 0.5;
      break;
    case 'car':
      loanLimit = this.collateral.forcedSaleValue * 0.25;
      break;
    case 'cheque':
      loanLimit = this.collateral.monthlyIncome * 0.5;
      break;
  }

  return Math.floor(loanLimit / 1000) * 1000;
};

// Create Models
const User = mongoose.model('User', UserSchema);
const LoanApplication = mongoose.model('LoanApplication', LoanApplicationSchema);

module.exports = {
  connectDB,
  User,
  LoanApplication
};
