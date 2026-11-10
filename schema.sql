
CREATE DATABASE IF NOT EXISTS employee_attendance_db;

USE employee_attendance_db;

CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hire_date DATE NOT NULL
);

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    check_in TIME,
    check_out TIME,

    FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id),

    UNIQUE (employee_id, attendance_date),

    CHECK (status IN (
        'Present', 'Absent', 'Leave', 'Half-Day'
    )),

    CHECK (
        (check_in IS NULL AND check_out IS NULL)
        OR
        (check_in IS NOT NULL
         AND check_out IS NOT NULL
         AND check_out >= check_in)
    )
);
SHOW TABLES;
SELECT * FROM employees;
SELECT * FROM attendance;

SELECT employee_code, name
FROM employees
ORDER BY employee_code;

USE employee_attendance_db;

DESCRIBE companies;

DESCRIBE company_admins;

DESCRIBE employees;