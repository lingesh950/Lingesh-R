# SMART CAMPUS SAFETY & EMERGENCY ALERT SYSTEM

A comprehensive, mobile-friendly student emergency application and real-time security incident response dashboard built for university campuses.

---

## 📌 Problem Statement

In campus emergencies (medical crises, fires, harassment, or physical threats), students frequently face:
- Delays in reaching security dispatch through traditional phone calls or panic numbers.
- Difficulty conveying exact physical GPS coordinates when disoriented or under stress.
- Lack of immediate automated triage to prioritize life-threatening incidents over routine reports.
- Dispatchers lacking real-time visibility into active incidents across sprawling campus grounds.

---

## 💡 Solution

**SMART CAMPUS SAFETY** solves this by providing:
1. **One-Tap Emergency SOS Beacon:** Instant distress signal transmission with automated high-accuracy GPS coordinates and pre-selected emergency categories.
2. **AI Priority & Triage Engine:** Hybrid rule-based NLP and Machine Learning classifier that parses distress messages in real time to categorize emergencies, assign priority ratings (`HIGH`, `MEDIUM`, `LOW`), and recommend immediate standard operating procedures.
3. **Live Security Command Dashboard:** Real-time 3-second live polling interface for campus security teams with visual/audible alarms, instant filtering, and lifecycle management (`Pending` &rarr; `Responding` &rarr; `Resolved`).

---

## ✨ Features

- **Mobile-First Student Interface:** Clean, high-contrast, touch-optimized UI with pulsing SOS button and quick category shortcuts (🚑 Medical, 🛡️ Security, 🔥 Fire, ⚠️ Other).
- **Automated GPS Geolocation:** Browser Geolocation API integration with clickable Google Maps links and graceful fallback to manual location input.
- **Incident History Tracking:** Real-time visibility for students into their previous alerts and current responder statuses.
- **AI-Powered Emergency Classification:**
  - Fire & Serious Medical (`difficulty breathing`, `unconscious`, `chest pain`, `bleeding`, etc.) &rarr; **HIGH**
  - Serious Security (`weapon`, `gun`, `knife`, `assault`, `following`, `threat`, `danger`) &rarr; **HIGH**
  - Lost items / minor complaints &rarr; **LOW**
  - Free-text inference that overrides category selection based on message keywords.
- **Admin Command Center:**
  - Active incident counters: 🔴 Pending, 🟡 Responding, 🟢 Resolved.
  - Multi-column sorted cards: **HIGH** priority first, followed by **MEDIUM**, **LOW**, and newest first within each tier.
  - 3-second live background polling.
  - Audio chimes (Web Audio API) and visual screen flash animations upon arrival of new alerts.
  - Instant client-side filtering by status and emergency type without page reloads.
- **Enterprise-Grade Security:**
  - Role-Based Access Control (RBAC): `@login_required`, `@student_required`, `@admin_required`.
  - Secure password hashing using Werkzeug.
  - Parameterized SQLite queries preventing SQL injection.
  - Modular database layer architected for easy swap with PostgreSQL, MySQL, or Firebase.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API, Browser Geolocation API (No React, Vue, Angular, Bootstrap, or Tailwind).
- **Backend:** Python 3, Flask, RESTful APIs, Flask Sessions.
- **Database:** SQLite3 (parameterized queries with foreign key constraints).
- **AI & ML Layer:** Python NLP Rule-based keyword engine + scikit-learn (`TfidfVectorizer` + `LogisticRegression`).
- **Security:** Werkzeug password hashing, HttpOnly session cookies, RBAC decorators.

---

## 📁 Project Structure

```text
smart-campus-safety/
│
├── app.py              # Main Flask server, routing & REST API endpoints
├── database.py         # SQLite persistence layer & abstraction
├── ai_priority.py      # Rule-based & ML incident classifier
├── requirements.txt    # Project Python dependencies
├── README.md           # Documentation, demo script & installation guide
├── campus_safety.db    # Auto-initialized SQLite database file
│
├── templates/          # Server-rendered HTML5 templates
│   ├── index.html      # Login & Registration page
│   ├── student.html    # Student Safety Home with SOS & quick buttons
│   ├── emergency.html  # Emergency Beacon form & Confirmation view
│   └── admin.html      # Security Command Incident Dashboard
│
└── static/
    ├── css/
    │   └── style.css   # Mobile-first stylesheet (Red/White/Dark-Blue)
    └── js/
        ├── auth.js     # Authentication & toast notifications
        ├── student.js  # Student alert history & live updates
        ├── emergency.js# GPS location lock & beacon dispatch
        └── admin.js    # Admin live stream, polling & status dispatcher
```

---

## 🚀 Installation & Setup

### 1. Clone or Navigate to Directory
```bash
cd smart-campus-safety
```

### 2. Create Virtual Environment
```bash
python -m venv venv
```

### 3. Activate Virtual Environment
- **Windows:**
  ```cmd
  venv\Scripts\activate
  ```
- **Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run Application
```bash
python app.py
```

### 6. Access in Browser
Open: [http://127.0.0.1:5000](http://127.0.0.1:5000)

*The SQLite database (`campus_safety.db`) and seed demo accounts are created automatically on first run.*

---

## 👥 Demo Credentials

| Role | Username / Student ID | Password | Full Name | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Campus Safety Administrator | Incident command, dispatch units, mark resolved |
| **Student 1** | `STU001` | `student123` | Arun | Broadcast SOS alerts, view personal alerts |
| **Student 2** | `STU002` | `student123` | Priya | Broadcast SOS alerts, view personal alerts |

---

## 🎤 Hackathon Demo Script (Presentation Walkthrough)

1. **Login as Student:**
   - Open `http://127.0.0.1:5000`.
   - Click the **🎓 Arun (STU001)** demo button (or enter `STU001` / `student123`).
   - Click **LOGIN**.
2. **Show Student Dashboard:**
   - Display `Welcome, Arun 👋` and the pulsing red **🚨 SOS** button.
   - Point out the 4 quick category buttons: 🚑 Medical, 🛡️ Security, 🔥 Fire, ⚠️ Other.
3. **Trigger Incident:**
   - Click the **🚑 Medical** shortcut (or the central SOS button).
4. **Demonstrate GPS Geolocation:**
   - Allow location access in browser.
   - Show live Latitude and Longitude locked on screen.
   - Click **🗺️ Open in Google Maps** to show real-world satellite position.
5. **Demonstrate Free-Text AI Triage:**
   - Change type dropdown to **⚠️ Other**.
   - In message textarea, enter:
     > `"I am having difficulty breathing in the laboratory."`
6. **Send Alert:**
   - Click **🚨 SEND ALERT**.
7. **Show AI Classification Results:**
   - Notice the confirmation screen:
     - **🚨 ALERT SENT**
     - Emergency Type: **Medical** *(Automatically inferred from free text!)*
     - Priority: **HIGH**
     - Recommended Response: **"Immediate medical assistance"**
     - Status: **Pending**
8. **Open Admin Dashboard:**
   - In another browser tab (or incognito window), navigate to `http://127.0.0.1:5000`.
   - Log in as `admin` / `admin123`.
   - Lands on **CAMPUS SECURITY COMMAND** (`/admin`).
9. **Show Real-Time Alert Arrival:**
   - Point out that within 3 seconds, the alert appears at the top of the queue.
   - Notice the visual red pulse highlight and audible alert chime.
10. **Show Student Incident Card:**
    - Displays Arun (`STU001`), Medical Icon 🚑, AI Priority 🔴 HIGH, and recommended action.
11. **Show GPS Dispatch Map:**
    - Click **📍 View Location** to view the incident on Google Maps.
12. **Dispatch Units (Click RESPOND):**
    - Click **🚨 RESPOND**.
    - Notice card and counters immediately update: 🔴 Pending drops, 🟡 Responding increments to 1.
13. **Resolve Incident (Click RESOLVED):**
    - Click **✅ RESOLVED**.
    - Notice card badge turns to 🟢 Resolved, and counter updates: 🟢 Resolved increments.
14. **Verify Student View:**
    - Switch back to Arun's student tab.
    - Refresh **My Previous Alerts** to verify the alert status is now updated to **Resolved**.
15. **Conclude & Highlight Future Scalability.**

---

## 🔮 Future Upgrades & Roadmap

- **SMS Notifications:** Automated Twilio / AWS SNS integration to alert campus emergency contacts.
- **Web Push Notifications:** Service Worker Web Push API for lockscreen notifications.
- **Database Scalability:** Native PostgreSQL / MySQL support via SQLAlchemy and Google Firebase Firestore sync.
- **Advanced Deep Learning:** Fine-tuned BERT / RoBERTa model for complex multi-lingual campus threat detection.
- **Interactive Campus GIS Map:** Leaflet.js / Mapbox vector map with heatmaps of high-incident campus zones.
- **First Responder Mobile App:** Dedicated Android/iOS progressive web application for security patrols on duty.
- **Emergency Contact Auto-Dialer:** Automated escalation alerts sent to parents/guardians upon critical incident trigger.
- **CCTV Camera Integration:** Automated PTZ camera panning to reported GPS coordinates.
- **Geofencing:** Automatic detection of on-campus vs. off-campus incidents.
- **Incident Analytics & Reporting:** Administrative audit trails, response-time metrics, and compliance logs.
- **Multi-Campus Support:** Multi-tenant architecture for university systems with distributed satellite campuses.
