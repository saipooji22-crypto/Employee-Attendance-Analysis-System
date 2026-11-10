
USE employee_attendance_db;

-- =========================================
-- FEATURE 1: MONTHLY ATTENDANCE ANALYSIS
-- Change these values to select a month.
-- =========================================

SET @selected_month = 10;
SET @selected_year = 2026;

SELECT
    e.employee_code,
    e.name,
    e.department,

    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
        AS present_days,

    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END)
        AS absent_days,

    SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END)
        AS leave_days,

    SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END)
        AS half_days,

    ROUND(
        100.0 *
        (
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
            + 0.5 * SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END)
        )
        /
        NULLIF(
            SUM(CASE WHEN a.status IN ('Present', 'Absent', 'Half-Day')
                     THEN 1 ELSE 0 END),
            0
        ),
        2
    ) AS attendance_percentage

FROM employees e

LEFT JOIN attendance a
    ON e.employee_id = a.employee_id
    AND MONTH(a.attendance_date) = @selected_month
    AND YEAR(a.attendance_date) = @selected_year

GROUP BY
    e.employee_id,
    e.employee_code,
    e.name,
    e.department

ORDER BY e.employee_code;


-- =========================================
-- FEATURE 2: ATTENDANCE ON A SELECTED DATE
-- Change the date to the date you need.
-- =========================================

SET @selected_date = '2026-10-20';

SELECT
    e.employee_code,
    e.name,
    e.department,
    a.attendance_date,
    a.status,
    a.check_in,
    a.check_out

FROM employees e

JOIN attendance a
    ON e.employee_id = a.employee_id

WHERE a.attendance_date = @selected_date
  AND a.status IN ('Present', 'Absent', 'Leave')

ORDER BY a.status, e.name;


-- =========================================
-- FEATURE 3: SEARCH EMPLOYEE BY CODE
-- Change E101 to another employee code.
-- =========================================

SET @search_code = 'E101';

SELECT
    e.employee_code,
    e.name,
    e.department,
    e.email,
    e.hire_date,

    COUNT(a.attendance_id) AS recorded_days,

    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
        AS present_days,

    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END)
        AS absent_days,

    SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END)
        AS leave_days,

    SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END)
        AS half_days,

    ROUND(
        100.0 *
        (
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END)
            + 0.5 * SUM(CASE WHEN a.status = 'Half-Day' THEN 1 ELSE 0 END)
        )
        /
        NULLIF(
            SUM(CASE WHEN a.status IN ('Present', 'Absent', 'Half-Day')
                     THEN 1 ELSE 0 END),
            0
        ),
        2
    ) AS attendance_percentage

FROM employees e

LEFT JOIN attendance a
    ON e.employee_id = a.employee_id

WHERE e.employee_code = @search_code

GROUP BY
    e.employee_id,
    e.employee_code,
    e.name,
    e.department,
    e.email,
    e.hire_date;
