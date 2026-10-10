import sqlite3
import os
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "operators.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for operators, pending OTPs, and login audit logs."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Operators table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_verified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Pending OTPs table (for verification prior to activating account)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_otps (
            email TEXT PRIMARY KEY,
            otp_code TEXT NOT NULL,
            password TEXT NOT NULL,
            expires_at REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Login audit logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL
        )
    """)
    
    # Pre-seed default operator account for Shreyash if not exists
    cursor.execute("SELECT id FROM operators WHERE LOWER(email) = ?", ("shreyashkadam98922@gmail.com",))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO operators (email, password, is_verified) VALUES (?, ?, 1)",
            ("shreyashkadam98922@gmail.com", "shreyash@2005")
        )
        print("[DB] Default operator shreyashkadam98922@gmail.com pre-seeded.")
        
    conn.commit()
    conn.close()
    print("[DB] SQLite database initialized at:", DB_PATH)

def is_email_registered(email: str) -> bool:
    """Check if an email is already verified in operators."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM operators WHERE LOWER(email) = ? AND is_verified = 1", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return row is not None

def save_pending_otp(email: str, password: str, otp_code: str, ttl_seconds: int = 600):
    """Saves or updates pending OTP for an email with expiration time."""
    email_clean = email.strip().lower()
    expires_at = time.time() + ttl_seconds
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO pending_otps (email, otp_code, password, expires_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            otp_code = excluded.otp_code,
            password = excluded.password,
            expires_at = excluded.expires_at,
            created_at = CURRENT_TIMESTAMP
    """, (email_clean, otp_code, password, expires_at))
    conn.commit()
    conn.close()

def verify_and_register_operator(email: str, otp_code: str) -> tuple[bool, str]:
    """Verifies the submitted OTP. If valid, registers/activates the operator in the database."""
    email_clean = email.strip().lower()
    otp_clean = otp_code.strip()
    now = time.time()
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT otp_code, password, expires_at FROM pending_otps WHERE email = ?", (email_clean,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return False, "No OTP request found for this email. Please click Sign Up again."
        
    stored_otp, password, expires_at = row["otp_code"], row["password"], row["expires_at"]
    
    if now > expires_at:
        cursor.execute("DELETE FROM pending_otps WHERE email = ?", (email_clean,))
        conn.commit()
        conn.close()
        return False, "OTP has expired. Please sign up again to receive a fresh code."
        
    if stored_otp != otp_clean:
        conn.close()
        return False, "Incorrect OTP code. Please check your email inbox and try again."
        
    # Valid OTP: Upsert operator into operators table as verified
    cursor.execute("""
        INSERT INTO operators (email, password, is_verified)
        VALUES (?, ?, 1)
        ON CONFLICT(email) DO UPDATE SET
            password = excluded.password,
            is_verified = 1
    """, (email_clean, password))
    
    # Remove from pending
    cursor.execute("DELETE FROM pending_otps WHERE email = ?", (email_clean,))
    conn.commit()
    conn.close()
    
    return True, "Account activated successfully."

def check_operator_credentials(email: str, password: str) -> tuple[bool, str]:
    """Checks credentials against the operators database."""
    email_clean = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT password, is_verified FROM operators WHERE LOWER(email) = ?", (email_clean,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return False, "No operator account found with this email."
        
    if row["password"] != password:
        return False, "Incorrect password."
        
    if not row["is_verified"]:
        return False, "Account email is not verified yet. Please complete OTP verification."
        
    return True, "Authentication successful."

def log_login_event(email: str, status: str):
    """Records login attempt into audit log."""
    email_clean = email.strip().lower()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO login_logs (email, status) VALUES (?, ?)", (email_clean, status))
    conn.commit()
    conn.close()
