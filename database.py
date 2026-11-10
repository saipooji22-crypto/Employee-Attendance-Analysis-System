
import mysql.connector


# 1. Connect Python to MySQL
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="M@nju11_sql",
        database="employee_attendance_db"
    )


# 2. CREATE: Add a new employee
def add_employee(code, name, department, email, hire_date):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        query = """
            INSERT INTO employees
            (employee_code, name, department, email, hire_date)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(
            query, (code, name, department, email, hire_date)
        )
        conn.commit()
        print("Employee added successfully!")
        return cursor.lastrowid

    except mysql.connector.Error:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


# 3. READ: Get all employees
def get_employees():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM employees ORDER BY employee_id"
        )
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# 4. READ: Get one employee by ID
def get_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT * FROM employees WHERE employee_id = %s",
            (employee_id,)
        )
        return cursor.fetchone()

    finally:
        cursor.close()
        conn.close()


# 5. UPDATE: Update employee details
def update_employee(
    employee_id, name, department, email, hire_date
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        query = """
            UPDATE employees
            SET name = %s,
                department = %s,
                email = %s,
                hire_date = %s
            WHERE employee_id = %s
        """
        cursor.execute(
            query,
            (name, department, email, hire_date, employee_id)
        )
        conn.commit()

        if cursor.rowcount > 0:
            print("Employee updated successfully!")
            return True

        print("Employee not found or no changes made.")
        return False

    except mysql.connector.Error:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


# 6. DELETE: Delete an employee
def delete_employee(employee_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM employees WHERE employee_id = %s",
            (employee_id,)
        )
        conn.commit()

        if cursor.rowcount > 0:
            print("Employee deleted successfully!")
            return True

        print("Employee not found.")
        return False

    except mysql.connector.Error:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
        
from datetime import date, datetime, time       
        
def validate_attendance_data(
    attendance_date,
    status,
    check_in=None,
    check_out=None
):
    # Check the attendance date
    try:
        if isinstance(attendance_date, datetime):
            pass
        elif isinstance(attendance_date, date):
            pass
        else:
            date.fromisoformat(attendance_date)
    except (ValueError, TypeError):
        raise ValueError("Invalid date. Use YYYY-MM-DD format.")

    # Check the attendance status
    valid_statuses = ["Present", "Absent", "Leave", "Half-Day"]

    if status not in valid_statuses:
        raise ValueError(
            "Invalid status. Choose Present, Absent, Leave, or Half-Day."
        )

    # Convert time strings to time objects
    def convert_time(value):
        if value is None or value == "":
            return None

        if isinstance(value, time):
            return value

        try:
            return time.fromisoformat(value)
        except (ValueError, TypeError):
            raise ValueError("Invalid time. Use HH:MM or HH:MM:SS.")

    check_in = convert_time(check_in)
    check_out = convert_time(check_out)

    # Both times must be supplied together
    if (check_in is None) != (check_out is None):
        raise ValueError(
            "Enter both check-in and check-out times, or leave both empty."
        )

    # Check that checkout is not earlier than check-in
    if check_in is not None and check_out < check_in:
        raise ValueError(
            "Check-out time cannot be earlier than check-in time."
        )

    return True
        


# 7. CREATE: Record attendance

def mark_attendance(
    employee_id, date, status, check_in=None, check_out=None
):
    # Step 1: Validate attendance data before saving
    validate_attendance_data(
        date, status, check_in, check_out
    )

    # Step 2: Connect to the database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        query = """
            INSERT INTO attendance
            (employee_id, attendance_date, status, check_in, check_out)
            VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(
            query, (employee_id, date, status, check_in, check_out)
        )

        conn.commit()
        print("Attendance recorded successfully!")
        return cursor.lastrowid

    except mysql.connector.Error:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()

# 8. READ: Get all attendance with employee details (JOIN)
def get_attendance():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                e.employee_code,
                e.name,
                e.department,
                a.attendance_id,
                a.attendance_date,
                a.status,
                a.check_in,
                a.check_out
            FROM employees e
            INNER JOIN attendance a
                ON e.employee_id = a.employee_id
            ORDER BY a.attendance_date, e.name
        """
        cursor.execute(query)
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# 9. READ: Get attendance for one employee
def get_employee_attendance(employee_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                e.employee_code,
                e.name,
                a.attendance_date,
                a.status,
                a.check_in,
                a.check_out
            FROM employees e
            INNER JOIN attendance a
                ON e.employee_id = a.employee_id
            WHERE e.employee_id = %s
            ORDER BY a.attendance_date
        """
        cursor.execute(query, (employee_id,))
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# 10. UPDATE: Correct an attendance record

# 10. UPDATE: Correct an attendance record
def update_attendance(
    attendance_id, status, check_in=None, check_out=None
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Step 1: Find the existing attendance date
        cursor.execute(
            """
            SELECT attendance_date
            FROM attendance
            WHERE attendance_id = %s
            """,
            (attendance_id,)
        )

        record = cursor.fetchone()

        if record is None:
            print("Attendance record not found.")
            return False

        # Step 2: Validate the updated attendance details
        validate_attendance_data(
            record["attendance_date"],
            status,
            check_in,
            check_out
        )

        # Step 3: Update the database
        cursor.execute(
            """
            UPDATE attendance
            SET status = %s,
                check_in = %s,
                check_out = %s
            WHERE attendance_id = %s
            """,
            (status, check_in, check_out, attendance_id)
        )

        conn.commit()
        print("Attendance updated successfully!")
        return True

    except (mysql.connector.Error, ValueError):
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


# 11. DELETE: Delete an attendance record
def delete_attendance(attendance_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM attendance WHERE attendance_id = %s",
            (attendance_id,)
        )
        conn.commit()

        if cursor.rowcount > 0:
            print("Attendance record deleted successfully!")
            return True

        print("Attendance record not found.")
        return False

    except mysql.connector.Error:
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()


# 12. READ: Attendance summary for every employee
def get_attendance_summary():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                e.employee_id,
                e.employee_code,
                e.name,

                COUNT(a.attendance_id) AS recorded_days,

                COALESCE(
                    SUM(a.status = 'Present'), 0
                ) AS present_days,

                COALESCE(
                    SUM(a.status = 'Absent'), 0
                ) AS absent_days,

                COALESCE(
                    SUM(a.status = 'Leave'), 0
                ) AS leave_days,

                COALESCE(
                    SUM(a.status = 'Half-Day'), 0
                ) AS half_days,

                ROUND(
                    100.0 * (
                        COALESCE(SUM(a.status = 'Present'), 0)
                        + 0.5 * COALESCE(
                            SUM(a.status = 'Half-Day'), 0
                        )
                    ) /
                    NULLIF(
                        SUM(
                            a.status IN (
                                'Present', 'Absent', 'Half-Day'
                            )
                        ), 0
                    ),
                    2
                ) AS attendance_percentage

            FROM employees e
            LEFT JOIN attendance a
                ON e.employee_id = a.employee_id

            GROUP BY
                e.employee_id, e.employee_code, e.name

            ORDER BY e.employee_code
        """
        cursor.execute(query)
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# 13. READ: Find employees with attendance below a percentage
def get_low_attendance(limit_percentage=75):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                e.employee_code,
                e.name,

                ROUND(
                    100.0 * (
                        SUM(a.status = 'Present')
                        + 0.5 * SUM(a.status = 'Half-Day')
                    ) /
                    NULLIF(
                        SUM(
                            a.status IN (
                                'Present', 'Absent', 'Half-Day'
                            )
                        ), 0
                    ),
                    2
                ) AS attendance_percentage

            FROM employees e
            INNER JOIN attendance a
                ON e.employee_id = a.employee_id

            GROUP BY e.employee_id, e.employee_code, e.name

            HAVING attendance_percentage < %s

            ORDER BY attendance_percentage
        """
        cursor.execute(query, (limit_percentage,))
        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()
        



# =========================================
# FEATURE 1: MONTHLY ATTENDANCE ANALYSIS
# =========================================

def get_monthly_attendance(month, year):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            e.employee_code,
            e.name,
            e.department,

            SUM(CASE WHEN a.status = 'Present'
                     THEN 1 ELSE 0 END) AS present_days,

            SUM(CASE WHEN a.status = 'Absent'
                     THEN 1 ELSE 0 END) AS absent_days,

            SUM(CASE WHEN a.status = 'Leave'
                     THEN 1 ELSE 0 END) AS leave_days,

            SUM(CASE WHEN a.status = 'Half-Day'
                     THEN 1 ELSE 0 END) AS half_days,

            ROUND(
                100.0 * (
                    SUM(CASE WHEN a.status = 'Present'
                             THEN 1 ELSE 0 END)
                    + 0.5 * SUM(CASE WHEN a.status = 'Half-Day'
                                     THEN 1 ELSE 0 END)
                )
                /
                NULLIF(
                    SUM(CASE WHEN a.status IN
                        ('Present', 'Absent', 'Half-Day')
                        THEN 1 ELSE 0 END),
                    0
                ),
                2
            ) AS attendance_percentage

        FROM employees e

        LEFT JOIN attendance a
            ON e.employee_id = a.employee_id
            AND MONTH(a.attendance_date) = %s
            AND YEAR(a.attendance_date) = %s

        GROUP BY
            e.employee_id,
            e.employee_code,
            e.name,
            e.department

        ORDER BY e.employee_code
    """

    try:
        cursor.execute(query, (month, year))
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


# =========================================
# FEATURE 2: ATTENDANCE ON A SELECTED DATE
# =========================================

def get_attendance_by_date(selected_date):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
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

        WHERE a.attendance_date = %s
          AND a.status IN ('Present', 'Absent', 'Leave')

        ORDER BY a.status, e.name
    """

    try:
        cursor.execute(query, (selected_date,))
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


# =========================================
# FEATURE 3: SEARCH EMPLOYEE BY CODE
# =========================================

def search_employee_by_code(employee_code):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = """
        SELECT
            e.employee_code,
            e.name,
            e.department,
            e.email,
            e.hire_date,

            COUNT(a.attendance_id) AS recorded_days,

            SUM(CASE WHEN a.status = 'Present'
                     THEN 1 ELSE 0 END) AS present_days,

            SUM(CASE WHEN a.status = 'Absent'
                     THEN 1 ELSE 0 END) AS absent_days,

            SUM(CASE WHEN a.status = 'Leave'
                     THEN 1 ELSE 0 END) AS leave_days,

            SUM(CASE WHEN a.status = 'Half-Day'
                     THEN 1 ELSE 0 END) AS half_days,

            ROUND(
                100.0 * (
                    SUM(CASE WHEN a.status = 'Present'
                             THEN 1 ELSE 0 END)
                    + 0.5 * SUM(CASE WHEN a.status = 'Half-Day'
                                     THEN 1 ELSE 0 END)
                )
                /
                NULLIF(
                    SUM(CASE WHEN a.status IN
                        ('Present', 'Absent', 'Half-Day')
                        THEN 1 ELSE 0 END),
                    0
                ),
                2
            ) AS attendance_percentage

        FROM employees e

        LEFT JOIN attendance a
            ON e.employee_id = a.employee_id

        WHERE e.employee_code = %s

        GROUP BY
            e.employee_id,
            e.employee_code,
            e.name,
            e.department,
            e.email,
            e.hire_date
    """

    try:
        cursor.execute(query, (employee_code,))
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()
        


# 14. Test the database functions
if __name__ == "__main__":
    try:
        print("\n--- EMPLOYEES ---")
        for employee in get_employees():
            print(employee)

        print("\n--- ATTENDANCE RECORDS ---")
        for record in get_attendance():
            print(record)

        print("\n--- ATTENDANCE SUMMARY ---")
        for summary in get_attendance_summary():
            print(summary)

        print("\n--- EMPLOYEES BELOW 75% ---")
        for employee in get_low_attendance(75):
            print(employee)

    except mysql.connector.Error as error:
        print("Database error:", error)






