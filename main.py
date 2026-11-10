
import mysql.connector

from database import (
    add_employee,
    get_employees,
    update_employee,
    delete_employee,
    mark_attendance,
    get_attendance,
    update_attendance,
    delete_attendance,
    get_monthly_attendance,
    get_attendance_by_date,
    search_employee_by_code,
    get_attendance_summary,
    get_low_attendance
)


def display_records(records):
    if not records:
        print("\nNo records found.")
        return

    for number, record in enumerate(records, start=1):
        print(f"\n--- Record {number} ---")
        for key, value in record.items():
            print(f"{key.replace('_', ' ').title()}: {value}")


def add_employee_menu():
    print("\n--- ADD EMPLOYEE ---")

    code = input("Employee code: ").strip()
    name = input("Employee name: ").strip()
    department = input("Department: ").strip()
    email = input("Email: ").strip()
    hire_date = input("Hire date (YYYY-MM-DD): ").strip()

    add_employee(code, name, department, email, hire_date)


def update_employee_menu():
    print("\n--- UPDATE EMPLOYEE ---")

    employee_id = int(input("Employee ID: "))
    name = input("New name: ").strip()
    department = input("New department: ").strip()
    email = input("New email: ").strip()
    hire_date = input("New hire date (YYYY-MM-DD): ").strip()

    update_employee(
        employee_id, name, department, email, hire_date
    )


def delete_employee_menu():
    print("\n--- DELETE EMPLOYEE ---")

    employee_id = int(input("Employee ID to delete: "))
    confirm = input("Type YES to confirm deletion: ").strip()

    if confirm == "YES":
        delete_employee(employee_id)
    else:
        print("Deletion cancelled.")


def mark_attendance_menu():
    print("\n--- MARK ATTENDANCE ---")

    employee_id = int(input("Employee ID: "))
    attendance_date = input("Date (YYYY-MM-DD): ").strip()

    print("Statuses: Present, Absent, Leave, Half-Day")
    status = input("Attendance status: ").strip()

    check_in = input(
        "Check-in time (HH:MM:SS, or press Enter): "
    ).strip() or None

    check_out = input(
        "Check-out time (HH:MM:SS, or press Enter): "
    ).strip() or None

    mark_attendance(
        employee_id,
        attendance_date,
        status,
        check_in,
        check_out
    )


def update_attendance_menu():
    print("\n--- UPDATE ATTENDANCE ---")

    attendance_id = int(input("Attendance ID: "))

    print("Statuses: Present, Absent, Leave, Half-Day")
    status = input("New status: ").strip()

    check_in = input(
        "New check-in time (HH:MM:SS, or press Enter): "
    ).strip() or None

    check_out = input(
        "New check-out time (HH:MM:SS, or press Enter): "
    ).strip() or None

    update_attendance(
        attendance_id, status, check_in, check_out
    )


def delete_attendance_menu():
    print("\n--- DELETE ATTENDANCE ---")

    attendance_id = int(input("Attendance ID to delete: "))
    confirm = input("Type YES to confirm deletion: ").strip()

    if confirm == "YES":
        delete_attendance(attendance_id)
    else:
        print("Deletion cancelled.")


def monthly_analysis_menu():
    print("\n--- MONTHLY ATTENDANCE ANALYSIS ---")

    month = int(input("Enter month (1-12): "))
    year = int(input("Enter year (e.g. 2026): "))

    if month < 1 or month > 12:
        print("Month must be between 1 and 12.")
        return

    records = get_monthly_attendance(month, year)
    display_records(records)


def selected_date_menu():
    print("\n--- ATTENDANCE FOR A SELECTED DATE ---")

    selected_date = input("Enter date (YYYY-MM-DD): ").strip()

    records = get_attendance_by_date(selected_date)
    display_records(records)


def search_employee_menu():
    print("\n--- SEARCH EMPLOYEE ---")

    code = input("Enter employee code: ").strip()
    record = search_employee_by_code(code)

    if record:
        display_records([record])
    else:
        print("Employee not found.")


def attendance_summary_menu():
    print("\n--- ATTENDANCE SUMMARY ---")

    records = get_attendance_summary()
    display_records(records)


def low_attendance_menu():
    print("\n--- LOW ATTENDANCE REPORT ---")

    value = input(
        "Enter attendance limit (default 75%): "
    ).strip()

    limit = float(value) if value else 75

    records = get_low_attendance(limit)
    display_records(records)


def main():
    while True:
        print("\n" + "=" * 42)
        print(" EMPLOYEE ATTENDANCE ANALYSIS SYSTEM")
        print("=" * 42)

        print("1.  Add employee")
        print("2.  View all employees")
        print("3.  Update employee")
        print("4.  Delete employee")
        print("5.  Mark attendance")
        print("6.  View all attendance")
        print("7.  Update attendance")
        print("8.  Delete attendance")
        print("9.  Monthly attendance analysis")
        print("10. Attendance on a selected date")
        print("11. Search employee by code")
        print("12. Attendance summary")
        print("13. Employees with low attendance")
        print("0.  Exit")

        choice = input("\nEnter your choice: ").strip()

        try:
            if choice == "1":
                add_employee_menu()

            elif choice == "2":
                display_records(get_employees())

            elif choice == "3":
                update_employee_menu()

            elif choice == "4":
                delete_employee_menu()

            elif choice == "5":
                mark_attendance_menu()

            elif choice == "6":
                display_records(get_attendance())

            elif choice == "7":
                update_attendance_menu()

            elif choice == "8":
                delete_attendance_menu()

            elif choice == "9":
                monthly_analysis_menu()

            elif choice == "10":
                selected_date_menu()

            elif choice == "11":
                search_employee_menu()

            elif choice == "12":
                attendance_summary_menu()

            elif choice == "13":
                low_attendance_menu()

            elif choice == "0":
                print("Thank you for using the system!")
                break

            else:
                print("Invalid choice. Please enter 0-13.")

        except ValueError as error:
            print("Invalid input:", error)

        except mysql.connector.Error as error:
            print("Database error:", error)

        except Exception as error:
            print("Unexpected error:", error)


if __name__ == "__main__":
    main()
