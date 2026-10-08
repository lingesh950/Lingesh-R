"""
=============================================================================
SMART CAMPUS SAFETY & EMERGENCY ALERT SYSTEM - FLASK REST API & APPLICATION
=============================================================================
Backend foundation with Flask sessions, Werkzeug password hashing,
SQLite persistence, AI-driven priority triage, and role-based access control.

Run with:
    python app.py
"""

import functools
import os
import sys

# Ensure module imports work regardless of execution working directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.security import check_password_hash

import database
from ai_priority import classify_emergency, evaluate_priority

# Initialize Flask application with explicit template and static directories
app = Flask(
    __name__,
    template_folder=os.path.join(CURRENT_DIR, "templates"),
    static_folder=os.path.join(CURRENT_DIR, "static"),
)

# Secure Session Configuration
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "smart_campus_safety_super_secret_hackathon_key_2026"
)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"


# =============================================================================
# ROLE-BASED ACCESS CONTROL DECORATORS
# =============================================================================

def login_required(view_func):
    """
    Decorator requiring an active user session.
    Returns JSON 401 for API calls or redirects to index for browser requests.
    """
    @functools.wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Authentication required. Please log in.",
                        }
                    ),
                    401,
                )
            return redirect(url_for("page_index"))
        return view_func(*args, **kwargs)

    return wrapped_view


def student_required(view_func):
    """
    Decorator enforcing that the authenticated user possesses the 'student' role.
    """
    @functools.wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Authentication required. Please log in.",
                        }
                    ),
                    401,
                )
            return redirect(url_for("page_index"))

        if session.get("role") != "student":
            if request.path.startswith("/api/"):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Access denied: Student privilege required.",
                        }
                    ),
                    403,
                )
            return redirect(url_for("page_admin"))
        return view_func(*args, **kwargs)

    return wrapped_view


def admin_required(view_func):
    """
    Decorator enforcing that the authenticated user possesses the 'admin' role.
    Students are strictly barred from accessing admin endpoints.
    """
    @functools.wraps(view_func)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Authentication required. Please log in.",
                        }
                    ),
                    401,
                )
            return redirect(url_for("page_index"))

        if session.get("role") != "admin":
            if request.path.startswith("/api/"):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Access denied: Administrator privileges required.",
                        }
                    ),
                    403,
                )
            return redirect(url_for("page_student"))
        return view_func(*args, **kwargs)

    return wrapped_view


# =============================================================================
# AUTHENTICATION API ENDPOINTS
# =============================================================================

@app.route("/api/register", methods=["POST"])
def register():
    """
    POST /api/register
    Input validation:
    - student ID required
    - name required
    - password minimum 6 characters
    - student ID must be unique
    """
    data = request.get_json(silent=True) or {}

    student_id = str(data.get("student_id", "")).strip()
    name = str(data.get("name", "")).strip()
    password = str(data.get("password", "")).strip()
    confirm_password = data.get("confirm_password")

    # Validation
    if not student_id:
        return (
            jsonify({"success": False, "message": "Student ID is required."}),
            400,
        )

    if not name:
        return (
            jsonify({"success": False, "message": "Full name is required."}),
            400,
        )

    if not password:
        return (
            jsonify({"success": False, "message": "Password is required."}),
            400,
        )

    if len(password) < 6:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Password must be at least 6 characters in length.",
                }
            ),
            400,
        )

    if confirm_password is not None and str(confirm_password).strip() != password:
        return (
            jsonify({"success": False, "message": "Passwords do not match."}),
            400,
        )

    try:
        new_user = database.create_user(
            student_id=student_id, name=name, password=password, role="student"
        )
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Student account registered successfully.",
                    "data": new_user,
                }
            ),
            201,
        )
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 409
    except Exception as e:
        return (
            jsonify(
                {"success": False, "message": "Failed to register user account."}
            ),
            500,
        )


@app.route("/api/login", methods=["POST"])
def login():
    """
    POST /api/login
    Accepts student_id (or username) and password.
    Validates credentials and establishes server-side session.
    """
    data = request.get_json(silent=True) or {}

    student_id = str(
        data.get("student_id") or data.get("username", "")
    ).strip()
    password = str(data.get("password", "")).strip()

    if not student_id or not password:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Both Student ID and password are required.",
                }
            ),
            400,
        )

    user = database.get_user_by_student_id(student_id)
    if not user:
        return (
            jsonify(
                {"success": False, "message": "Invalid student ID or password."}
            ),
            401,
        )

    try:
        pw_matched = check_password_hash(user["password_hash"], password)
    except Exception:
        pw_matched = False

    if not pw_matched:
        return (
            jsonify(
                {"success": False, "message": "Invalid student ID or password."}
            ),
            401,
        )

    # Establish session state as requested
    session.clear()
    session["user_id"] = user["id"]
    session["student_id"] = user["student_id"]
    session["name"] = user["name"]
    session["role"] = user["role"]

    user_payload = {
        "id": user["id"],
        "student_id": user["student_id"],
        "name": user["name"],
        "role": user["role"],
    }
    return (
        jsonify(
            {
                "success": True,
                "message": f"Welcome back, {user['name']}!",
                "data": user_payload,
                "user": user_payload,
            }
        ),
        200,
    )


@app.route("/api/logout", methods=["POST"])
def logout():
    """
    POST /api/logout
    Clears session state.
    """
    session.clear()
    return (
        jsonify({"success": True, "message": "Logged out successfully.", "data": {}}),
        200,
    )


@app.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """
    GET /api/auth/me
    Retrieves current authenticated session details.
    """
    if "user_id" not in session:
        return (
            jsonify(
                {"success": False, "message": "User not logged in.", "data": None}
            ),
            401,
        )

    user_data = {
        "id": session.get("user_id"),
        "student_id": session.get("student_id"),
        "name": session.get("name"),
        "role": session.get("role"),
    }
    return (
        jsonify(
            {
                "success": True,
                "message": "Current user retrieved.",
                "data": user_data,
                "user": user_data,
            }
        ),
        200,
    )


# =============================================================================
# EMERGENCY ALERTS API ENDPOINTS
# =============================================================================

@app.route("/api/alerts", methods=["POST"])
@login_required
def create_emergency_alert():
    """
    POST /api/alerts
    Creates a new emergency incident report.
    Input validation:
    - emergency_type required
    - message optional
    - latitude optional
    - longitude optional

    Priority and recommended response are automatically determined via ai_priority.py.
    """
    data = request.get_json(silent=True) or {}

    raw_type = str(data.get("type") or data.get("emergency_type", "")).strip()
    message = str(data.get("message", "")).strip()
    latitude = data.get("lat") if data.get("lat") is not None else data.get("latitude")
    longitude = data.get("lng") if data.get("lng") is not None else data.get("longitude")

    if not raw_type:
        return (
            jsonify({"success": False, "message": "Emergency type is required."}),
            400,
        )

    # Optional float coordinate validation
    parsed_lat = None
    parsed_lng = None
    if latitude is not None and latitude != "":
        try:
            parsed_lat = float(latitude)
        except (ValueError, TypeError):
            return (
                jsonify({"success": False, "message": "Invalid latitude value."}),
                400,
            )

    if longitude is not None and longitude != "":
        try:
            parsed_lng = float(longitude)
        except (ValueError, TypeError):
            return (
                jsonify({"success": False, "message": "Invalid longitude value."}),
                400,
            )

    # Calculate AI priority & response plan via classify_emergency
    classification = classify_emergency(raw_type, message)
    emergency_type = classification["emergency_type"]
    priority = classification["priority"]
    recommended_response = classification["recommended_response"]

    user_id = session["user_id"]

    try:
        new_alert = database.create_alert(
            user_id=user_id,
            emergency_type=emergency_type,
            message=message,
            latitude=parsed_lat,
            longitude=parsed_lng,
            priority=priority,
            recommended_response=recommended_response,
        )

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Emergency alert submitted successfully. Campus dispatch alerted.",
                    "data": new_alert,
                    "alert": new_alert,
                }
            ),
            201,
        )
    except Exception as e:
        print(f"[Error creating alert]: {e}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to create emergency alert in system.",
                }
            ),
            500,
        )


@app.route("/api/alerts/mine", methods=["GET"])
@app.route("/api/alerts/my", methods=["GET"])
@login_required
def get_user_alerts():
    """
    GET /api/alerts/mine or GET /api/alerts/my
    Retrieves all alerts filed by the currently authenticated user.
    """
    user_id = session["user_id"]
    alerts = database.get_user_alerts(user_id)
    return (
        jsonify(
            {
                "success": True,
                "message": "User alerts retrieved successfully.",
                "data": alerts,
                "alerts": alerts,
            }
        ),
        200,
    )


@app.route("/api/alerts", methods=["GET"])
@admin_required
def get_all_alerts():
    """
    GET /api/alerts
    Admin-only endpoint. Retrieves all campus emergency alerts.
    """
    alerts = database.get_alerts()
    return (
        jsonify(
            {
                "success": True,
                "message": "All emergency alerts retrieved successfully.",
                "data": alerts,
                "alerts": alerts,
            }
        ),
        200,
    )


@app.route("/api/alerts/<int:alert_id>/status", methods=["PATCH"])
@admin_required
def update_status(alert_id: int):
    """
    PATCH /api/alerts/<id>/status
    Admin-only endpoint to update alert incident lifecycle status.
    Permitted statuses: Pending, Responding, Resolved.
    Prevents invalid status transitions (e.g., Resolved -> Pending).
    """
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status", "")).strip()

    valid_statuses = ["Pending", "Responding", "Resolved"]
    if new_status not in valid_statuses:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Invalid status '{new_status}'. Allowed values are: {', '.join(valid_statuses)}.",
                }
            ),
            400,
        )

    existing_alert = database.get_alert_by_id(alert_id)
    if not existing_alert:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Alert with ID {alert_id} not found.",
                }
            ),
            404,
        )

    try:
        updated_alert = database.update_alert_status(alert_id, new_status)
        return (
            jsonify(
                {
                    "success": True,
                    "message": f"Alert #{alert_id} status updated to '{new_status}'.",
                    "data": updated_alert,
                    "alert": updated_alert,
                }
            ),
            200,
        )
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        print(f"[Error updating alert status]: {e}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to update alert status in database.",
                }
            ),
            500,
        )


# =============================================================================
# HTML TEMPLATE VIEWS (NO FRONTEND FRAMEWORK)
# =============================================================================

@app.route("/")
def page_index():
    """Landing and Authentication page."""
    return render_template("index.html")


@app.route("/student")
@student_required
def page_student():
    """Student Safety Portal & Alert History."""
    return render_template(
        "student.html",
        student_id=session.get("student_id"),
        name=session.get("name"),
    )


@app.route("/emergency")
@student_required
def page_emergency():
    """Emergency SOS Instant Dispatch Form."""
    return render_template(
        "emergency.html",
        student_id=session.get("student_id"),
        name=session.get("name"),
    )


@app.route("/admin")
@admin_required
def page_admin():
    """Admin Incident Command Center."""
    return render_template(
        "admin.html",
        student_id=session.get("student_id"),
        name=session.get("name"),
    )


# Automatically initialize the database on startup
with app.app_context():
    database.initialize_database()

if __name__ == "__main__":
    # Default to port 5000 for standard local Flask development
    port = int(os.environ.get("FLASK_PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"[*] Starting Smart Campus Safety & Emergency Alert System on port {port} (debug={debug_mode})...")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
