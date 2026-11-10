# AttendTrack – Employee Attendance System

## Project structure
```
attendtrack/
├── app.py              Flask backend (serves the page, saves data to SQLite)
├── requirements.txt
├── templates/
│   └── index.html      Page structure (HTML)
└── static/
    ├── style.css       Design (CSS)
    └── script.js       Behaviour, validation, API calls (JavaScript)
```

## Run in VS Code
1. File → Open Folder… → select the `attendtrack` folder.
2. Open the terminal: Terminal → New Terminal.
3. Install Flask:  `pip install flask`
4. Start the server: `python app.py`
5. Open http://127.0.0.1:5000 in your browser.

Data is saved to `attendance.db` (created on first run).

## Design-only preview (no Flask)
Install the **Live Server** extension, right-click `templates/index.html` → **Open with Live Server**.
The page works and saves data in the browser instead of the database.

## Logins
| Screen | ID | Password / PIN |
|---|---|---|
| Admin / HR tab | admin@acme.com | admin123 |
| Admin / HR tab | hr@acme.com | hr12345 |
| Employee check-in | EMP001 | 1001 (EMP002 → 1002 …) |
