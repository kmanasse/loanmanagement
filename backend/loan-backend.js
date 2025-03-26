// Imports
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image (jpg, png) and PDF files are allowed!'));
    }
  }
});

// Loan Calculation Function
function calculateLoanDetails(amount, months, interestRate) {
  const rate = interestRate / 100;
  const monthlyInterest = amount * rate;
  const monthlyPayment = (amount / months) + monthlyInterest;
  const totalPayment = monthlyPayment * months;
  const totalInterest = monthlyInterest * months;

  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalPayment: parseFloat(totalPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2))
  };
}

// Loan Limit Calculation Function
function calculateLoanLimit(collateralType, forcedSaleValue, monthlyIncome) {
  let loanLimit = 0;

  switch (collateralType) {
    case 'land':
    case 'house':
      loanLimit = forcedSaleValue * 0.5;
      break;
    case 'car':
      loanLimit = forcedSaleValue * 0.25;
      break;
    case 'cheque':
      loanLimit = monthlyIncome * 0.5;
      break;
  }

  return Math.floor(loanLimit / 1000) * 1000;
}

// Validation Middleware
const loanApplicationValidation = [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100'),
  body('gender').isIn(['male', 'female']).withMessage('Invalid gender'),
  body('maritalStatus').isIn(['single', 'married', 'divorced']).withMessage('Invalid marital status'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('phoneNumber').isMobilePhone().withMessage('Invalid phone number'),
  body('loanAmount').isFloat({ min: 10000 }).withMessage('Loan amount must be at least 10,000 RWF'),
  body('loanPurpose').trim().isLength({ min: 5 }).withMessage('Loan purpose must be at least 5 characters')
];

// Routes
app.post('/api/loan-calculation', (req, res) => {
  try {
    const { amount, months, interestRate } = req.body;

    // Validate input
    if (!amount || !months || !interestRate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (months > 12 || interestRate < 4.5 || interestRate > 10) {
      return res.status(400).json({ 
        error: 'Invalid loan parameters. Max tenure is 12 months, interest must be 4.5–10%' 
      });
    }

    const loanDetails = calculateLoanDetails(amount, months, interestRate);
    res.json(loanDetails);
  } catch (error) {
    res.status(500).json({ error: 'Loan calculation failed' });
  }
});

app.post('/api/loan-limit', (req, res) => {
  try {
    const { collateralType, forcedSaleValue, monthlyIncome } = req.body;

    if (!collateralType) {
      return res.status(400).json({ error: 'Collateral type is required' });
    }

    const loanLimit = calculateLoanLimit(
      collateralType, 
      parseFloat(forcedSaleValue || 0), 
      parseFloat(monthlyIncome || 0)
    );

    res.json({ loanLimit });
  } catch (error) {
    res.status(500).json({ error: 'Loan limit calculation failed' });
  }
});

app.post('/api/loan-application', 
  upload.fields([
    { name: 'idUpload', maxCount: 1 },
    { name: 'valuationReport', maxCount: 1 },
    { name: 'bankStatements', maxCount: 3 }
  ]),
  loanApplicationValidation,
  (req, res) => {
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
      }

      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const loanApplication = {
        ...req.body,
        files: req.files
      };

      // In a real application, you would save this to a database
      console.log('Loan Application Received:', loanApplication);

      res.status(201).json({ 
        message: 'Loan application submitted successfully',
        applicationId: `LA-${Date.now()}`
      });
    } catch (error) {
      res.status(500).json({ error: 'Loan application submission failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Remove any uploaded files in case of an error
  if (req.files) {
    Object.values(req.files).forEach(fileGroup => {
      fileGroup.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    });
  }

  res.status(500).json({ 
    error: err.message || 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`INSTACASH Loan Application Backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

module.exports = app;
