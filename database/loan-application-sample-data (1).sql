-- Insert Sample Users
INSERT INTO Users (full_name, age, gender, marital_status, email, phone_number, national_id_file_path) VALUES
('John Mugisha', 35, 'male', 'married', 'john.mugisha@example.com', '+250788123456', '/uploads/ids/john_mugisha_id.pdf'),
('Marie Uwase', 28, 'female', 'single', 'marie.uwase@example.com', '+250722987654', '/uploads/ids/marie_uwase_id.jpg'),
('Innocent Kabirigi', 42, 'male', 'divorced', 'innocent.kabirigi@example.com', '+250789456123', '/uploads/ids/innocent_kabirigi_id.png'),
('Sophia Niyonsenga', 31, 'female', 'married', 'sophia.niyonsenga@example.com', '+250790654321', '/uploads/ids/sophia_niyonsenga_id.jpg');

-- Ensure CollateralTypes are already inserted from previous script
-- If not, run these:
-- INSERT INTO CollateralTypes (type_name) VALUES ('cheque'), ('land'), ('house'), ('car');

-- Insert Collateral Data
INSERT INTO Collateral (user_id, collateral_type_id, forced_sale_value, monthly_income, valuation_report_file_path, bank_statements_file_path) VALUES
(1, 2, 50000000.00, NULL, '/uploads/valuations/john_land_valuation.pdf', NULL),  -- Land collateral
(2, 1, NULL, 750000.00, NULL, '/uploads/bank_statements/marie_bank_statements.pdf'),  -- Cheque collateral
(3, 4, 25000000.00, NULL, '/uploads/valuations/innocent_car_valuation.pdf', NULL),  -- Car collateral
(4, 3, 80000000.00, NULL, '/uploads/valuations/sophia_house_valuation.pdf', NULL);  -- House collateral

-- Insert Loan Applications
INSERT INTO LoanApplications (
    user_id, loan_amount, loan_purpose, loan_tenure, 
    monthly_interest_rate, monthly_payment, 
    total_payment, total_interest, max_loan_limit, 
    application_status
) VALUES 
(1, 25000000.00, 'Agricultural Equipment Purchase', 12, 7.5, 
 2291666.67, 27500000.00, 2500000.00, 25000000.00, 'pending'),

(2, 5000000.00, 'Small Business Expansion', 6, 6.0, 
 866666.67, 5200000.00, 200000.00, 5000000.00, 'approved'),

(3, 15000000.00, 'Vehicle Repair and Upgrade', 9, 8.5, 
 1791666.67, 16125000.00, 1125000.00, 15000000.00, 'pending'),

(4, 40000000.00, 'Home Renovation', 12, 9.0, 
 3666666.67, 44000000.00, 4000000.00, 40000000.00, 'approved');

-- Insert Audit Log Entries
INSERT INTO ApplicationAuditLog (
    application_id, status_changed_to, 
    changed_by, notes
) VALUES 
(2, 'approved', 'Loan Officer Martin', 'Initial review complete. Credit score meets requirements.'),
(4, 'approved', 'Senior Loan Manager Emma', 'Verified all documentation. Collateral value sufficient.');

-- Demonstrate the CalculateLoanLimit Stored Procedure
DELIMITER //
CREATE PROCEDURE DemonstrateCalculateLoanLimit()
BEGIN
    DECLARE v_land_limit DECIMAL(15,2);
    DECLARE v_car_limit DECIMAL(15,2);
    DECLARE v_cheque_limit DECIMAL(15,2);

    CALL CalculateLoanLimit('land', 50000000.00, 0, v_land_limit);
    CALL CalculateLoanLimit('car', 25000000.00, 0, v_car_limit);
    CALL CalculateLoanLimit('cheque', 0, 750000.00, v_cheque_limit);

    SELECT 
        'Land Loan Limit' AS Collateral_Type, v_land_limit AS Calculated_Limit
    UNION ALL
    SELECT 
        'Car Loan Limit', v_car_limit
    UNION ALL
    SELECT 
        'Cheque Loan Limit', v_cheque_limit;
END //
DELIMITER ;

-- Optional: Call the demonstration procedure
CALL DemonstrateCalculateLoanLimit();
