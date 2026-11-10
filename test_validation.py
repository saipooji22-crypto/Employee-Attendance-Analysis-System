
from database import validate_attendance_data


# Test 1: Valid attendance
try:
    validate_attendance_data(
        "2026-10-20",
        "Present",
        "09:00:00",
        "17:00:00"
    )
    print("Test 1 passed: Valid attendance.")
except ValueError as error:
    print("Test 1 failed:", error)


# Test 2: Invalid status
try:
    validate_attendance_data(
        "2026-10-20",
        "Holiday",
        "09:00:00",
        "17:00:00"
    )
    print("Test 2 failed: Invalid status was accepted.")
except ValueError as error:
    print("Test 2 passed:", error)


# Test 3: Invalid date
try:
    validate_attendance_data(
        "invalid-date",
        "Present",
        "09:00:00",
        "17:00:00"
    )
    print("Test 3 failed: Invalid date was accepted.")
except ValueError as error:
    print("Test 3 passed:", error)


# Test 4: Checkout earlier than check-in
try:
    validate_attendance_data(
        "2026-10-20",
        "Present",
        "17:00:00",
        "09:00:00"
    )
    print("Test 4 failed: Invalid times were accepted.")
except ValueError as error:
    print("Test 4 passed:", error)
