import secrets
from werkzeug.security import generate_password_hash


from datetime import date, datetime, time
from decimal import Decimal

from flask import Flask, jsonify, render_template, request
from mysql.connector import Error

from database import get_connection


app = Flask(__name__)

# --------------------------------------------------
# Helper functions
# --------------------------------------------------

def json_value(value):
    """Convert MySQL values into JSON-compatible values."""
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    
    if isinstance(value, Decimal):
        return float(value)

    return value



def format_time(value):
    """Convert database and frontend times to MySQL-compatible HH:MM:SS."""
    if value is None or value == "":
        return ""

    if isinstance(value, time):
        return value.strftime("%H:%M:%S")

    text = str(value).strip().upper()

    # Handle 12-hour times such as 9:00 AM and 6:00 PM.
    for fmt in ("%I:%M %p", "%I:%M:%S %p"):
        try:
            return datetime.strptime(text, fmt).strftime("%H:%M:%S")
        except ValueError:
            pass

    # Handle 24-hour times such as 09:00 or 09:00:00.
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).strftime("%H:%M:%S")
        except ValueError:
            pass

    raise ValueError(
        f"Invalid time '{value}'. Use HH:MM, HH:MM:SS, or a time with AM/PM."
    )


def get_table_columns(cursor, table_name):
    """Return the available columns in a MySQL table."""
    cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
    return {row["Field"] for row in cursor.fetchall()}


def first_value(item, *keys, default=None):
    """Return the first non-None value from the given dictionary keys."""
    for key in keys:
        if key in item and item[key] is not None:
            return item[key]

    return default


def as_bool(value, default=True):
    """Convert common database and frontend values to a Boolean."""
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().lower() not in (
        "0", "false", "no", "off", ""
    )


def normalize_date(value):
    """Normalize a date or ISO date string to YYYY-MM-DD."""
    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if value is None:
        return None

    return str(value).strip()[:10]


def normalize_status(status, check_in=None):
    """
    Convert database attendance statuses into frontend statuses.

    The database supports Present, Absent, Leave and Half-Day.
    The frontend additionally supports Late.
    """
    status = str(status or "Absent").strip().title()

    if status == "Half-Day":
        return "Present"

    if status == "Present" and check_in:
        # Current default shift: 09:00 with 15 minutes of grace.
        if format_time(check_in) > "09:15":
            return "Late"

    if status not in {"Present", "Late", "Absent", "Leave"}:
        return "Absent"

    return status


# --------------------------------------------------
# Main page
# --------------------------------------------------

@app.get("/")
def index():
    return render_template("index.html")


# --------------------------------------------------
# Database connection test
# --------------------------------------------------

@app.get("/api/health")
def health():
    """Check whether Flask can connect to MySQL."""
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()

        return jsonify({
            "ok": True,
            "database": "connected"
        })

    except Error as exc:
        app.logger.exception("Database health check failed")

        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# --------------------------------------------------
# GET: Load employees and attendance from MySQL
# --------------------------------------------------
# ==========================================
# COMPANY REGISTRATION
# ==========================================

@app.post("/api/company-signup")
def company_signup():

    data = request.get_json(silent=True) or {}

    company_name = str(data.get("company_name", "")).strip()
    company_email = str(data.get("company_email", "")).strip().lower()
    company_phone = str(data.get("company_phone", "")).strip()

    admin_name = str(data.get("admin_name", "")).strip()
    admin_email = str(data.get("admin_email", "")).strip().lower()
    password = str(data.get("password", ""))

    # Validate required fields
    if not all([
        company_name,
        company_email,
        company_phone,
        admin_name,
        admin_email,
        password
    ]):
        return jsonify({
            "error": "Please fill in all registration fields."
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        conn.start_transaction()
        cursor = conn.cursor()

        # Check duplicate company email
        cursor.execute(
            "SELECT company_id FROM companies WHERE company_email = %s",
            (company_email,)
        )

        if cursor.fetchone():
            conn.rollback()
            return jsonify({
                "error": "This company email is already registered."
            }), 409

        # Check duplicate admin email
        cursor.execute(
            "SELECT admin_id FROM company_admins WHERE email = %s",
            (admin_email,)
        )

        if cursor.fetchone():
            conn.rollback()
            return jsonify({
                "error": "This HR admin email is already registered."
            }), 409

        # Generate a unique company code
        company_code = "AT" + secrets.token_hex(3).upper()

        cursor.execute("""
            INSERT INTO companies
            (company_code, company_name, company_email, company_phone)
            VALUES (%s, %s, %s, %s)
        """, (
            company_code,
            company_name,
            company_email,
            company_phone
        ))

        company_id = cursor.lastrowid

        # Hash the password before storing it
        password_hash = generate_password_hash(password)

        # Create the initial company administrator
        cursor.execute("""
            INSERT INTO company_admins
            (company_id, full_name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, %s, 'Admin', TRUE)
        """, (
            company_id,
            admin_name,
            admin_email,
            password_hash
        ))

        conn.commit()

        return jsonify({
            "ok": True,
            "message": "Company registered successfully!",
            "company_code": company_code
        }), 201

    except Error:
        if conn:
            conn.rollback()

        app.logger.exception("Company registration failed")

        return jsonify({
            "error": "Registration failed. Please check the database structure."
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()
@app.get("/api/data")
def load_app_data():
    """
    Return data in the format expected by AttendTrack.

    Frontend attendance format:
    {
        "2026-10-21": {
            "1": {
                "status": "Present",
                "in": "09:00",
                "out": "18:00",
                "note": "",
                "source": "manual"
            }
        }
    }
    """

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        employee_columns = get_table_columns(
            cursor, "employees"
        )

        # Fetch employees.
        cursor.execute("""
            SELECT *
            FROM employees
            ORDER BY employee_id
        """)

        employee_rows = cursor.fetchall()
        employees = []

        for row in employee_rows:
            employee_id = row["employee_id"]

            employee = {
                "id": employee_id,
                "employee_id": employee_id,
                "emp_code": row.get("employee_code", ""),
                "employee_code": row.get("employee_code", ""),
                "name": row.get("name", ""),
                "department": row.get("department", ""),
                "designation": (
                    row.get("designation", "")
                    if "designation" in employee_columns
                    else ""
                ),
                "join_date": json_value(row.get("hire_date")),
                "hire_date": json_value(row.get("hire_date")),
                "email": row.get("email") or "",
                "phone": (
                    row.get("phone", "") or ""
                    if "phone" in employee_columns
                    else ""
                ),
                "active": (
                    as_bool(row.get("active"), True)
                    if "active" in employee_columns
                    else True
                ),
                "inactive_since": (
                    json_value(row.get("inactive_since"))
                    if "inactive_since" in employee_columns
                    else None
                ),
                "pin": (
                    row.get("pin", "") or ""
                    if "pin" in employee_columns
                    else ""
                ),
            }

            employees.append(employee)

        # Fetch attendance rows and their employee details.
        cursor.execute("""
            SELECT
                a.*,
                e.employee_code,
                e.name,
                e.department
            FROM attendance AS a
            JOIN employees AS e
                ON e.employee_id = a.employee_id
            ORDER BY a.attendance_date, e.name
        """)

        attendance_rows = cursor.fetchall()

        # IMPORTANT:
        # The frontend expects an object indexed by date and employee ID,
        # not a list of database rows.
        attendance = {}

        for row in attendance_rows:
            employee_id = str(row["employee_id"])
            day = normalize_date(row.get("attendance_date"))

            if not day:
                continue

            check_in = format_time(row.get("check_in"))
            check_out = format_time(row.get("check_out"))
            check_in = check_in[:5] if check_in else ""
            check_out = check_out[:5] if check_out else ""
        
            status = normalize_status(
                row.get("status", "Absent"),
                check_in
            )

            attendance.setdefault(day, {})[employee_id] = {
                "status": status,
                "in": check_in,
                "out": check_out,
                "note": "",
                "source": "manual",
            }

        # The current SQL schema has no settings table.
        # These are defaults, not persisted settings.
        settings = {
            "company": "AttendTrack",
            "shiftStart": "09:00",
            "shiftEnd": "18:00",
            "grace": 15,
            "fullDay": 8,
            "workDays": [1, 2, 3, 4, 5],
        }

        # Generate the next available numeric ID.
        employee_ids = [
            int(employee["id"])
            for employee in employees
            if str(employee["id"]).isdigit()
        ]

        next_id = max(employee_ids + [0]) + 1

        return jsonify({
            "version": 2,
            "nextId": next_id,
            "settings": settings,
            "employees": employees,
            "attendance": attendance,
        })

    except Error as exc:
        app.logger.exception("Could not load application data")

        return jsonify({
            "error": "Could not load data from MySQL.",
            "details": str(exc),
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# --------------------------------------------------
# PUT: Save employees and attendance to MySQL
# --------------------------------------------------

@app.put("/api/data")
def save_app_data():
    """
    Save the complete frontend data object to MySQL.

    The frontend sends attendance as a nested object.
    This route converts it into individual database records.

    Existing attendance records are updated.
    New attendance records are inserted.
    Records omitted from the request are not deleted.
    """

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "error": "Expected a JSON object."
        }), 400

    employees = payload.get("employees", [])
    raw_attendance = payload.get("attendance", {})

    if not isinstance(employees, list):
        return jsonify({
            "error": "'employees' must be a list."
        }), 400

    # Convert frontend attendance into a flat list.
    # Also accept a list for compatibility with older payloads.
    if isinstance(raw_attendance, dict):
        attendance = []

        for day, employee_records in raw_attendance.items():
            if not isinstance(employee_records, dict):
                continue

            for employee_id, record in employee_records.items():
                if not isinstance(record, dict):
                    continue

                attendance.append({
                    **record,
                    "date": day,
                    "employee_id": employee_id,
                })

    elif isinstance(raw_attendance, list):
        attendance = raw_attendance

    else:
        return jsonify({
            "error": "'attendance' must be an object or list."
        }), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        conn.start_transaction()

        cursor = conn.cursor(dictionary=True)

        employee_columns = get_table_columns(
            cursor, "employees"
        )

        # Map frontend IDs and employee codes to MySQL IDs.
        frontend_to_db_id = {}
        code_to_db_id = {}

        # ------------------------------------------
        # Save employees
        # ------------------------------------------

        for employee in employees:
            if not isinstance(employee, dict):
                continue

            code = str(first_value(
                employee,
                "emp_code",
                "employee_code",
                "empCode",
                default=""
            )).strip().upper()

            name = str(first_value(
                employee,
                "name",
                "full_name",
                default=""
            )).strip()

            department = str(first_value(
                employee,
                "department",
                default=""
            )).strip()

            email = str(first_value(
                employee,
                "email",
                default=""
            )).strip() or None

            hire_date = first_value(
                employee,
                "join_date",
                "hire_date",
                "hireDate"
            )

            hire_date = normalize_date(hire_date) or date.today().isoformat()

            if not code or not name:
                continue

            # Check whether the employee already exists.
            cursor.execute("""
                SELECT employee_id
                FROM employees
                WHERE employee_code = %s
            """, (code,))

            existing = cursor.fetchone()

            values = {
                "employee_code": code,
                "name": name,
                "department": department or "General",
                "email": email,
                "hire_date": hire_date,
            }

            # Support optional columns if they exist in the table.
            optional_values = {
                "designation": first_value(
                    employee, "designation", default=""
                ),
                "phone": first_value(
                    employee, "phone", default=""
                ),
                "active": int(as_bool(
                    first_value(employee, "active"),
                    True
                )),
                "inactive_since": first_value(
                    employee, "inactive_since"
                ),
                "pin": str(first_value(
                    employee, "pin", default=""
                )),
            }

            for column, value in optional_values.items():
                if column in employee_columns:
                    values[column] = value

            if existing:
                db_id = existing["employee_id"]

                update_columns = [
                    column
                    for column in values
                    if column != "employee_code"
                ]

                sql = (
                    "UPDATE employees SET "
                    + ", ".join(
                        f"`{column}` = %s"
                        for column in update_columns
                    )
                    + " WHERE employee_id = %s"
                )

                cursor.execute(
                sql,
                [
                   None if column == "inactive_since" and values[column] == ""
                   else values[column]
                   for column in update_columns
                ] + [db_id]
                )
            else:
                insert_columns = list(values.keys())

                sql = (
                    "INSERT INTO employees ("
                    + ", ".join(
                        f"`{column}`"
                        for column in insert_columns
                    )
                    + ") VALUES ("
                    + ", ".join(["%s"] * len(insert_columns))
                    + ")"
                )

                cursor.execute(
                sql,
                [
                    None if column == "inactive_since" and values[column] == ""
                    else values[column]
                    for column in insert_columns
                ]
                )

                db_id = cursor.lastrowid

            frontend_id = first_value(
                employee,
                "id",
                "employee_id",
                "employeeId"
            )

            if frontend_id is not None:
                frontend_to_db_id[str(frontend_id)] = db_id

            code_to_db_id[code] = db_id

        # ------------------------------------------
        # Save attendance
        # ------------------------------------------

        for record in attendance:
            if not isinstance(record, dict):
                continue

            code = first_value(
                record,
                "emp_code",
                "employee_code",
                "empCode"
            )

            raw_employee_id = first_value(
                record,
                "employee_id",
                "employeeId",
                "emp_id",
                "empId",
                "employee"
            )

            db_employee_id = None

            # First, resolve by employee code.
            if code is not None:
                code = str(code).strip().upper()
                db_employee_id = code_to_db_id.get(code)

                if db_employee_id is None:
                    cursor.execute("""
                        SELECT employee_id
                        FROM employees
                        WHERE employee_code = %s
                    """, (code,))

                    found = cursor.fetchone()

                    if found:
                        db_employee_id = found["employee_id"]

            # Otherwise, resolve using the frontend employee ID.
            if db_employee_id is None and raw_employee_id is not None:
                db_employee_id = frontend_to_db_id.get(
                    str(raw_employee_id)
                )

                if db_employee_id is None:
                    try:
                        candidate_id = int(raw_employee_id)

                        cursor.execute("""
                            SELECT employee_id
                            FROM employees
                            WHERE employee_id = %s
                        """, (candidate_id,))

                        found = cursor.fetchone()

                        if found:
                            db_employee_id = found["employee_id"]

                    except (ValueError, TypeError):
                        pass

            day = first_value(
                record,
                "date",
                "attendance_date",
                "attendanceDate"
            )

            day = normalize_date(day)

            status = str(first_value(
                record,
                "status",
                default="Absent"
            )).strip().title()

            check_in = first_value(
                record,
                "check_in",
                "checkIn",
                "in",
                "checkin"
            )

            check_out = first_value(
                record,
                "check_out",
                "checkOut",
                "out",
                "checkout"
            )

            check_in = format_time(check_in) or None
            check_out = format_time(check_out) or None

            # Ignore incomplete records.
            if not db_employee_id or not day:
                continue

            # The current SQL schema does not allow Late as a status.
            # Store it as Present; the GET route infers Late from check-in.
            if status == "Late":
                status = "Present"

            if status == "Half-Day":
                status = "Half-Day"

            if status not in {
                "Present",
                "Absent",
                "Leave",
                "Half-Day"
            }:
                status = "Absent"

            # Absent and Leave records should not have check-in/out times.
            if status in {"Absent", "Leave"}:
                check_in = None
                check_out = None

            # Find an existing record for this employee and date.
            cursor.execute("""
                SELECT attendance_id
                FROM attendance
                WHERE employee_id = %s
                  AND attendance_date = %s
            """, (db_employee_id, day))

            existing_attendance = cursor.fetchone()

            if existing_attendance:
                cursor.execute("""
                    UPDATE attendance
                    SET status = %s,
                        check_in = %s,
                        check_out = %s
                    WHERE attendance_id = %s
                """, (
                    status,
                    check_in,
                    check_out,
                    existing_attendance["attendance_id"],
                ))

            else:
                cursor.execute("""
                    INSERT INTO attendance (
                        employee_id,
                        attendance_date,
                        status,
                        check_in,
                        check_out
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    db_employee_id,
                    day,
                    status,
                    check_in,
                    check_out,
                ))

        conn.commit()

        return jsonify({
            "ok": True,
            "message": "Data saved to MySQL.",
        })

    except (Error, ValueError, TypeError) as exc:
        if conn:
            conn.rollback()

        app.logger.exception("Could not save application data")

        return jsonify({
            "error": "Could not save data to MySQL.",
            "details": str(exc),
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conn:
            conn.close()


# --------------------------------------------------
# Error handling
# --------------------------------------------------

@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "API endpoint not found."
        }), 404

    return "Page not found", 404


# --------------------------------------------------
# Start Flask
# --------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
