-- Create Database
CREATE DATABASE InstacashLoanDB;
USE InstacashLoanDB;

-- Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    marital_status ENUM('single', 'married', 'divorced') NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    national_id_file_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collateral Types Enum Table
CREATE TABLE CollateralTypes (
    collateral_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL
);

-- Insert predefined collateral types
INSERT INTO CollateralTypes (type_name) VALUES 
('cheque'), 
('land'), 
('house'), 
('car');

-- Collateral Table
CREATE TABLE Collateral (
    collateral_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    collateral_type_id INT NOT NULL,
    forced_sale_value DECIMAL(15, 2),
    monthly_income DECIMAL(12, 2),
    valuation_report_file_path VARCHAR(500),
    bank_statements_file_path VARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (collateral_type_id) REFERENCES CollateralTypes(collateral_type_id)
);

-- Loan Applications Table
CREATE TABLE LoanApplications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    loan_purpose VARCHAR(500) NOT NULL,
    loan_tenure INT NOT NULL,
    monthly_interest_rate DECIMAL(5, 2) NOT NULL,
    monthly_payment DECIMAL(12, 2) NOT NULL,
    total_payment DECIMAL(15, 2) NOT NULL,
    total_interest DECIMAL(15, 2) NOT NULL,
    max_loan_limit DECIMAL(15, 2) NOT NULL,
    application_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Audit Log Table for Tracking Application Changes
CREATE TABLE ApplicationAuditLog (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    status_changed_to ENUM('pending', 'approved', 'rejected') NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (application_id) REFERENCES LoanApplications(application_id)
);

-- Indexes for Performance
CREATE INDEX idx_user_email ON Users(email);
CREATE INDEX idx_loan_application_user ON LoanApplications(user_id);
CREATE INDEX idx_loan_application_status ON LoanApplications(application_status);

-- Sample Stored Procedure for Calculating Loan Limit
DELIMITER //
CREATE PROCEDURE CalculateLoanLimit(
    IN p_collateral_type VARCHAR(50),
    IN p_forced_sale_value DECIMAL(15, 2),
    IN p_monthly_income DECIMAL(12, 2),
    OUT p_loan_limit DECIMAL(15, 2)
)
BEGIN
    CASE p_collateral_type
        WHEN 'land' THEN SET p_loan_limit = p_forced_sale_value * 0.5;
        WHEN 'house' THEN SET p_loan_limit = p_forced_sale_value * 0.5;
        WHEN 'car' THEN SET p_loan_limit = p_forced_sale_value * 0.25;
        WHEN 'cheque' THEN SET p_loan_limit = p_monthly_income * 0.5;
        ELSE SET p_loan_limit = 0;
    END CASE;
    
    SET p_loan_limit = FLOOR(p_loan_limit / 1000) * 1000;
END //
DELIMITER ;
