"""
=============================================================================
SMART CAMPUS SAFETY & EMERGENCY ALERT SYSTEM - DATABASE MODULE
=============================================================================
Database abstraction layer using SQLite with parameterized queries,
secure password hashing via Werkzeug, and modular architecture designed for
seamless migration to PostgreSQL, MySQL, or Firebase.
"""

import os
import sqlite3
from typing import Any, Dict, List, Optional
from werkzeug.security import generate_password_hash

# Default database file path (located in same folder as database.py)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "campus_safety.db")


def get_db_connection() -> sqlite3.Connection:
    """
    Establish and return a SQLite database connection with row access by column name.
    Foreign key enforcement is enabled by default.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def initialize_database() -> None:
    """
    Creates tables if they do not exist and automatically seeds
    demo administrator and student accounts on initial run.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Create Users Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # 2. Create Alerts Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                emergency_type TEXT NOT NULL,
                message TEXT,
                latitude REAL,
                longitude REAL,
                priority TEXT NOT NULL,
                recommended_response TEXT,
                status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Responding', 'Resolved')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
            """
        )

        conn.commit()

        # 3. Seed Default Accounts if Not Present
        seed_default_accounts(conn)

    except sqlite3.Error as e:
        conn.rollback()
        print(f"[Database Error] Initialization failed: {e}")
        raise
    finally:
        conn.close()


def seed_default_accounts(conn: sqlite3.Connection) -> None:
    """
    Seed initial Admin and Demo Student accounts specified in project requirements:
    - Admin: admin / admin123
    - Student 1: STU001 (Arun) / student123
    - Student 2: STU002 (Priya) / student123
    """
    cursor = conn.cursor()
    seed_users = [
        {
            "student_id": "admin",
            "name": "Campus Safety Administrator",
            "password": "admin123",
            "role": "admin",
        },
        {
            "student_id": "STU001",
            "name": "Arun",
            "password": "student123",
            "role": "student",
        },
        {
            "student_id": "STU002",
            "name": "Priya",
            "password": "student123",
            "role": "student",
        },
    ]

    for user in seed_users:
        cursor.execute(
            "SELECT id, password_hash FROM users WHERE student_id = ?;", (user["student_id"],)
        )
        existing = cursor.fetchone()
        hashed_pw = generate_password_hash(user["password"])
        if not existing:
            cursor.execute(
                """
                INSERT INTO users (student_id, name, password_hash, role)
                VALUES (?, ?, ?, ?);
                """,
                (user["student_id"], user["name"], hashed_pw, user["role"]),
            )
            print(f"[Seed] Created initial user: {user['student_id']} ({user['role']})")
        else:
            # Re-hash with current environment's Werkzeug algorithm to guarantee compatibility
            cursor.execute(
                """
                UPDATE users
                SET password_hash = ?, role = ?
                WHERE student_id = ?;
                """,
                (hashed_pw, user["role"], user["student_id"]),
            )

    conn.commit()


# =============================================================================
# USER MANAGEMENT FUNCTIONS
# =============================================================================

def create_user(student_id: str, name: str, password: str, role: str = "student") -> Optional[Dict[str, Any]]:
    """
    Registers a new user with hashed credentials.
    Returns user dictionary (excluding password_hash) or raises ValueError/sqlite3.Error.
    """
    if role not in ("student", "admin"):
        raise ValueError("Invalid role. Role must be 'student' or 'admin'.")

    password_hash = generate_password_hash(password)
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO users (student_id, name, password_hash, role)
            VALUES (?, ?, ?, ?);
            """,
            (student_id.strip(), name.strip(), password_hash, role),
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {
            "id": new_id,
            "student_id": student_id.strip(),
            "name": name.strip(),
            "role": role,
        }
    except sqlite3.IntegrityError:
        conn.rollback()
        raise ValueError(f"Student ID '{student_id}' is already registered.")
    except sqlite3.Error as e:
        conn.rollback()
        print(f"[Database Error] create_user failed: {e}")
        raise
    finally:
        conn.close()


def get_user_by_student_id(student_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user record by unique student_id. Returns dictionary or None.
    Includes password_hash for authentication verification.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, student_id, name, password_hash, role, created_at
            FROM users
            WHERE student_id = ?;
            """,
            (student_id.strip(),),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    except sqlite3.Error as e:
        print(f"[Database Error] get_user_by_student_id failed: {e}")
        return None
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch user record by primary key id.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, student_id, name, role, created_at
            FROM users
            WHERE id = ?;
            """,
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    except sqlite3.Error as e:
        print(f"[Database Error] get_user_by_id failed: {e}")
        return None
    finally:
        conn.close()


# =============================================================================
# ALERT MANAGEMENT FUNCTIONS
# =============================================================================

def create_alert(
    user_id: int,
    emergency_type: str,
    message: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    priority: str = "High",
    recommended_response: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Creates an emergency incident alert with automatic priority and recommended action.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO alerts (
                user_id, emergency_type, message, latitude, longitude,
                priority, recommended_response, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending');
            """,
            (
                user_id,
                emergency_type.strip(),
                message.strip() if message else "",
                latitude,
                longitude,
                priority,
                recommended_response,
            ),
        )
        conn.commit()
        alert_id = cursor.lastrowid
        return get_alert_by_id(alert_id)
    except sqlite3.Error as e:
        conn.rollback()
        print(f"[Database Error] create_alert failed: {e}")
        raise
    finally:
        conn.close()


def get_alert_by_id(alert_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a single alert by its primary key ID with joined user details.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 
                a.id, a.user_id, a.emergency_type, a.message,
                a.latitude, a.longitude, a.priority, a.recommended_response,
                a.status, a.created_at,
                u.student_id, u.name as reporter_name
            FROM alerts a
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ?;
            """,
            (alert_id,),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    except sqlite3.Error as e:
        print(f"[Database Error] get_alert_by_id failed: {e}")
        return None
    finally:
        conn.close()


def get_alerts() -> List[Dict[str, Any]]:
    """
    Returns all campus emergency alerts ordered newest to oldest,
    including student credentials and reporter identity for admin oversight.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 
                a.id, a.user_id, a.emergency_type, a.message,
                a.latitude, a.longitude, a.priority, a.recommended_response,
                a.status, a.created_at,
                u.student_id, u.name as reporter_name
            FROM alerts a
            JOIN users u ON a.user_id = u.id
            ORDER BY 
                CASE UPPER(a.priority)
                    WHEN 'HIGH' THEN 1
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'MEDIUM' THEN 2
                    WHEN 'LOW' THEN 3
                    ELSE 4
                END ASC,
                a.created_at DESC,
                a.id DESC;
            """
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"[Database Error] get_alerts failed: {e}")
        return []
    finally:
        conn.close()


def get_user_alerts(user_id: int) -> List[Dict[str, Any]]:
    """
    Returns emergency alerts filed by a specific user ordered newest to oldest.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 
                a.id, a.user_id, a.emergency_type, a.message,
                a.latitude, a.longitude, a.priority, a.recommended_response,
                a.status, a.created_at,
                u.student_id, u.name as reporter_name
            FROM alerts a
            JOIN users u ON a.user_id = u.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC;
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        print(f"[Database Error] get_user_alerts failed: {e}")
        return []
    finally:
        conn.close()


def update_alert_status(alert_id: int, new_status: str) -> Optional[Dict[str, Any]]:
    """
    Validates status transition and updates alert status.
    Permitted statuses: 'Pending', 'Responding', 'Resolved'
    Valid transitions:
      Pending -> Responding
      Pending -> Resolved (Direct resolution / dismiss false alarm)
      Responding -> Resolved
      Responding -> Pending (Re-queue back to queue if dispatch interrupted)
    Disallowed transition:
      Resolved -> Pending (Resolved incident cannot directly jump back to Pending)
    """
    valid_statuses = ("Pending", "Responding", "Resolved")
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}")

    current = get_alert_by_id(alert_id)
    if not current:
        return None

    current_status = current["status"]

    # Prevent invalid status transition
    if current_status == "Resolved" and new_status == "Pending":
        raise ValueError("Invalid transition: Resolved alert cannot be reverted directly to Pending.")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE alerts
            SET status = ?
            WHERE id = ?;
            """,
            (new_status, alert_id),
        )
        conn.commit()
        return get_alert_by_id(alert_id)
    except sqlite3.Error as e:
        conn.rollback()
        print(f"[Database Error] update_alert_status failed: {e}")
        raise
    finally:
        conn.close()
