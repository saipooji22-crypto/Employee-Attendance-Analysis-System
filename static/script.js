/* =========================================================
   AttendTrack - Employee Attendance System
   script.js : page behaviour, validation and Flask API calls
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     Constants & helpers
     ========================================================= */
  const DEPARTMENTS = ["Engineering", "IT", "Finance", "HR", "Operations", "Sales", "Supply Chain"];  const STATUSES = ["Present", "Late", "Absent", "Leave"];
  const STORE_KEY = "attendtrack-v2";
  const SESSION_KEY = "attendtrack-session";
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
const USERS = [
  { email: "pythonbatch4@gmail.com", pass: "python4", name: "Admin User", role: "Administrator" },
  { email: "hr@acme.com", pass: "hr12345", name: "HR Manager", role: "HR" },
];

  const PAGES = {
    dashboard: ["Dashboard", () => "Live overview for " + fmtLongDate(todayISO())],
    checkin: ["Check-in Kiosk", () => "Employees check in and out here"],
    attendance: ["Attendance Register", () => "Review and correct daily attendance"],
    employees: ["Employees", () => "Manage staff records"],
    reports: ["Reports", () => "Attendance summary by date range"],
    settings: ["Settings", () => "Shift timings, policy and data"],
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => isoOf(new Date());
  const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
  const dow = (iso) => parseISO(iso).getDay();
  const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const toMin = (hm) => { if (!hm) return null; const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
  const fmtDur = (mins) => mins == null ? "—" : `${Math.floor(mins / 60)}h ${pad(Math.round(mins % 60))}m`;
  const fmtLongDate = (iso) => parseISO(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtShortDate = (iso) => parseISO(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const fmt12 = (hm) => {
    if (!hm) return "—";
    let [h, m] = hm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    return `${h}:${pad(m)} ${ap}`;
  };
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  /* =========================================================
     Storage
     ========================================================= */
  const mem = {};
  const store = {
    get(k, sess) { try { return (sess ? sessionStorage : localStorage).getItem(k); } catch (_) { return mem[k] ?? null; } },
    set(k, v, sess) { try { (sess ? sessionStorage : localStorage).setItem(k, v); } catch (_) { mem[k] = v; } },
    del(k, sess) { try { (sess ? sessionStorage : localStorage).removeItem(k); } catch (_) { delete mem[k]; } },
  };

  /* =========================================================
     Sample data (deterministic, relative to today)
     ========================================================= */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sampleData() {
    const t = todayISO();
    const settings = { company: "Acme Corp", shiftStart: "09:00", shiftEnd: "18:00", grace: 15, fullDay: 8, workDays: [1, 2, 3, 4, 5] };
    const list = [
      ["Priya Sharma", "Engineering", "Software Engineer", "2023-03-14", 0.97, 0.06],
      ["James Carter", "Finance", "Financial Analyst", "2022-07-01", 0.95, 0.10],
      ["Aisha Khan", "HR", "HR Generalist", "2024-01-08", 0.96, 0.05],
      ["Daniel Ruiz", "Operations", "Operations Lead", "2021-11-22", 0.88, 0.30],
      ["Mei Lin", "Supply Chain", "Materials Planner", "2023-09-18", 0.98, 0.04],
      ["Rahul Verma", "Sales", "Account Executive", "2024-05-02", 0.90, 0.22],
      ["Sarah Okafor", "Engineering", "QA Engineer", "2022-02-10", 0.95, 0.12],
      ["Tom Becker", "Supply Chain", "Buyer", "2025-06-30", 0.93, 0.15],
      ["Fatima Noor", "Finance", "Accounts Payable Specialist", "2023-12-04", 0.97, 0.08],
      ["Kevin O'Brien", "Operations", "Warehouse Supervisor", "2020-08-17", 0.91, 0.25],
      ["Ananya Reddy", "Engineering", "Data Analyst", addDays(t, -9), 1.0, 0.05],
      ["Marcus Lee", "Sales", "Sales Associate", "2024-02-19", 0.92, 0.18],
    ];
    const employees = list.map(([name, department, designation, join_date], i) => ({
      id: i + 1,
      emp_code: "E" + String(101 + i).padStart(3, "0"),
      name, department, designation, join_date,
      email: name.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/, ".").replace(/\s/g, "") + "@acme.com",
      phone: "+1 404 555 0" + String(101 + i),
      active: true, inactive_since: "",
    }));
    // one former employee
    employees.push({ id: 13, emp_code: "E113", name: "Laura Chen", department: "HR", designation: "Recruiter",
      join_date: "2023-05-15", email: "laura.chen@acme.com", phone: "+1 404 555 0113",
      active: false, inactive_since: addDays(t, -12) });
    employees.forEach((e) => (e.pin = defaultPin(e.emp_code)));
    const prof = {};
    list.forEach((r, i) => (prof[i + 1] = { attend: r[4], late: r[5] }));
    prof[13] = { attend: 0.94, late: 0.1 };

    const r = rng(20261019);
    const attendance = {};
    const now = toMin(nowHM());
    for (let i = 45; i >= 0; i--) {
      const d = addDays(t, -i);
      if (!settings.workDays.includes(dow(d))) continue;
      const day = {};
      employees.forEach((e) => {
        if (e.join_date > d) return;
        if (e.inactive_since && d >= e.inactive_since) return;
        const p = prof[e.id];
        const x = r();
        const lateRoll = r(), inRoll = r(), outRoll = r();
        let rec;
        if (x > p.attend) rec = { status: r() < 0.55 ? "Leave" : "Absent", in: "", out: "", note: "", source: "manual" };
        else {
          const inM = lateRoll < p.late ? 9 * 60 + 16 + Math.floor(inRoll * 70) : 8 * 60 + 30 + Math.floor(inRoll * 44);
          const outM = 17 * 60 + 25 + Math.floor(outRoll * 95);
          rec = { status: inM > 9 * 60 + 15 ? "Late" : "Present", in: fromMin(inM), out: fromMin(outM), note: "", source: "kiosk" };
        }
        if (d === t) { // only what could have happened by now
          if (rec.in && toMin(rec.in) > now) return;
          if (rec.out && toMin(rec.out) > now) rec.out = "";
          if (!rec.in && now < 9 * 60) return;
        }
        day[e.id] = rec;
      });
      attendance[d] = day;
    }
    // a couple of realistic notes
    const firstLate = Object.entries(attendance[addDays(t, -1)] || {}).find(([, v]) => v.status === "Late");
    if (firstLate) firstLate[1].note = "Traffic on I-85";
    return { version: 2, nextId: 14, settings, employees, attendance };
  }

  let db;
  function defaultPin(code) { return "1" + String(code).replace(/\D/g, "").padStart(3, "0").slice(-3); }
  /* ---- Flask backend: data is loaded from and saved to /api/data ----
     If the page is opened without the Flask server, it falls back to browser storage. */
  let serverMode = false;
  async function fetchServer() {
    const res = await fetch("/api/data", { cache: "no-store" });
    if (!res.ok) throw new Error("Server error " + res.status);
    return res.json();
  }
  async function loadData() {
    try {
      let d = await fetchServer();
      serverMode = true;
      if (!(d && d.version === 2)) {           // first run: seed the database with sample data
        d = sampleData();
        await putServer(d);
      }
      d.employees.forEach((e) => { if (!e.pin) e.pin = defaultPin(e.emp_code); });
      return d;
    } catch (_) {
      serverMode = false;                       // no Flask server (e.g. file opened directly)
      return load();
    }
  }
  function putServer(data) {
    return fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => { if (!r.ok) throw new Error("Save failed"); });
  }
  function load() {
    const raw = store.get(STORE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d && d.version === 2) { d.employees.forEach((e) => { if (!e.pin) e.pin = defaultPin(e.emp_code); }); return d; }
      } catch (_) { /* fall through */ }
    }
    const d = sampleData(); store.set(STORE_KEY, JSON.stringify(d)); return d;
  }
  const save = () => {
    if (!serverMode) { store.set(STORE_KEY, JSON.stringify(db)); return; }
    putServer(db).catch(() => flash("Couldn't save to the server. Check that Flask is running.", "error"));
  };

  /* =========================================================
     Domain logic
     ========================================================= */
  const S = () => db.settings;
  const isWorkday = (iso) => S().workDays.includes(dow(iso));
  const deriveStatus = (inHM) => toMin(inHM) > toMin(S().shiftStart) + Number(S().grace) ? "Late" : "Present";
  const lateBy = (inHM) => Math.max(0, toMin(inHM) - toMin(S().shiftStart));
  const fmtLate = (m) => (m >= 60 ? fmtDur(m) : m + " min");
  const workedMin = (rec) => rec && rec.in && rec.out ? Math.max(0, toMin(rec.out) - toMin(rec.in)) : null;
  const empById = (id) => db.employees.find((e) => e.id === +id);
  const rec = (date, id) => (db.attendance[date] || {})[id];
  const employedOn = (e, date) => e.join_date <= date && !(e.inactive_since && date >= e.inactive_since);
  const staffOn = (date) => db.employees.filter((e) => employedOn(e, date)).sort((a, b) => a.emp_code.localeCompare(b.emp_code));
  const shiftOver = () => toMin(nowHM()) >= toMin(S().shiftEnd);

  function setRec(date, id, r) {
    if (!db.attendance[date]) db.attendance[date] = {};
    if (r) db.attendance[date][id] = r; else delete db.attendance[date][id];
  }

  /* =========================================================
     UI helpers
     ========================================================= */
  function flash(msg, type = "success") {
    const el = document.createElement("div");
    el.className = `flash flash-${type}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML = `<span>${esc(msg)}</span><button type="button" class="flash-close" aria-label="Dismiss">×</button>`;
    $(".flash-close", el).onclick = () => el.remove();
    $("#flashes").replaceChildren(el);
    if (type === "success") setTimeout(() => el.remove(), 5000);
  }
  const badge = (s, extra = "") => s
    ? `<span class="badge badge-${s.toLowerCase()}">${s}${extra}</span>`
    : `<span class="badge badge-none">Not marked</span>`;

  function setError(form, name, msg) {
    const input = form.elements[name];
    if (input) input.classList.toggle("invalid", !!msg);
    const box = $(`[data-error-for="${name}"]`, form);
    if (box) box.textContent = msg || "";
    return !msg;
  }
  function baseCheck(input) {
    if (input.type === "checkbox") return "";
    if (!input.checkValidity()) return input.dataset.msg || input.validationMessage;
    return "";
  }
  /** Wires blur/input validation. `rules(name, value)` returns extra error text or "". */
  function wireValidation(form, rules = () => "") {
    const fields = $$("input[name], select[name]", form).filter((f) => f.type !== "file");
    const check = (f) => setError(form, f.name, baseCheck(f) || rules(f.name, f.value.trim()));
    fields.forEach((f) => {
      f.addEventListener("blur", (e) => {
        if (!(e.relatedTarget && e.relatedTarget.tagName === "BUTTON")) check(f);
      });
      f.addEventListener("input", () => f.classList.contains("invalid") && check(f));
    });
    return () => {
      let ok = true;
      fields.forEach((f) => { if (!check(f)) ok = false; });
      if (!ok) $(".invalid", form)?.focus();
      return ok;
    };
  }

  /** Submit handling that also works inside sandboxed previews, which block native form submission. */
  function onSubmit(form, fn) {
    const run = (e) => { e.preventDefault(); fn(e); };
    form.addEventListener("submit", run);
    $$("button[type=submit]", form).forEach((b) => b.addEventListener("click", run));
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT" &&
          !["button", "submit", "checkbox", "radio", "file"].includes(e.target.type)) run(e);
    });
  }

  /** In-page confirmation dialog (native dialogs are blocked in sandboxed previews). */
  function ask(message, okLabel = "Confirm", danger = false) {
    return new Promise((resolve) => {
      const host = document.createElement("div");
      host.innerHTML = `<div class="modal-bg" style="z-index:200"><div class="modal" role="alertdialog" aria-modal="true" style="width:min(420px,100%)">
        <p style="margin:0 0 18px;font-size:15px">${esc(message)}</p>
        <div class="form-actions"><button type="button" class="btn btn-ghost" data-no>Cancel</button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-yes>${esc(okLabel)}</button></div></div></div>`;
      document.body.appendChild(host);
      const done = (v) => { document.removeEventListener("keydown", onKey, true); host.remove(); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); done(false); } };
      document.addEventListener("keydown", onKey, true);
      $("[data-yes]", host).onclick = () => done(true);
      $("[data-no]", host).onclick = () => done(false);
      $(".modal-bg", host).addEventListener("mousedown", (e) => { if (e.target.classList.contains("modal-bg")) done(false); });
      setTimeout(() => $("[data-yes]", host).focus(), 20);
    });
  }

  function openModal(html, wide = false) {
    const host = $("#modalHost");
    host.innerHTML = `<div class="modal-bg"><div class="modal ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
    const bg = $(".modal-bg", host);
    const close = () => { host.innerHTML = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    bg.addEventListener("mousedown", (e) => { if (e.target === bg) close(); });
    $$("[data-close]", host).forEach((b) => (b.onclick = close));
    setTimeout(() => $("input:not([type=hidden]), select, button", $(".modal", host))?.focus(), 30);
    return { root: $(".modal", host), close };
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

  /* =========================================================
     Auth
     ========================================================= */
  let user = null;
  /** Hides the whole admin interface unless an Admin/HR user is signed in. */
  const setLocked = (locked) => document.body.classList.toggle("locked", locked);
  
// ======================================
// WELCOME PAGE AND LOGIN NAVIGATION
// ======================================

function showWelcome() {

    $("#welcomeScreen").hidden = false;
    $("#loginScreen").hidden = true;
    $("#empPortal").hidden = true;

    setLocked(true);

    window.scrollTo(0, 0);
}
function showSignup() {
    $("#welcomeScreen").hidden = true;
    $("#signupScreen").hidden = false;
    $("#loginScreen").hidden = true;
    $("#empPortal").hidden = true;

    setLocked(true);
    window.scrollTo(0, 0);
}

function showLogin(tab = "employee") {

    $("#welcomeScreen").hidden = true;
    $("#loginScreen").hidden = false;
    $("#empPortal").hidden = true;

    setLocked(true);

    setLoginTab(tab);

    window.scrollTo(0, 0);
}


function initWelcome() {
    ["welcomeLoginBtn", "welcomeGetStarted", "welcomeBottomLogin"]
        .forEach((id) => {
            const button = $("#" + id);

            if (button) {
                button.addEventListener("click", () => {
                    showLogin("employee");
                });
            }
        });

    const signupButton = $("#welcomeSignupBtn");

    if (signupButton) {
        signupButton.addEventListener("click", showSignup);
    }
    // Company registration form
const signupForm = $("#companySignupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = $("#signupMessage");
        const button = $("#companySignupSubmit");

        const password = $("#adminPassword").value;
        const confirmPassword = $("#confirmPassword").value;

        message.textContent = "";

        // Check password confirmation
        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            return;
        }

        button.disabled = true;
        button.textContent = "Creating Account...";

        try {
            const response = await fetch("/api/company-signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    company_name: $("#companyName").value.trim(),
                    company_email: $("#companyEmail").value.trim(),
                    company_phone: $("#companyPhone").value.trim(),
                    admin_name: $("#adminName").value.trim(),
                    admin_email: $("#adminEmail").value.trim(),
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Registration failed."
                );
            }

            message.textContent =
                result.message +
                " Your Company Code: " +
                result.company_code +
                ". Please save this code.";

            signupForm.reset();

        } catch (error) {
            message.textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = "Create Company Account";
        }
    });
}
    const backButton = $("#welcomeBackBtn");

    if (backButton) {
        backButton.addEventListener("click", showWelcome);
    }

    const signupBackButton = $("#signupBackBtn");

    if (signupBackButton) {
        signupBackButton.addEventListener("click", showWelcome);
    }
}
  function currentUser() {
    const raw = store.get(SESSION_KEY, true);
    if (!raw) return null;
    try { const u = JSON.parse(raw); return USERS.find((x) => x.email === u.email) || null; } catch (_) { return null; }
  }
  function applyUser() {
    $("#userName").textContent = user.name;
    $("#userRole").textContent = user.role;
    $("#userAvatar").textContent = initials(user.name);
    const isAdmin = user.role === "Administrator" || user.role === "Admin";
    // Admin and HR may monitor attendance, but attendance entry is employee-only.
    $(".nav-link[data-page=settings]").hidden = !isAdmin;
    $(".nav-link[data-page=checkin]").hidden = true;
    $(".nav-link[data-page=attendance]").hidden = false;
  }
  function initLogin() {
    const form = $("#loginForm");
    // Open Forgot Password screen
const forgotLink = $("#forgotPasswordLink");

if (forgotLink) {
    forgotLink.addEventListener("click", () => {
        $("#loginForm").hidden = true;
        $("#forgotPasswordPanel").hidden = false;

        $("#forgotPasswordMessage").textContent = "";

        // Automatically fill the email if already entered
        $("#resetRequestEmail").value =
            $("#loginEmail").value.trim();

        $("#resetRequestEmail").focus();
    });
}

// Return to Admin / HR login
const backToLogin = $("#backToLoginBtn");

if (backToLogin) {
    backToLogin.addEventListener("click", () => {
        $("#forgotPasswordPanel").hidden = true;
        setLoginTab("admin");
    });
}
    const validate = wireValidation(form, (n, v) => (n === "loginEmail" && v && !EMAIL_RE.test(v) ? "Enter a valid email address." : ""));
    let attempts = 0;
    onSubmit(form, (e) => {
      $("#loginError").textContent = "";
      if (!validate()) return;
      const email = form.loginEmail.value.trim().toLowerCase();
      const u = USERS.find((x) => x.email === email && x.pass === form.loginPass.value);
      if (!u) {
        attempts++;
        $("#loginError").textContent = attempts >= 3
          ? "Incorrect email or password. Check the demo accounts below."
          : "Incorrect email or password.";
        form.loginPass.value = ""; form.loginPass.focus();
        return;
      }
      store.set(SESSION_KEY, JSON.stringify({ email: u.email, at: Date.now() }), true);
      if (document.activeElement) document.activeElement.blur();
      user = u; form.reset(); attempts = 0;
      $$(".invalid", form).forEach((i) => i.classList.remove("invalid"));
      $$(".field-error", form).forEach((x) => (x.textContent = ""));
      $("#loginScreen").hidden = true;
      setLocked(false);
      applyUser(); renderAll(); showPage();
      flash(`Welcome back, ${u.name.split(" ")[0]}.`);
    });
  }
  async function logout() {
    if (regDirty() && !(await ask("You have unsaved attendance changes. Sign out anyway?", "Sign out"))) return;
    store.del(SESSION_KEY, true);
    user = null;
    setLocked(true);
    regChanges.clear();
    $("#flashes").replaceChildren();
showWelcome();
  }

  /* =========================================================
     Employee self check-in (separate login, check-in only)
     ========================================================= */
  const EMP_SESSION_KEY = "attendtrack-emp-session";
  const pinFails = {}; // emp_code -> {n, until}
  let portalEmp = null, portalTimer = null, portalDeadline = 0;

  function setLoginTab(tab) {
    $("#forgotPasswordPanel").hidden = true;
    $$("[data-login-tab]").forEach((b) => {
      const on = b.dataset.loginTab === tab;
      b.classList.toggle("active", on); b.setAttribute("aria-selected", on);
    });
    $("#loginForm").hidden = tab !== "admin";
    $("#empLoginForm").hidden = tab !== "employee";
    setTimeout(() => (tab === "admin" ? $("#loginEmail") : $("#empLoginId")).focus(), 30);
  }

  function initEmployeeLogin() {
    $$("[data-login-tab]").forEach((b) => (b.onclick = () => setLoginTab(b.dataset.loginTab)));
    const form = $("#empLoginForm");
    const validate = wireValidation(form);
    onSubmit(form, () => {
      $("#empLoginError").textContent = "";
      if (!validate()) return;
      const code = form.empLoginId.value.trim().toUpperCase();
      const lock = pinFails[code];
      if (lock && lock.until > Date.now()) {
        $("#empLoginError").textContent = `Too many wrong attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.`;
        return;
      }
      const e = db.employees.find((x) => x.emp_code === code);
      if (!e || e.pin !== form.empLoginPin.value) {
        const prev = pinFails[code];
        const f = (pinFails[code] = prev && !(prev.until && prev.until <= Date.now()) ? prev : { n: 0, until: 0 });
        f.n++;
        if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; $("#empLoginError").textContent = "Too many wrong attempts. Locked for 60 seconds."; }
        else $("#empLoginError").textContent = `Incorrect Employee ID or PIN. ${5 - f.n} attempt${5 - f.n === 1 ? "" : "s"} left.`;
        form.empLoginPin.value = ""; form.empLoginPin.focus();
        return;
      }
      if (!e.active) { $("#empLoginError").textContent = "Your account is inactive. Please contact HR."; return; }
      if (e.join_date > todayISO()) { $("#empLoginError").textContent = `Your start date is ${fmtShortDate(e.join_date)}. Check-in opens then.`; return; }
      delete pinFails[code];
      if (document.activeElement) document.activeElement.blur();
      form.reset();
      $$(".invalid", form).forEach((i) => i.classList.remove("invalid"));
      openPortal(e);
    });
    $("#portalIn").onclick = async () => {
      const res = await performCheckIn(portalEmp, "self");
      if (!res) return;
      portalResult(res, res.late ? "late" : "ok");
    };
    $("#portalOut").onclick = () => portalResult(performCheckOut(portalEmp), "ok");
    $("#portalSignOut").onclick = closePortal;
    $("#portalStay").onclick = () => armPortalTimer(60);
    ["mousemove", "keydown", "touchstart"].forEach((ev) =>
      $("#empPortal").addEventListener(ev, () => { if (portalEmp && !$("#portalResult").classList.contains("show")) armPortalTimer(60); }, { passive: true }));
  }

  function openPortal(e) {
    portalEmp = e;
    store.set(EMP_SESSION_KEY, e.emp_code, true);
    $("#welcomeScreen").hidden = true;
    $("#loginScreen").hidden = true;
    $("#empPortal").hidden = false;
    $("#portalResult").classList.remove("show");
    renderPortal();
    armPortalTimer(60);
  }
  function closePortal() {
    portalEmp = null;
    clearInterval(portalTimer);
    store.del(EMP_SESSION_KEY, true);
    $("#empPortal").hidden = true;
    $("#loginScreen").hidden = false;
    setLoginTab("employee");
  }
  function armPortalTimer(sec) {
    portalDeadline = Date.now() + sec * 1000;
    clearInterval(portalTimer);
    const upd = () => {
      const left = Math.max(0, Math.ceil((portalDeadline - Date.now()) / 1000));
      $("#portalCountdown").textContent = `Signing out automatically in ${left}s`;
      if (left <= 0) closePortal();
    };
    upd(); portalTimer = setInterval(upd, 500);
  }
  function portalResult(res, kind) {
    const box = $("#portalResult");
    box.className = "portal-result show " + (res.ok ? (kind === "late" ? "late" : "ok") : "err");
    box.innerHTML = `<strong>${res.ok ? (kind === "late" ? "Checked in — late" : "Done") : "Not recorded"}</strong><span>${esc(res.msg)}</span>`;
    renderPortal();
    renderAll();
    if (res.ok) armPortalTimer(8);
  }
  function renderPortal() {
    const e = portalEmp; if (!e) return;
    const t = todayISO(), r = rec(t, e.id);
    $("#portalAvatar").textContent = initials(e.name);
    $("#portalName").textContent = e.name;
    $("#portalMeta").textContent = `${e.emp_code} · ${e.designation} · ${e.department}`;
    $("#portalShift").textContent = isWorkday(t)
      ? `Today's shift: ${fmt12(S().shiftStart)} – ${fmt12(S().shiftEnd)} (grace ${S().grace} min)`
      : "Today is not a scheduled working day.";
    let status;
    if (!r) status = `<span class="badge badge-none">Not checked in</span>`;
    else if (r.status === "Leave") status = `${badge("Leave")} <span class="muted">You're on approved leave today.</span>`;
    else if (r.status === "Absent" && !r.in) status = `${badge("Absent")} <span class="muted">Marked absent — checking in will update it.</span>`;
    else if (!r.out) status = `${badge(r.status)} <span>In since <strong>${fmt12(r.in)}</strong> · ${fmtDur(toMin(nowHM()) - toMin(r.in))} so far</span>`;
    else status = `${badge(r.status)} <span>${fmt12(r.in)} – ${fmt12(r.out)} · worked <strong>${fmtDur(workedMin(r))}</strong></span>`;
    $("#portalStatus").innerHTML = status;
    $("#portalIn").disabled = !!(r && (r.in || r.status === "Leave"));
    $("#portalOut").disabled = !(r && r.in && !r.out);
    // last 7 working days
    const days = [];
    for (let d = t; days.length < 7 && d > addDays(t, -30); d = addDays(d, -1)) if (isWorkday(d) && employedOn(e, d)) days.push(d);
    $("#portalHistory").innerHTML = days.length ? `<table class="table"><thead><tr><th>Date</th><th>In</th><th>Out</th><th>Worked</th><th>Status</th></tr></thead><tbody>
      ${days.map((d) => {
        const x = rec(d, e.id);
        const st = x ? badge(x.status) : d === t ? badge("") : badge("Absent");
        return `<tr><td class="nowrap">${d === t ? "Today" : DAY_NAMES[dow(d)] + ", " + fmtShortDate(d)}</td>
          <td>${x && x.in ? fmt12(x.in) : "—"}</td><td>${x && x.out ? fmt12(x.out) : "—"}</td>
          <td class="hours">${fmtDur(workedMin(x))}</td><td>${st}</td></tr>`;
      }).join("")}</tbody></table>` : `<p class="empty">No history yet.</p>`;
  }

  /* =========================================================
     Clock
     ========================================================= */
  let lastDate = todayISO(), lastMinute = nowHM();
  function tick() {
    const d = new Date();
    const t = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    $("#clockTime").textContent = t; $("#kioskTime").textContent = t;
    $("#clockDate").textContent = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    $("#kioskDate").textContent = fmtLongDate(todayISO());
    $("#portalTime").textContent = t; $("#portalDate").textContent = fmtLongDate(todayISO());
    if (todayISO() !== lastDate) { lastDate = todayISO(); renderAll(); }
    else if (nowHM() !== lastMinute) {
      lastMinute = nowHM();
      if (currentPage() === "dashboard") renderDashboard();
      if (portalEmp) renderPortal();
    }
  }
  function renderShiftPill() {
    $("#shiftPill").textContent = isWorkday(todayISO())
      ? `Shift ${fmt12(S().shiftStart)} – ${fmt12(S().shiftEnd)}`
      : "Non-working day";
    $("#companyFoot").textContent = S().company + " · Attendance System";
  }

  /* =========================================================
     Dashboard
     ========================================================= */
  function dayCounts(date) {
    const staff = staffOn(date).filter((e) => e.active || e.inactive_since > date);
    const c = { staff: staff.length, Present: 0, Late: 0, Absent: 0, Leave: 0, none: 0, inOffice: 0 };
    staff.forEach((e) => {
      const r = rec(date, e.id);
      if (!r) c.none++; else c[r.status]++;
      if (r && r.in && !r.out) c.inOffice++;
    });
    return c;
  }

  function renderDashboard() {
    const t = todayISO();
    const c = dayCounts(t);
    const work = isWorkday(t);
    const notice = $("#dashNotice");
    notice.hidden = work;
    notice.textContent = work ? "" : "Today is not a scheduled working day. Any check-ins are recorded as extra days.";
    const rate = c.staff ? Math.round(((c.Present + c.Late) / c.staff) * 100) : 0;
    const tile = (cls, label, val, sub = "") =>
      `<div class="stat ${cls}"><span class="stat-label">${label}</span><span class="stat-value">${val}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
    $("#dashStats").innerHTML =
      tile("", "Active employees", c.staff, `${db.employees.filter((e) => !e.active).length} inactive`) +
      tile("stat-present", "Checked in", c.Present + c.Late, `${rate}% attendance · ${c.inOffice} in office now`) +
      tile("stat-late", "Late arrivals", c.Late, `after ${fmt12(fromMin(toMin(S().shiftStart) + Number(S().grace)))}`) +
      tile("stat-absent", "Absent", c.Absent) +
      tile("stat-leave", "On leave", c.Leave) +
      tile("", "Not checked in", c.none, work && shiftOver() ? "shift has ended" : "");

    // 7 working days trend
    const days = [];
    for (let d = t; days.length < 7 && d > addDays(t, -40); d = addDays(d, -1)) if (isWorkday(d)) days.unshift(d);
    $("#trend").innerHTML = days.map((d) => {
      const k = dayCounts(d), max = k.staff || 1;
      const ontime = (k.Present / max) * 100, late = (k.Late / max) * 100;
      const pct = k.staff ? Math.round(((k.Present + k.Late) / k.staff) * 100) : 0;
      return `<div class="trend-col" title="${fmtShortDate(d)}: ${k.Present} on time, ${k.Late} late, ${k.Absent} absent, ${k.Leave} leave">
        <span class="trend-val">${pct}%</span>
        <div class="trend-stack"><div class="trend-seg-present" style="height:${ontime}%"></div><div class="trend-seg-late" style="height:${late}%"></div></div>
        <span class="trend-label">${d === t ? "Today" : DAY_NAMES[dow(d)] + " " + parseISO(d).getDate()}</span></div>`;
    }).join("");

    const staff = staffOn(t).filter((e) => e.active);
    const late = staff.filter((e) => rec(t, e.id)?.status === "Late")
      .sort((a, b) => toMin(rec(t, a.id).in) - toMin(rec(t, b.id).in));
    $("#lateList").innerHTML = late.length ? late.map((e) => {
      const r = rec(t, e.id);
      return `<li><span class="avatar">${esc(initials(e.name))}</span><div class="grow"><strong>${esc(e.name)}</strong><br>
        <span class="muted small">${esc(e.department)}</span></div>
        <div class="right"><strong>${fmt12(r.in)}</strong><br><span class="small warn">+${fmtLate(lateBy(r.in))}</span></div></li>`;
    }).join("") : `<p class="empty">No late arrivals today.</p>`;

    const missing = staff.filter((e) => !rec(t, e.id));
    $("#missingList").innerHTML = missing.length ? missing.slice(0, 6).map((e) =>
      `<li><span class="avatar">${esc(initials(e.name))}</span><div class="grow"><strong>${esc(e.name)}</strong><br>
       <span class="muted small">${esc(e.emp_code)} · ${esc(e.department)}</span></div>${badge("")}</li>`).join("") +
      (missing.length > 6 ? `<li class="muted small">+${missing.length - 6} more</li>` : "")
      : `<p class="empty">Everyone is accounted for.</p>`;

    const depts = [...new Set(staff.map((e) => e.department))].sort();
    $("#deptList").innerHTML = depts.length ? depts.map((d) => {
      const s = staff.filter((e) => e.department === d);
      const p = s.filter((e) => ["Present", "Late"].includes(rec(t, e.id)?.status)).length;
      return `<li><div class="dept-row"><span>${esc(d)}</span><span class="muted">${p}/${s.length} in</span></div>
        <div class="bar bar-thin"><div class="bar-fill" style="width:${Math.round((p / s.length) * 100)}%"></div></div></li>`;
    }).join("") : `<p class="empty">No employees yet.</p>`;

    const events = [];
    Object.entries(db.attendance[t] || {}).forEach(([id, r]) => {
      const e = empById(id); if (!e) return;
      if (r.in) events.push({ time: r.in, e, kind: "in", r });
      if (r.out) events.push({ time: r.out, e, kind: "out", r });
    });
    events.sort((a, b) => toMin(b.time) - toMin(a.time));
    $("#activity").innerHTML = events.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Time</th><th>Employee</th><th>Event</th><th>Status</th></tr></thead><tbody>
      ${events.slice(0, 10).map((v) => `<tr><td class="nowrap"><strong>${fmt12(v.time)}</strong></td>
        <td><strong>${esc(v.e.name)}</strong><br><span class="muted small">${esc(v.e.department)}</span></td>
        <td>${v.kind === "in" ? `<span class="badge badge-in">Checked in</span>` : `<span class="badge badge-out">Checked out · ${fmtDur(workedMin(v.r))}</span>`}</td>
        <td>${badge(v.r.status)}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">No check-ins yet today.</p>`;
  }

  /* =========================================================
     Kiosk
     ========================================================= */
  let kioskEmp = null;
  function kioskLookup() {
    const form = $("#kioskForm");
    const code = form.kioskId.value.trim().toUpperCase();
    const card = $("#kioskCard");
    kioskEmp = null;
    $("#btnIn").disabled = true; $("#btnOut").disabled = true;
    card.classList.remove("show");
    setError(form, "kioskId", "");
    if (!code) return;
    const e = db.employees.find((x) => x.emp_code === code);
    if (!e) { if (code.length >= 6) setError(form, "kioskId", "No employee found with this ID."); return; }
    if (!e.active) { setError(form, "kioskId", `${e.name} is inactive and can't check in.`); return; }
    if (e.join_date > todayISO()) { setError(form, "kioskId", `${e.name} starts on ${fmtShortDate(e.join_date)}.`); return; }
    kioskEmp = e;
    const r = rec(todayISO(), e.id);
    let line;
    if (!r || r.status === "Absent") line = r ? "Marked absent — checking in will update the record" : "Not checked in yet";
    else if (r.status === "Leave") line = "On approved leave today";
    else if (!r.out) line = `Checked in at ${fmt12(r.in)} · ${r.status}`;
    else line = `Checked out at ${fmt12(r.out)} · worked ${fmtDur(workedMin(r))}`;
    card.innerHTML = `<span class="avatar">${esc(initials(e.name))}</span><div><strong>${esc(e.name)}</strong><br>
      <span class="muted small">${esc(e.designation)} · ${esc(e.department)}</span><br><span class="small">${esc(line)}</span></div>`;
    card.classList.add("show");
    $("#btnIn").disabled = !!(r && r.status !== "Absent");
    $("#btnOut").disabled = !(r && r.in && !r.out);
  }

  /** Records a check-in for `e` at the current time. Returns {ok, msg, late} or null if cancelled. */
  async function performCheckIn(e, source) {
    const t = todayISO(), now = nowHM();
    const r = rec(t, e.id);
    if (r && r.status === "Leave") return { ok: false, msg: `${e.name} is on approved leave today.` };
    if (r && r.in) return { ok: false, msg: `Already checked in at ${fmt12(r.in)}.` };
    if (isWorkday(t) && shiftOver() &&
        !(await ask(`The shift ended at ${fmt12(S().shiftEnd)}. Record a check-in anyway?`, "Check in"))) return null;
    const status = deriveStatus(now);
    setRec(t, e.id, { status, in: now, out: "", note: isWorkday(t) ? "" : "Non-working day", source });
    save();
    return status === "Late"
      ? { ok: true, late: true, msg: `${e.name} checked in at ${fmt12(now)} — late by ${fmtLate(lateBy(now))}.` }
      : { ok: true, msg: `Good ${new Date().getHours() < 12 ? "morning" : "day"}, ${e.name.split(" ")[0]}! Checked in at ${fmt12(now)}.` };
  }
  /** Records a check-out for `e`. Returns {ok, msg}. */
  function performCheckOut(e) {
    const t = todayISO(), now = nowHM();
    const r = rec(t, e.id);
    if (!r || !r.in) return { ok: false, msg: "You haven't checked in today." };
    if (r.out) return { ok: false, msg: `Already checked out at ${fmt12(r.out)}.` };
    const worked = toMin(now) - toMin(r.in);
    if (worked < 0) return { ok: false, msg: "Check-out can't be before check-in." };
    if (worked < 1) return { ok: false, msg: "You checked in less than a minute ago. Try again shortly." };
    r.out = now; save();
    const short = worked < S().fullDay * 60;
    return { ok: true, msg: `${e.name} checked out at ${fmt12(now)} · worked ${fmtDur(worked)}${short ? " (short day)" : ""}.` };
  }
  async function kioskCheckIn() {
    if (!kioskEmp) return;
    const res = await performCheckIn(kioskEmp, "kiosk");
    if (!res) return;
    if (!res.ok) { setError($("#kioskForm"), "kioskId", res.msg); return; }
    flash(res.msg, res.late ? "error" : "success");
    kioskReset();
  }
  function kioskCheckOut() {
    if (!kioskEmp) return;
    const res = performCheckOut(kioskEmp);
    if (!res.ok) { setError($("#kioskForm"), "kioskId", res.msg); return; }
    flash(res.msg);
    kioskReset();
  }
  function kioskReset() {
    $("#kioskForm").kioskId.value = "";
    kioskLookup(); renderAll();
    $("#kioskForm").kioskId.focus();
  }

  function renderKiosk() {
    $("#empIds").innerHTML = db.employees.filter((e) => e.active)
      .map((e) => `<option value="${esc(e.emp_code)}">${esc(e.name)}</option>`).join("");
    const t = todayISO();
    const rows = Object.entries(db.attendance[t] || {}).map(([id, r]) => ({ e: empById(id), r }))
      .filter((x) => x.e && x.r.in).sort((a, b) => toMin(b.r.out || b.r.in) - toMin(a.r.out || a.r.in));
    $("#logCount").textContent = rows.length;
    $("#kioskLog").innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Employee</th><th>In</th><th>Out</th><th>Worked</th><th>Status</th></tr></thead><tbody>
      ${rows.map(({ e, r }) => `<tr><td><strong>${esc(e.name)}</strong><br><span class="muted small">${esc(e.emp_code)}</span></td>
        <td class="nowrap">${fmt12(r.in)}</td><td class="nowrap">${r.out ? fmt12(r.out) : `<span class="badge badge-in">In office</span>`}</td>
        <td class="hours">${fmtDur(workedMin(r))}</td><td>${badge(r.status)}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty">Nobody has checked in yet today.</p>`;
  }
  function initKiosk() {
    const f = $("#kioskForm");
    f.kioskId.addEventListener("input", kioskLookup);
    onSubmit(f, (e) => {
      if (!kioskEmp) { setError(f, "kioskId", f.kioskId.value.trim() ? "No employee found with this ID." : "Enter an Employee ID."); return; }
      if (!$("#btnIn").disabled) kioskCheckIn(); else if (!$("#btnOut").disabled) kioskCheckOut();
    });
    $("#btnIn").onclick = kioskCheckIn;
    $("#btnOut").onclick = kioskCheckOut;
  }

  /* =========================================================
     Attendance register
     ========================================================= */
  const regChanges = new Map(); // empId -> {status,in,out,note}
  const regDirty = () => regChanges.size > 0;

  function regRowState(row) {
    return {
      status: $("[data-f=status]", row).value,
      in: $("[data-f=in]", row).value,
      out: $("[data-f=out]", row).value,
      note: $("[data-f=note]", row).value.trim(),
    };
  }
  function regSyncRow(row, changedField) {
    const st = $("[data-f=status]", row), tin = $("[data-f=in]", row), tout = $("[data-f=out]", row);
    if (changedField === "in" && tin.value && (st.value === "" || st.value === "Present" || st.value === "Late" || st.value === "Absent")) {
      st.value = deriveStatus(tin.value);
    }
    const off = st.value === "Absent" || st.value === "Leave";
    tin.disabled = tout.disabled = off;
    if (off) { tin.value = ""; tout.value = ""; }
    const s = regRowState(row);
    $("[data-hours]", row).innerHTML = s.in && s.out && toMin(s.out) > toMin(s.in)
      ? `<span class="${toMin(s.out) - toMin(s.in) < S().fullDay * 60 ? "warn" : ""}">${fmtDur(toMin(s.out) - toMin(s.in))}</span>` : "—";
    // dirty tracking
    const orig = rec($("#regDate").value, row.dataset.id) || { status: "", in: "", out: "", note: "" };
    const changed = s.status !== (orig.status || "") || s.in !== (orig.in || "") || s.out !== (orig.out || "") || s.note !== (orig.note || "");
    if (changed) regChanges.set(row.dataset.id, s); else regChanges.delete(row.dataset.id);
    row.style.background = changed ? "#fffbea" : "";
    $("#regDirty").textContent = regChanges.size ? `${regChanges.size} unsaved change${regChanges.size > 1 ? "s" : ""}` : "";
  }

  function renderRegister() {
    const date = $("#regDate").value || todayISO();
    const t = todayISO();
    regChanges.clear(); $("#regDirty").textContent = ""; $("#regError").textContent = "";
    $("#regTitle").textContent = fmtLongDate(date);
    $("#regNext").disabled = date >= t;
    const notice = $("#regNotice");
    notice.hidden = isWorkday(date);
    notice.textContent = "This is not a scheduled working day. Unmarked employees are not counted as absent.";

    const staff = staffOn(date);
    const readOnlyAttendance = !!user;
    const c = { Present: 0, Late: 0, Absent: 0, Leave: 0, none: 0 };
    staff.forEach((e) => { const r = rec(date, e.id); r ? c[r.status]++ : c.none++; });
    $("#regSummary").innerHTML = STATUSES.map((s) => badge(s, `: ${c[s]}`)).join("") + `<span class="badge badge-none">Not marked: ${c.none}</span>`;

    // HR and Admin have read-only access. Only employee kiosk actions can create attendance.
    $("#regTools").hidden = !staff.length;
    $("#markRestAbsent").hidden = true;
    $("#regSave").hidden = true;
    $("#regError").textContent = "Attendance is read-only. Employees must use the kiosk to check in and out.";
    $("#regTable").innerHTML = staff.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Employee</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Worked</th><th>Note</th><th>Source</th></tr></thead><tbody>
      ${staff.map((e) => {
        const r = rec(date, e.id) || {};
        return `<tr data-reg-row data-id="${e.id}" data-search="${esc((e.name + " " + e.emp_code + " " + e.department).toLowerCase())}">
          <td><strong>${esc(e.name)}</strong><br><span class="muted small">${esc(e.emp_code)} · ${esc(e.department)}</span></td>
          <td>${r.status ? badge(r.status) : badge("")}</td>
          <td>${r.in ? fmt12(r.in) : "—"}</td>
          <td>${r.out ? fmt12(r.out) : "—"}</td>
          <td class="hours">${r.in && r.out ? fmtDur(toMin(r.out) - toMin(r.in)) : "—"}</td>
          <td>${esc(r.note || "—")}</td>
          <td>${r.source ? `<span class="tag">${r.source === "kiosk" ? "Kiosk" : r.source === "self" ? "Self check-in" : "Manual"}</span>` : ""}</td>
        </tr>`;
      }).join("")}</tbody></table></div>`
      : `<p class="empty">No employees were employed on this date.</p>`;
    // Rows are plain-text and read-only for Admin/HR.
    regChanges.clear(); $("#regDirty").textContent = "";
    $$("[data-reg-row]").forEach((row) => (row.style.background = ""));
    regApplySearch();
  }
  function regApplySearch() {
    const q = $("#regSearch").value.trim().toLowerCase();
    $$("[data-reg-row]").forEach((row) => (row.hidden = !!q && !row.dataset.search.includes(q)));
  }

  async function regGoto(date) {
    if (date > todayISO()) { flash("You can't mark attendance for a future date.", "error"); date = todayISO(); }
    if (regDirty() && !(await ask("Discard unsaved attendance changes?", "Discard", true))) { $("#regDate").value = regShownDate; return; }
    $("#regDate").value = date; regShownDate = date; renderRegister();
  }
  let regShownDate = todayISO();

  function initRegister() {
    const di = $("#regDate");
    di.value = todayISO(); di.max = todayISO();
    di.addEventListener("change", () => di.value && regGoto(di.value));
    $("#regPrev").onclick = () => regGoto(addDays(di.value, -1));
    $("#regNext").onclick = () => regGoto(addDays(di.value, 1));
    $("#regToday").onclick = () => regGoto(todayISO());
    $("#regSearch").addEventListener("input", regApplySearch);
    $("#regTable").addEventListener("input", (e) => {
      const row = e.target.closest("[data-reg-row]");
      if (row) regSyncRow(row, e.target.dataset.f);
    });
    $("#regTable").addEventListener("change", (e) => {
      const row = e.target.closest("[data-reg-row]");
      if (row) regSyncRow(row, e.target.dataset.f);
    });
    $("#markRestAbsent").onclick = async () => {
      const date = di.value;
      if (date === todayISO() && isWorkday(date) && !shiftOver() &&
          !(await ask("The shift hasn't ended yet. Mark everyone not checked in as absent?", "Mark absent"))) return;
      let n = 0;
      $$("[data-reg-row]").forEach((row) => {
        const st = $("[data-f=status]", row);
        if (!st.value && !row.hidden) { st.value = "Absent"; regSyncRow(row, "status"); n++; }
      });
      flash(n ? `${n} employee(s) set to Absent — click Save changes to confirm.` : "Everyone already has a status.", n ? "success" : "error");
    };
    onSubmit($("#regForm"), (e) => {
      const date = di.value, isToday = date === todayISO(), now = toMin(nowHM());
      let ok = true;
      $$("[data-reg-row]").forEach((row) => {
        const s = regRowState(row), err = $("[data-row-error]", row);
        if (!regChanges.has(row.dataset.id)) { err.textContent = ""; return; }
        let msg = "";
        $$("[data-f=in],[data-f=out]", row).forEach((i) => i.classList.remove("invalid"));
        const bad = (f, m) => { $(`[data-f=${f}]`, row).classList.add("invalid"); msg = msg || m; };
        if ((s.status === "Present" || s.status === "Late") && !s.in) bad("in", "Check-in time is required.");
        if (s.out && !s.in) bad("out", "Add a check-in time first.");
        if (s.in && s.out && toMin(s.out) <= toMin(s.in)) bad("out", "Check-out must be after check-in.");
        if (isToday && s.in && toMin(s.in) > now) bad("in", "Check-in can't be in the future.");
        if (isToday && s.out && toMin(s.out) > now) bad("out", "Check-out can't be in the future.");
        if (!s.status && (s.in || s.note)) bad("in", "Choose a status.");
        err.textContent = msg;
        if (msg) { ok = false; row.hidden = false; }
      });
      if (!ok) { $("#regError").textContent = "Fix the highlighted rows before saving."; $(".invalid", $("#regTable"))?.focus(); return; }
      $("#regError").textContent = "";
      if (!regChanges.size) { flash("No changes to save.", "error"); return; }
      regChanges.forEach((s, id) => {
        const prev = rec(date, id);
        setRec(date, id, s.status ? { ...s, source: prev && prev.source === "kiosk" && prev.in === s.in && prev.out === s.out ? "kiosk" : "manual" } : null);
      });
      const n = regChanges.size;
      save(); regChanges.clear();
      flash(`Saved ${n} change${n > 1 ? "s" : ""} for ${fmtShortDate(date)}.`);
      renderAll();
    });
  }

  /* =========================================================
     Employees
     ========================================================= */
  function renderEmployees() {
    const q = $("#empSearch").value.trim().toLowerCase();
    const dept = $("#empDeptFilter").value, st = $("#empStatusFilter").value;
    const rows = db.employees
      .filter((e) => !q || [e.name, e.emp_code, e.email, e.designation].some((v) => v.toLowerCase().includes(q)))
      .filter((e) => !dept || e.department === dept)
      .filter((e) => !st || (st === "active") === e.active)
      .sort((a, b) => a.emp_code.localeCompare(b.emp_code));
    $("#empCount").textContent = rows.length;
    const hasRecords = (id) => Object.values(db.attendance).some((d) => d[id]);
    $("#empTable").innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Phone</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map((e) => `<tr>
        <td class="mono">${esc(e.emp_code)}</td>
        <td class="clickable" data-history="${e.id}"><strong>${esc(e.name)}</strong><br><span class="muted small">${esc(e.email)}</span></td>
        <td><span class="tag">${esc(e.department)}</span></td>
        <td>${esc(e.designation)}</td>
        <td class="nowrap">${esc(e.phone || "—")}</td>
        <td class="nowrap">${esc(e.join_date)}</td>
        <td>${e.active ? `<span class="badge badge-active">Active</span>` : `<span class="badge badge-inactive" title="Since ${esc(e.inactive_since)}">Inactive</span>`}</td>
        <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" type="button" data-edit="${e.id}">Edit </button>
          <button class="btn btn-ghost btn-sm" type="button" data-toggle="${e.id}">
          ${e.active ? "Deactivate" : "Reactivate"} </button>
        </div>
        </td>
        </tr>`).join("")}</tbody></table></div>`
        : `<p class="empty">No employees match these filters.</p>`;
  }

  function nextCode() {
    const numbers = db.employees
        .map((e) => String(e.emp_code || "").toUpperCase())
        .filter((code) => /^E\d+$/.test(code))
        .map((code) => Number(code.substring(1)));

    const n = Math.max(100, ...numbers) + 1;

    return "E" + String(n).padStart(3, "0");
}

  function employeeModal(emp) {
    const isNew = !emp;
    const e = emp || { emp_code: nextCode(), name: "", email: "", phone: "", department: "", designation: "", join_date: todayISO(), pin: "" };
    const { root, close } = openModal(`
      <div class="modal-head"><h2>${isNew ? "Add employee" : "Edit " + esc(e.name)}</h2><button class="x-btn" data-close aria-label="Close">×</button></div>
      <form class="form" id="empForm" novalidate>
        <div class="form-split">
          <div class="form-row"><label for="f_code">Employee ID *</label>
            <input id="f_code" name="emp_code" value="${esc(e.emp_code)}" required required pattern="(?:[Ee][Mm][Pp]|[Ee])[0-9]{3,}" data-msg="Use the format EMP001 or E101.">
            <small class="field-error" data-error-for="emp_code"></small></div>
          <div class="form-row"><label for="f_join">Join date *</label>
            <input id="f_join" name="join_date" type="date" value="${esc(e.join_date)}" required data-msg="Join date is required.">
            <small class="field-error" data-error-for="join_date"></small></div>
        </div>
        <div class="form-row"><label for="f_name">Full name *</label>
          <input id="f_name" name="name" value="${esc(e.name)}" required minlength="2" maxlength="60" pattern=".*[A-Za-z].*" data-msg="Enter the employee's full name.">
          <small class="field-error" data-error-for="name"></small></div>
        <div class="form-split">
          <div class="form-row"><label for="f_email">Work email *</label>
            <input id="f_email" name="email" type="email" value="${esc(e.email)}" required data-msg="Enter a valid email address.">
            <small class="field-error" data-error-for="email"></small></div>
          <div class="form-row"><label for="f_phone">Phone</label>
            <input id="f_phone" name="phone" type="tel" value="${esc(e.phone)}" data-msg="Enter a valid phone number.">
            <small class="field-error" data-error-for="phone"></small></div>
        </div>
        <div class="form-split">
          <div class="form-row"><label for="f_dept">Department *</label>
            <select id="f_dept" name="department" required data-msg="Choose a department.">
              <option value="">Select…</option>${DEPARTMENTS.map((d) => `<option ${e.department === d ? "selected" : ""}>${d}</option>`).join("")}
            </select><small class="field-error" data-error-for="department"></small></div>
          <div class="form-row"><label for="f_desig">Designation *</label>
            <input id="f_desig" name="designation" value="${esc(e.designation)}" required maxlength="60" data-msg="Designation is required.">
            <small class="field-error" data-error-for="designation"></small></div>
        </div>
        <div class="form-row"><label for="f_pin">Check-in PIN * <span class="muted small">(4–6 digits, used on the employee check-in login)</span></label>
          <input id="f_pin" name="pin" type="password" inputmode="numeric" autocomplete="new-password" value="${esc(e.pin || "")}"
                 required pattern="[0-9]{4,6}" maxlength="6" data-msg="PIN must be 4–6 digits." style="max-width:200px">
          <small class="field-error" data-error-for="pin"></small></div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${isNew ? "Add employee" : "Save changes"}</button>
        </div>
      </form>`);
    $$("[data-close]", root).forEach((b) => (b.onclick = close));
    const form = $("#empForm", root);
    const firstRecord = emp ? Object.keys(db.attendance).filter((d) => db.attendance[d][emp.id]).sort()[0] : null;
    const validate = wireValidation(form, (n, v) => {
      const others = db.employees.filter((x) => !emp || x.id !== emp.id);
      if (n === "emp_code" && others.some((x) => x.emp_code === v.toUpperCase())) return "This Employee ID is already used.";
      if (n === "email" && others.some((x) => x.email.toLowerCase() === v.toLowerCase())) return "This email is already used.";
      if (n === "join_date" && v > addDays(todayISO(), 90)) return "Join date can be at most 90 days ahead.";
      if (n === "join_date" && firstRecord && v > firstRecord) return `Has attendance from ${firstRecord}; join date must be on or before it.`;
      if (n === "phone" && v && (!/^\+?[0-9\s\-()]+$/.test(v) || v.replace(/\D/g, "").length < 10 || v.replace(/\D/g, "").length > 15)) return "Enter a valid phone number (10–15 digits).";
      return "";
    });
    onSubmit(form, (ev) => {
      if (!validate()) return;
      const data = Object.fromEntries(["emp_code", "name", "email", "phone", "department", "designation", "join_date", "pin"]
        .map((k) => [k, form.elements[k].value.trim()]));
      data.emp_code = data.emp_code.toUpperCase();
      data.name = data.name.replace(/\s+/g, " ");
      if (isNew) db.employees.push({ id: db.nextId++, ...data, active: true, inactive_since: "" });
      else Object.assign(emp, data);
      save(); close(); renderAll();
      flash(isNew ? `${data.name} (${data.emp_code}) was added.` : `${data.name}'s details were updated.`);
    });
  }

  function initEmployees() {
    const opts = DEPARTMENTS.map((d) => `<option>${d}</option>`).join("");
    $("#empDeptFilter").innerHTML = `<option value="">All departments</option>` + opts;
    $("#empSearch").addEventListener("input", renderEmployees);
    $("#empDeptFilter").addEventListener("change", renderEmployees);
    $("#empStatusFilter").addEventListener("change", renderEmployees);
    $("#addEmpBtn").onclick = () => employeeModal(null);
    $("#empTable").addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-edit],[data-toggle],[data-del],[data-history]");
      if (!b) return;
      const e = empById(b.dataset.edit || b.dataset.toggle || b.dataset.del || b.dataset.history);
      if (b.dataset.edit) employeeModal(e);
      else if (b.dataset.history) historyModal(e, todayISO());
      else if (b.dataset.toggle) {
        if (e.active) {
          if (!(await ask(`Deactivate ${e.name}? They won't be able to check in, but their history is kept.`, "Deactivate", true))) return;
          e.active = false; e.inactive_since = todayISO();
          if (rec(todayISO(), e.id) && !rec(todayISO(), e.id).in) setRec(todayISO(), e.id, null);
        } else { e.active = true; e.inactive_since = ""; }
        save(); renderAll(); flash(`${e.name} is now ${e.active ? "active" : "inactive"}.`);
      } else if (b.dataset.del) {
        if (!(await ask(`Delete ${e.name} permanently? This can't be undone.`, "Delete", true))) return;
        db.employees = db.employees.filter((x) => x.id !== e.id);
        save(); renderAll(); flash(`${e.name} was deleted.`);
      }
    });
  }

  /* =========================================================
     Reports
     ========================================================= */
  function workdaysBetween(from, to) {
    const out = [], end = to > todayISO() ? todayISO() : to;
    for (let d = from; d <= end; d = addDays(d, 1)) if (isWorkday(d)) out.push(d);
    return out;
  }
  
function summarize(e, days) {
  const t = todayISO();

  const s = {
    eligible: 0,
    Present: 0,
    Late: 0,
    Absent: 0,
    Leave: 0,
    unmarked: 0,
    mins: 0,
    inSum: 0,
    inN: 0,
    daily: []
  };

  days.forEach((d) => {
    if (!employedOn(e, d)) return;

    const r = rec(d, e.id);

    // Do not count today's attendance while the shift is still in progress.
    if (!r && d === t && !shiftOver()) return;

    s.eligible++;

    // No record means unmarked, NOT confirmed absent.
    if (!r) {
      s.unmarked++;
      s.daily.push([d, "Unmarked", null]);
      return;
    }

    // Count only the status explicitly recorded.
    if (Object.prototype.hasOwnProperty.call(s, r.status)) {
      s[r.status]++;
    }

    if (r.in) {
      s.inSum += toMin(r.in);
      s.inN++;
    }

    const w = workedMin(r);
    if (w) s.mins += w;

    s.daily.push([d, r.status, r]);
  });

  // Attendance rate is based on recorded Present and Late days,
  // divided by all eligible working days.
  const recordedDays = s.Present + s.Late + s.Absent;

s.rate = recordedDays
  ? Math.round(((s.Present + s.Late) / recordedDays) * 100)
  : null;

  return s;
}

  function reportRange() {
    const from = $("#repFrom").value, to = $("#repTo").value;
    const err = !from || !to ? "Choose both dates." : from > to ? "'From' must be on or before 'To'." :
      to > todayISO() ? "'To' can't be in the future." : (parseISO(to) - parseISO(from)) / 864e5 > 366 ? "Range can be at most one year." : "";
    $("#repError").textContent = err;
    $$("#repFrom,#repTo").forEach((i) => i.classList.toggle("invalid", !!err));
    return err ? null : { from, to };
  }
  function reportRows() {
    const range = reportRange(); if (!range) return null;
    const days = workdaysBetween(range.from, range.to);
    const dept = $("#repDept").value;
    const rows = db.employees
      .filter((e) => !dept || e.department === dept)
      .map((e) => ({ e, s: summarize(e, days) }))
      .filter((x) => x.s.eligible > 0)
      .sort((a, b) => a.e.emp_code.localeCompare(b.e.emp_code));
    return { range, days, rows };
  }
  function renderReports() {
    const R = reportRows();
    if (!R) { $("#repTable").innerHTML = ""; $("#repStats").innerHTML = ""; return; }
    const tot = R.rows.reduce((a, { s }) => {
      ["eligible", "Present", "Late", "Absent", "Leave", "mins"].forEach((k) => (a[k] += s[k])); return a;
    }, { eligible: 0, Present: 0, Late: 0, Absent: 0, Leave: 0, mins: 0 });
    const recordedDays = tot.Present + tot.Late + tot.Absent;

    const att = recordedDays
      ? Math.round(((tot.Present + tot.Late) / recordedDays) * 100)
      : 0;

const punct = tot.Present + tot.Late
  ? Math.round((tot.Present / (tot.Present + tot.Late)) * 100)
  : 0;
    const tile = (c, l, v, sub = "") => `<div class="stat ${c}"><span class="stat-label">${l}</span><span class="stat-value">${v}</span>${sub ? `<span class="stat-sub">${sub}</span>` : ""}</div>`;
    $("#repStats").innerHTML =
      tile("", "Working days", R.days.length, `${fmtShortDate(R.range.from)} – ${fmtShortDate(R.range.to)}`) +
      tile("stat-present", "Attendance rate", att + "%", `${tot.Present + tot.Late} of ${recordedDays} recorded person-days`) +
      tile("stat-late", "Punctuality", punct + "%", `${tot.Late} late arrivals`) +
      tile("stat-absent", "Absences", tot.Absent, `${tot.Leave} leave days`) +
      tile("", "Hours logged", Math.round(tot.mins / 60).toLocaleString(), "completed shifts only");
    const cls = (r) => (r == null ? "" : r >= 95 ? "good" : r >= 85 ? "warn" : "bad");
    $("#repTable").innerHTML = R.rows.length ? `<div class="table-wrap"><table class="table"><thead><tr>
      <th>Employee</th><th>Days</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Avg check-in</th><th>Avg hours</th><th>Attendance</th></tr></thead><tbody>
      ${R.rows.map(({ e, s }) => {
        const worked = s.daily.filter(([, , r]) => r && workedMin(r)).length;
        return `<tr><td class="clickable" data-history="${e.id}"><strong>${esc(e.name)}</strong><br><span class="muted small">${esc(e.emp_code)} · ${esc(e.department)}${e.active ? "" : " · inactive"}</span></td>
        <td>${s.eligible}</td><td>${s.Present}</td><td class="${s.Late ? "warn" : ""}">${s.Late}</td>
        <td class="${s.Absent ? "bad" : ""}">${s.Absent}${s.unmarked ? `<span class="muted small"> (${s.unmarked} unmarked)</span>` : ""}</td>
        <td>${s.Leave}</td><td class="nowrap">${s.inN ? fmt12(fromMin(s.inSum / s.inN)) : "—"}</td>
        <td class="hours">${worked ? fmtDur(s.mins / worked) : "—"}</td>
        <td><div class="pct"><div class="bar bar-thin"><div class="bar-fill" style="width:${s.rate || 0}%"></div></div><span class="pct-num ${cls(s.rate)}">${s.rate ?? "—"}%</span></div></td></tr>`;
      }).join("")}</tbody></table></div>`
      : `<p class="empty">No attendance data for this range.</p>`;
  }
  function setQuickRange(v) {
    const t = todayISO(), d = parseISO(t);
    if (v === "month") { $("#repFrom").value = isoOf(new Date(d.getFullYear(), d.getMonth(), 1)); $("#repTo").value = t; }
    if (v === "last30") { $("#repFrom").value = addDays(t, -29); $("#repTo").value = t; }
    if (v === "week") { $("#repFrom").value = addDays(t, -((d.getDay() + 6) % 7)); $("#repTo").value = t; }
  }
  function initReports() {
    $("#repDept").innerHTML = `<option value="">All</option>` + DEPARTMENTS.map((d) => `<option>${d}</option>`).join("");
    $("#repFrom").max = $("#repTo").max = todayISO();
    setQuickRange("month");
    $("#repQuick").onchange = (e) => { setQuickRange(e.target.value); renderReports(); };
    $$("#repFrom,#repTo").forEach((i) => i.addEventListener("change", () => { $("#repQuick").value = ""; renderReports(); }));
    $("#repDept").onchange = renderReports;
    $("#repTable").addEventListener("click", (ev) => {
      const c = ev.target.closest("[data-history]");
      if (c) historyModal(empById(c.dataset.history), $("#repTo").value || todayISO());
    });
    $("#exportSummary").onclick = () => {
      const R = reportRows(); if (!R) return;
      const rows = [["Employee ID", "Name", "Department", "Designation", "Status", "Working days", "Present", "Late", "Absent", "Leave", "Attendance %", "Avg check-in", "Total hours"]];
      R.rows.forEach(({ e, s }) => rows.push([e.emp_code, e.name, e.department, e.designation, e.active ? "Active" : "Inactive",
        s.eligible, s.Present, s.Late, s.Absent, s.Leave, s.rate ?? "", s.inN ? fromMin(s.inSum / s.inN) : "", (s.mins / 60).toFixed(1)]));
      downloadFile(`attendance-summary_${R.range.from}_to_${R.range.to}.csv`, toCSV(rows), "text/csv");
      flash(`Exported summary for ${R.rows.length} employees.`);
    };
    $("#exportDetail").onclick = () => {
      const R = reportRows(); if (!R) return;
      const rows = [["Date", "Day", "Employee ID", "Name", "Department", "Status", "Check-in", "Check-out", "Hours", "Late (min)", "Note", "Source"]];
      R.rows.forEach(({ e, s }) => s.daily.forEach(([d, st, r]) => rows.push([d, DAY_NAMES[dow(d)], e.emp_code, e.name, e.department, st,
        r?.in || "", r?.out || "", r && workedMin(r) ? (workedMin(r) / 60).toFixed(2) : "",
        r?.status === "Late" ? lateBy(r.in) : "", r?.note || "", r?.source || ""])));
      rows.splice(1, rows.length, ...rows.slice(1).sort((a, b) => a[0].localeCompare(b[0]) || a[2].localeCompare(b[2])));
      downloadFile(`attendance-log_${R.range.from}_to_${R.range.to}.csv`, toCSV(rows), "text/csv");
      flash(`Exported ${rows.length - 1} daily records.`);
    };
  }

  function historyModal(e, anchorISO) {
    let month = parseISO(anchorISO); month = new Date(month.getFullYear(), month.getMonth(), 1);
    const render = (root) => {
      const first = isoOf(month), last = isoOf(new Date(month.getFullYear(), month.getMonth() + 1, 0));
      const s = summarize(e, workdaysBetween(first, last));
      const lead = (month.getDay() + 6) % 7; // Monday-first
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push(`<div class="cal-d blank"></div>`);
      for (let d = first; d <= last; d = addDays(d, 1)) {
        const r = rec(d, e.id);
        let cls = "", tip = d;
        if (r) { cls = r.status.toLowerCase(); tip += ` · ${r.status}${r.in ? " " + fmt12(r.in) : ""}${r.out ? "–" + fmt12(r.out) : ""}`; }
        else if (isWorkday(d) && employedOn(e, d) && (d < todayISO() || (d === todayISO() && shiftOver()))) { cls = "absent"; tip += " · Absent (unmarked)"; }
        cells.push(`<div class="cal-d ${cls} ${d === todayISO() ? "today" : ""}" title="${esc(tip)}">${parseISO(d).getDate()}</div>`);
      }
      $("#histBody", root).innerHTML = `
        <div class="card-head" style="margin-bottom:10px">
          <button class="btn btn-ghost btn-sm" type="button" id="hPrev">‹</button>
          <strong>${month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button class="btn btn-ghost btn-sm" type="button" id="hNext" ${last >= todayISO() ? "disabled" : ""}>›</button>
        </div>
        <div class="kv"><div><span>Attendance</span><strong>${s.rate ?? "—"}${s.rate != null ? "%" : ""}</strong></div>
          <div><span>Late</span><strong class="warn">${s.Late}</strong></div>
          <div><span>Absent</span><strong class="bad">${s.Absent}</strong></div>
          <div><span>Hours</span><strong>${(s.mins / 60).toFixed(1)}</strong></div></div>
        <div class="cal">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="cal-h">${d}</div>`).join("")}${cells.join("")}</div>
        <div class="legend"><span><i style="background:var(--present-bg);border:1px solid var(--present)"></i>Present</span>
          <span><i style="background:var(--late-bg);border:1px solid var(--late)"></i>Late</span>
          <span><i style="background:var(--absent-bg);border:1px solid var(--absent)"></i>Absent</span>
          <span><i style="background:var(--leave-bg);border:1px solid var(--leave)"></i>Leave</span></div>`;
      $("#hPrev", root).onclick = () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(root); };
      $("#hNext", root).onclick = () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(root); };
    };
    const { root } = openModal(`<div class="modal-head"><div><h2>${esc(e.name)}</h2>
      <span class="muted small">${esc(e.emp_code)} · ${esc(e.designation)} · ${esc(e.department)} · joined ${esc(e.join_date)}</span></div>
      <button class="x-btn" data-close aria-label="Close">×</button></div><div id="histBody"></div>`);
    render(root);
  }

  /* =========================================================
     Settings
     ========================================================= */
  function renderSettings() {
    const f = $("#setForm"), s = S();
    f.setCompany.value = s.company; f.setStart.value = s.shiftStart; f.setEnd.value = s.shiftEnd;
    f.setGrace.value = s.grace; f.setHalf.value = s.fullDay;
    $("#setDays").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="seg-opt seg-present">
      <input type="checkbox" name="day" value="${d}" ${s.workDays.includes(d) ? "checked" : ""}><span>${DAY_NAMES[d]}</span></label>`).join("");
  }
  function initSettings() {
    const f = $("#setForm");
    const validate = wireValidation(f, (n, v) => {
      if (n === "setEnd" && f.setStart.value && v && toMin(v) <= toMin(f.setStart.value)) return "Shift end must be after shift start.";
      return "";
    });
    onSubmit(f, (e) => {
      if (!validate()) return;
      const days = $$("input[name=day]:checked", f).map((i) => +i.value);
      if (!days.length) { flash("Select at least one working day.", "error"); return; }
      Object.assign(db.settings, { company: f.setCompany.value.trim(), shiftStart: f.setStart.value, shiftEnd: f.setEnd.value,
        grace: +f.setGrace.value, fullDay: +f.setHalf.value, workDays: days });
      save(); renderAll(); flash("Settings saved. New check-ins use the updated shift rules.");
    });
    $("#backupBtn").onclick = () => downloadFile(`attendtrack-backup_${todayISO()}.json`, JSON.stringify(db, null, 2), "application/json");
    $("#restoreInput").onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = async () => {
        try {
          const d = JSON.parse(rd.result);
          if (d.version !== 2 || !Array.isArray(d.employees) || typeof d.attendance !== "object" || !d.settings) throw new Error("bad");
          if (!(await ask(`Restore backup with ${d.employees.length} employees? Current data will be replaced.`, "Restore", true))) { e.target.value = ""; return; }
          db = d; save(); renderAll(); flash("Backup restored.");
        } catch (_) { flash("That file isn't a valid AttendTrack backup.", "error"); }
        e.target.value = "";
      };
      rd.readAsText(file);
    };
    $("#resetBtn").onclick = async () => {
      if (!(await ask("Replace ALL data with fresh sample data? This can't be undone.", "Reset data", true))) return;
      db = sampleData(); save(); renderAll(); flash("Sample data restored.");
    };
  }

  /* =========================================================
     Routing
     ========================================================= */
  // Page state lives in a variable, not only the URL, so navigation also works in sandboxed previews.
  let route = (location.hash || "#dashboard").slice(1);
  const currentPage = () => {
    const p = route;
    if (!PAGES[p]) return "dashboard";
    if (p === "settings" && user && user.role !== "Administrator" && user.role !== "Admin") return "dashboard";
    if (p === "checkin" && user) return "dashboard";
    return p;
  };
  let shownPage = null;
  async function go(page) {
    if (user && page === "checkin") page = "dashboard";
    if (user && page === "settings" && user.role !== "Administrator" && user.role !== "Admin") page = "dashboard";
    if (shownPage === "attendance" && page !== "attendance" && regDirty()) {
      if (!(await ask("You have unsaved attendance changes. Leave without saving?", "Leave", true))) {
        try { history.replaceState(null, "", "#attendance"); } catch (_) { /* sandboxed */ }
        return;
      }
      regChanges.clear(); renderRegister();
    }
    route = page;
    try { if (location.hash !== "#" + page) history.replaceState(null, "", "#" + page); } catch (_) { /* sandboxed */ }
    showPage();
  }
  function showPage() {
    const key = currentPage();
    shownPage = key;
    $$(".page").forEach((p) => (p.hidden = p.id !== "page-" + key));
    $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.page === key));
    $("#pageTitle").textContent = PAGES[key][0];
    $("#pageSub").textContent = PAGES[key][1]();
    document.title = `${PAGES[key][0]} · AttendTrack`;
    $("#sidebar").classList.remove("open");
    $("#flashes").replaceChildren();
    if (key === "checkin") setTimeout(() => $("#kioskId").focus(), 30);
    window.scrollTo(0, 0);
  }

  function renderAll() {
    renderShiftPill(); renderDashboard(); renderKiosk(); renderEmployees(); renderReports(); renderSettings();
    if (!regDirty()) renderRegister();
  }

  /* =========================================================
     Boot
     ========================================================= */
  $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
  $("#logoutBtn").onclick = logout;
  window.addEventListener("hashchange", () => go((location.hash || "#dashboard").slice(1)));
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute("href").slice(1) || "dashboard");
  });
  window.addEventListener("beforeunload", (e) => { if (regDirty()) { e.preventDefault(); e.returnValue = ""; } });

  (async () => {
  db = await loadData();
  initWelcome();
  initLogin();
  initEmployeeLogin();
  initKiosk();
  initRegister();
  initEmployees();
  initReports();
  initSettings();
  user = currentUser();
  setLocked(!user);
  if (user) {

    $("#welcomeScreen").hidden = true;

    applyUser();
    renderAll();
    showPage();

} else {

    renderAll();

    const empCode = store.get(EMP_SESSION_KEY, true);

    const pe = empCode && db.employees.find(
        (x) => x.emp_code === empCode && x.active
    );

    if (pe) {
        openPortal(pe);
    } else {
        showWelcome();
    }

}
  tick(); setInterval(tick, 1000);

  // Pick up changes made on other devices (e.g. the check-in kiosk) every 30 seconds.
  setInterval(async () => {
    if (!serverMode || regDirty() || $("#modalHost").innerHTML) return;
    try {
      const d = await fetchServer();
      if (!d || d.version !== 2) return;
      db = d;
      if (portalEmp) portalEmp = empById(portalEmp.id) || portalEmp;
      renderAll();
      if (portalEmp) renderPortal();
    } catch (_) { /* server unreachable; try again next time */ }
  }, 30000);
  })();
})();
