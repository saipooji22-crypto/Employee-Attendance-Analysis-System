
USE employee_attendance_db;

-- Insert sample employees
INSERT INTO employees
(employee_code, name, department, email, hire_date)
VALUES
('E101', 'Ananya Rao', 'IT', 'ananya@example.com', '2025-01-15'),
('E102', 'Rahul Kumar', 'HR', 'rahul@example.com', '2025-02-10'),
('E103', 'Priya Sharma', 'Finance', 'priya@example.com', '2025-03-01'),
('E104', 'Arjun Reddy', 'IT', 'arjun@example.com', '2025-04-12')
('E105', 'Sneha Reddy', 'CSE', 'sneha@gmail.com', '2026-11-02'),
('E106', 'Meghana Rao', 'IT', 'meghana@gmail.com', '2026-11-02'),
('E107', 'Kavya Sharma', 'HR', 'kavya@gmail.com', '2026-11-02'),
('E108', 'Divya Kumar', 'Finance', 'divya@gmail.com', '2026-11-02'),
('E109', 'Aarohi Reddy', 'CSE', 'aarohi@gmail.com', '2026-01-10'),
('E110', 'Nikhil Kumar', 'IT', 'nikhil@gmail.com', '2026-01-12'),
('E111', 'Sravani Rao', 'HR', 'sravani@gmail.com', '2026-01-15'),
('E112', 'Varun Sharma', 'Finance', 'varun@gmail.com', '2026-01-18'),
('E113', 'Keerthana Reddy', 'ECE', 'keerthana@gmail.com', '2026-01-20'),
('E114', 'Rohit Verma', 'CSE', 'rohit@gmail.com', '2026-01-22'),
('E115', 'Anusha Priya', 'IT', 'anusha@gmail.com', '2026-02-01'),
('E116', 'Sai Krishna', 'Mechanical', 'saikrishna@gmail.com', '2026-02-05'),
('E117', 'Pavani Devi', 'HR', 'pavani@gmail.com', '2026-02-08'),
('E118', 'Manoj Reddy', 'CSE', 'manoj@gmail.com', '2026-02-10'),
('E119', 'Harika Singh', 'Finance', 'harika@gmail.com', '2026-02-12'),
('E120', 'Abhinav Kumar', 'IT', 'abhinav@gmail.com', '2026-02-15'),
('E121', 'Deepika Rao', 'ECE', 'deepika@gmail.com', '2026-02-18'),
('E122', 'Karthik Reddy', 'CSE', 'karthik@gmail.com', '2026-02-20'),
('E123', 'Mounika Sharma', 'IT', 'mounika@gmail.com', '2026-02-25'),
('E124', 'Sowmya Reddy', 'CSE', 'sowmya@gmail.com', '2026-03-01'),
('E125', 'Teja Kumar', 'IT', 'teja@gmail.com', '2026-03-02'),
('E126', 'Lasya Rao', 'HR', 'lasya@gmail.com', '2026-03-03');

-- Insert sample attendance records
INSERT INTO attendance
(employee_id, attendance_date, status, check_in, check_out)
VALUES
(1, '2026-10-19', 'Present', '09:00:00', '17:00:00'),
(1, '2026-10-20', 'Present', '09:10:00', '17:05:00'),
(2, '2026-10-19', 'Present', '09:00:00', '17:00:00'),
(2, '2026-10-20', 'Absent', NULL, NULL),
(3, '2026-10-19', 'Leave', NULL, NULL),
(3, '2026-10-20', 'Present', '08:55:00', '17:10:00'),
(4, '2026-10-19', 'Half-Day', '09:00:00', '13:00:00'),
(4, '2026-10-20', 'Present', '09:05:00', '17:00:00'),
(5, '2026-10-19', 'Present', '09:00:00', '17:00:00'),
(5, '2026-10-20', 'Present', '09:15:00', '17:10:00'),
(6, '2026-10-19', 'Absent', NULL, NULL),
(6, '2026-10-20', 'Present', '09:05:00', '17:00:00'),
(7, '2026-10-19', 'Present', '08:55:00', '17:05:00'),
(7, '2026-10-20', 'Leave', NULL, NULL),
(8, '2026-10-19', 'Half-Day', '09:00:00', '13:00:00'),
(8, '2026-10-20', 'Present', '09:10:00', '17:00:00'),
(9, '2026-10-19', 'Present', '09:05:00', '17:15:00'),
(9, '2026-10-20', 'Present', '09:00:00', '17:00:00'),
(10, '2026-10-19', 'Leave', NULL, NULL),
(10, '2026-10-20', 'Present', '08:50:00', '17:05:00'),
(11, '2026-10-19', 'Present', '09:10:00', '17:00:00'),
(11, '2026-10-20', 'Absent', NULL, NULL),
(12, '2026-10-19', 'Present', '09:00:00', '17:10:00'),
(12, '2026-10-20', 'Half-Day', '09:00:00', '13:00:00'),
(13, '2026-10-19', 'Present', '08:55:00', '17:00:00'),
(13, '2026-10-20', 'Present', '09:05:00', '17:10:00');
