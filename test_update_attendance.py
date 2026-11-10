
from database import update_attendance

# Replace 1 with an existing attendance_id from your database
attendance_id = 1

try:
    update_attendance(
        attendance_id,
        "Holiday",
        "09:00:00",
        "17:00:00"
    )
    print("Test failed: Invalid status was accepted.")

except ValueError as error:
    print("Test passed:", error)


try:
    update_attendance(
        attendance_id,
        "Present",
        "17:00:00",
        "09:00:00"
    )
    print("Test failed: Invalid times were accepted.")

except ValueError as error:
    print("Test passed:", error)
