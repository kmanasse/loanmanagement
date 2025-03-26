# INSTACASH Loan Application Backend

## Prerequisites
- Node.js (v14 or higher)
- npm

## Installation
1. Clone the repository
2. Run `npm install`
3. Create a `.env` file for environment variables (optional)

## Running the Application
- Development: `npm run dev`
- Production: `npm start`

## API Endpoints
- `POST /api/loan-calculation`: Calculate loan details
- `POST /api/loan-limit`: Calculate loan limit based on collateral
- `POST /api/loan-application`: Submit loan application

## File Upload
- Supports PDF, JPG, PNG files
- Maximum file size: 5MB
- File types: National ID, Valuation Report, Bank Statements

## Validation
- Age: 18-100
- Loan Amount: Minimum 10,000 RWF
- Loan Tenure: Maximum 12 months
- Interest Rate: 4.5% - 10%

## Error Handling
- Comprehensive error responses
- File cleanup on error
- Validation error details

## Security
- File type validation
- File size limitation
- Input sanitization

## Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode

## Notes
- This is a backend prototype
- Requires frontend integration
- Database connection not implemented
