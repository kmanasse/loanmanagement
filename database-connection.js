const mongoose = require('mongoose');
const express = require('express');
const { 
    User, 
    Collateral, 
    LoanApplication, 
    ApplicationAuditLog, 
    calculateLoanLimit 
} = require('./models'); // Assuming the first document is saved as models.js

// Database Connection Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/instacash_db';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Modify existing routes in your app.js to interact with database models

// User Registration Route
app.post('/api/register', async (req, res) => {
    try {
        const { 
            full_name, 
            age, 
            gender, 
            marital_status, 
            email, 
            phone_number, 
            national_id_file_path 
        } = req.body;

        // Create new user
        const newUser = new User({
            full_name,
            age,
            gender,
            marital_status,
            email,
            phone_number,
            national_id_file_path
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: newUser._id 
        });
    } catch (error) {
        // Handle duplicate email or validation errors
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'User registration failed', details: error.message });
    }
});

// Collateral Submission Route
app.post('/api/collateral', async (req, res) => {
    try {
        const { 
            userId, 
            collateral_type, 
            forced_sale_value, 
            monthly_income,
            valuation_report_file_path,
            bank_statements_file_path
        } = req.body;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate loan limit
        const max_loan_limit = calculateLoanLimit(
            collateral_type, 
            forced_sale_value, 
            monthly_income
        );

        // Create new collateral
        const newCollateral = new Collateral({
            user: userId,
            collateral_type,
            forced_sale_value,
            monthly_income,
            valuation_report_file_path,
            bank_statements_file_path
        });

        await newCollateral.save();

        // Update user with collateral reference
        user.collateral = newCollateral._id;
        await user.save();

        res.status(201).json({ 
            message: 'Collateral submitted successfully', 
            collateralId: newCollateral._id,
            maxLoanLimit: max_loan_limit
        });
    } catch (error) {
        res.status(500).json({ error: 'Collateral submission failed', details: error.message });
    }
});

// Loan Application Submission Route (modified from existing route)
app.post('/api/loan-application', 
  upload.fields([
    { name: 'idUpload', maxCount: 1 },
    { name: 'valuationReport', maxCount: 1 },
    { name: 'bankStatements', maxCount: 3 }
  ]),
  loanApplicationValidation,
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If files were uploaded, remove them
      const files = req.files;
      if (files) {
        Object.values(files).forEach(fileGroup => {
          fileGroup.forEach(file => {
            fs.unlinkSync(file.path);
          });
        });

      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { 
        userId, 
        loanAmount, 
        loanPurpose, 
        loanTenure, 
        interestRate 
      } = req.body;

      // Find user and collateral
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const collateral = await Collateral.findById(user.collateral);
      if (!collateral) {
        return res.status(404).json({ error: 'Collateral not found' });
      }

      // Calculate loan details
      const { 
        monthlyPayment, 
        totalPayment, 
        totalInterest 
      } = calculateLoanDetails(loanAmount, loanTenure, interestRate);

      // Calculate max loan limit based on collateral
      const maxLoanLimit = calculateLoanLimit(
        collateral.collateral_type, 
        collateral.forced_sale_value, 
        collateral.monthly_income
      );

      // Validate loan amount against max loan limit
      if (loanAmount > maxLoanLimit) {
        return res.status(400).json({ 
          error: 'Loan amount exceeds maximum allowed limit',
          maxLoanLimit 
        });
      }

      // Create loan application
      const newLoanApplication = new LoanApplication({
        user: userId,
        loan_amount: loanAmount,
        loan_purpose: loanPurpose,
        loan_tenure: loanTenure,
        monthly_interest_rate: interestRate,
        monthly_payment: monthlyPayment,
        total_payment: totalPayment,
        total_interest: totalInterest,
        max_loan_limit: maxLoanLimit
      });

      await newLoanApplication.save();

      // Create audit log
      const auditLog = new ApplicationAuditLog({
        loan_application: newLoanApplication._id,
        status_changed_to: 'pending',
        changed_by: 'system',
        notes: 'Initial application submission'
      });

      await auditLog.save();

      res.status(201).json({ 
        message: 'Loan application submitted successfully',
        applicationId: newLoanApplication._id
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Loan application submission failed', 
        details: error.message 
      });
    }
});

// Loan Status Update Route (for admin/staff)
app.patch('/api/loan-application/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, changedBy } = req.body;

        // Find and update loan application
        const loanApplication = await LoanApplication.findByIdAndUpdate(
            id, 
            { application_status: status }, 
            { new: true }
        );

        if (!loanApplication) {
            return res.status(404).json({ error: 'Loan application not found' });
        }

        // Create audit log
        const auditLog = new ApplicationAuditLog({
            loan_application: id,
            status_changed_to: status,
            changed_by: changedBy || 'system',
            notes
        });

        await auditLog.save();

        res.json({ 
            message: 'Loan application status updated', 
            application: loanApplication 
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to update loan application', 
            details: error.message 
        });
    }
});

module.exports = app;
