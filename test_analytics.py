
from database import (
    get_monthly_attendance,
    get_attendance_by_date,
    search_employee_by_code
)


# =========================================
# TEST 1: MONTHLY ATTENDANCE
# =========================================

print("\n========== MONTHLY ATTENDANCE ==========")

month = 10
year = 2026

monthly_data = get_monthly_attendance(month, year)

for employee in monthly_data:
    print("\nEmployee Code:", employee["employee_code"])
    print("Name:", employee["name"])
    print("Department:", employee["department"])
    print("Present Days:", employee["present_days"])
    print("Absent Days:", employee["absent_days"])
    print("Leave Days:", employee["leave_days"])
    print("Half Days:", employee["half_days"])
    print(
        "Attendance Percentage:",
        employee["attendance_percentage"]
    )


# =========================================
# TEST 2: ATTENDANCE ON A SELECTED DATE
# =========================================

print("\n========== SELECTED DATE ATTENDANCE ==========")

selected_date = "2026-10-20"

date_data = get_attendance_by_date(selected_date)

if date_data:
    for employee in date_data:
        print("\nEmployee Code:", employee["employee_code"])
        print("Name:", employee["name"])
        print("Department:", employee["department"])
        print("Date:", employee["attendance_date"])
        print("Status:", employee["status"])
        print("Check In:", employee["check_in"])
        print("Check Out:", employee["check_out"])
else:
    print("No matching attendance records found.")


# =========================================
# TEST 3: SEARCH EMPLOYEE BY CODE
# =========================================

print("\n========== EMPLOYEE SEARCH ==========")

employee_code = "E101"

employee = search_employee_by_code(employee_code)

if employee:
    print("Employee Code:", employee["employee_code"])
    print("Name:", employee["name"])
    print("Department:", employee["department"])
    print("Email:", employee["email"])
    print("Hire Date:", employee["hire_date"])
    print("Total Recorded Days:", employee["recorded_days"])
    print("Present Days:", employee["present_days"])
    print("Absent Days:", employee["absent_days"])
    print("Leave Days:", employee["leave_days"])
    print("Half Days:", employee["half_days"])
    print(
        "Attendance Percentage:",
        employee["attendance_percentage"]
    )
else:
    print("Employee not found.")
