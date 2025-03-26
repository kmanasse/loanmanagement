// Updated imports
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');
const { connectDB, User, LoanApplication } = require('./database');

// Load environment variables
dotenv.config();

// Initialize app and connect to database
const app = express();
connectDB();

// Rest of the existing middleware and file upload configuration remains the same...

// Updated Routes
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
      // Clean up uploaded files
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
      // Create or find user
      let user = await User.findOne({ email: req.body.email });
      
      if (!user) {
        user = new User({
          fullName: req.body.fullName,
          email: req.body.email,
          phoneNumber: req.body.phoneNumber,
          age: req.body.age,
          gender: req.body.gender,
          maritalStatus: req.body.maritalStatus
        });
        await user.save();
      }

      // Prepare loan application
      const loanApplication = new LoanApplication({
        user: user._id,
        loanAmount: req.body.loanAmount,
        loanPurpose: req.body.loanPurpose,
        loanTenure: req.body.loanTenure,
        interestRate: req.body.interestRate,
        documents: {
          nationalId: req.files.idUpload[0].filename,
          valuationReport: req.files.valuationReport[0].filename,
          bankStatements: req.files.bankStatements.map(file => file.filename)
        },
        collateral: {
          type: req.body.collateralType,
          forcedSaleValue: req.body.forcedSaleValue,
          monthlyIncome: req.body.monthlyIncome
        }
      });

      // Calculate loan details
      loanApplication.calculateLoanDetails();
      
      // Validate loan limit
      const loanLimit = loanApplication.calculateLoanLimit();
      
      if (loanApplication.loanAmount > loanLimit) {
        // Clean up files
        fs.unlinkSync(req.files.idUpload[0].path);
        fs.unlinkSync(req.files.valuationReport[0].path);
        req.files.bankStatements.forEach(file => fs.unlinkSync(file.path));

        return res.status(400).json({ 
          error: 'Loan amount exceeds calculated loan limit',
          loanLimit 
        });
      }

      // Save loan application
      await loanApplication.save();

      res.status(201).json({ 
        message: 'Loan application submitted successfully',
        