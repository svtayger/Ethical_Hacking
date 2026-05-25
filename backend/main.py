from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sqlite3
import hashlib
import os

app = FastAPI(debug=True) # VULNERABILITY: Debug mode enabled

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "myeduconnect.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        full_name TEXT,
        email TEXT,
        is_premium INTEGER DEFAULT 0
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL DEFAULT 0.00
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        course_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(course_id) REFERENCES courses(id)
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        user_id INTEGER,
        content TEXT,
        FOREIGN KEY(course_id) REFERENCES courses(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    
    # Seed data
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
                       ('admin', hashlib.md5('admin'.encode()).hexdigest(), 'admin', 'System Admin', 'admin@myeduconnect.local'))
        cursor.execute("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
                       ('student1', hashlib.md5('password'.encode()).hexdigest(), 'student', 'John Doe', 'john@student.local'))
        
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('Ethical Hacking 101', 'Learn the basics of security.', 49.99))
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('Advanced SQLi', 'Master database exploitation.', 99.99))
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('React Security', 'Building secure frontends.', 29.99))
    
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Static files for "leaking" sensitive info
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# --- AUTHENTICATION ---

@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...), full_name: str = Form(...), email: str = Form(...)):
    # VULNERABILITY: Weak Password Storage (MD5)
    hashed_password = hashlib.md5(password.encode()).hexdigest()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password, full_name, email) VALUES (?, ?, ?, ?)", 
                       (username, hashed_password, full_name, email))
        conn.commit()
        return {"message": "User registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    # VULNERABILITY: Weak Password Verification (MD5)
    hashed_password = hashlib.md5(password.encode()).hexdigest()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, hashed_password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        # VULNERABILITY: Plaintext Session Handling
        return {
            "message": "Login successful", 
            "user_id": user['id'], 
            "role": user['role'], 
            "username": user['username'],
            "token": "CLEAR_TEXT_SESSION_TOKEN_" + user['username']
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- COURSES & SEARCH ---

@app.get("/courses/search")
async def search_courses(q: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    # VULNERABILITY: SQL Injection (Raw string formatting)
    query = f"SELECT * FROM courses WHERE title LIKE '%{q}%' OR description LIKE '%{q}%'"
    cursor.execute(query)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

# --- PROFILE (IDOR) ---

@app.get("/profile/{user_id}")
async def get_profile(user_id: int):
    # VULNERABILITY: IDOR (No authentication or ownership check)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, email, role, is_premium FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    raise HTTPException(status_code=404, detail="User not found")

@app.put("/profile/{user_id}")
async def update_profile(user_id: int, full_name: str = Form(...), email: str = Form(...)):
    # VULNERABILITY: IDOR (Any user can update any other user's profile)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET full_name = ?, email = ? WHERE id = ?", (full_name, email, user_id))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

# --- ENROLLMENT & PAYMENT ---

@app.post("/enroll")
async def enroll(user_id: int = Form(...), course_id: int = Form(...)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)", (user_id, course_id))
    conn.commit()
    conn.close()
    return {"message": "Enrolled successfully"}

@app.get("/my-courses/{user_id}")
async def get_my_courses(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''SELECT c.* FROM courses c 
                      JOIN enrollments e ON c.id = e.course_id 
                      WHERE e.user_id = ?''', (user_id,))
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

@app.post("/payment/premium")
async def process_payment(user_id: int = Form(...), amount: float = Form(...)):
    # MOCK PAYMENT WORKFLOW
    # VULNERABILITY: Price manipulation possible if amount is not verified
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_premium = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": f"Payment of ${amount} successful. You are now a Premium member!"}

# --- REVIEWS (XSS) ---

@app.post("/courses/{course_id}/reviews")
async def post_review(course_id: int, user_id: int = Form(...), content: str = Form(...)):
    # VULNERABILITY: Stored XSS (No sanitization)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reviews (course_id, user_id, content) VALUES (?, ?, ?)", (course_id, user_id, content))
    conn.commit()
    conn.close()
    return {"message": "Review added"}

@app.get("/courses/{course_id}/reviews")
async def get_reviews(course_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.course_id = ?", (course_id,))
    reviews = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reviews

# --- ADMIN PANEL ---

@app.get("/admin/users")
async def get_all_users():
    # VULNERABILITY: Broken Access Control (Potentially bypassable)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, email, role FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

@app.get("/admin/stats")
async def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM enrollments")
    enroll_count = cursor.fetchone()[0]
    conn.close()
    return {"total_users": user_count, "total_enrollments": enroll_count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
