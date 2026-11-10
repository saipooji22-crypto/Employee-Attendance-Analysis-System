
from database import (
    add_employee,
    get_employee,
    update_employee,
    delete_employee
)

# CREATE: Add a test employee
employee_id = add_employee(
    "E105",
    "Kiran Teja",
    "IT",
    "kiran@example.com",
    "2026-06-01"
)

# READ: Display the new employee
print(get_employee(employee_id))

# UPDATE: Change the employee's department
update_employee(
    employee_id,
    "Kiran Teja",
    "HR",
    "kiran@example.com",
    "2026-06-01"
)

print("After update:")
print(get_employee(employee_id))

# DELETE: Delete the test employee
delete_employee(employee_id)

print("After deletion:")
print(get_employee(employee_id))



from database import (
    mark_attendance,
    get_employee_attendance,
    update_attendance,
    delete_attendance
)

print("\n--- TEST ATTENDANCE OPERATIONS ---")

# Use employee ID 1 (Ananya Rao)
# Record attendance on a new test date
attendance_id = mark_attendance(
    1,
    "2026-10-21",
    "Present",
    "09:00:00",
    "17:00:00"
)

# Read attendance records
print("\nAttendance records:")
for record in get_employee_attendance(1):
    print(record)

# Update the test attendance record
update_attendance(
    attendance_id,
    "Half-Day",
    "09:00:00",
    "13:00:00"
)

# Delete only the test attendance record
delete_attendance(attendance_id)

print("\nAttendance test completed!")
