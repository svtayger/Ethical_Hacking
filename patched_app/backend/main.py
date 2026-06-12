from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import sqlite3
import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Security Configurations
SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_REPLACE_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(debug=False)

# --- PASSWORD UTILITIES ---

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "myeduconnect.db"

# --- DATABASE SETUP ---

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
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
        # Admin password: admin123
        admin_pass = hash_password("admin123")
        # Student password: password123
        student_pass = hash_password("password123")
        
        cursor.execute("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
                       ('admin', admin_pass, 'admin', 'System Admin', 'admin@myeduconnect.local'))
        cursor.execute("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)",
                       ('student1', student_pass, 'student', 'John Doe', 'john@student.local'))
        
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('Ethical Hacking 101', 'Learn the basics of security.', 49.99))
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('Advanced SQLi', 'Master database exploitation.', 99.99))
        cursor.execute("INSERT INTO courses (title, description, price) VALUES (?, ?, ?)", ('React Security', 'Building secure frontends.', 29.99))
    
    conn.commit()
    conn.close()

init_db()

# --- SECURITY UTILITIES ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        raise credentials_exception
    return dict(user)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user

# --- AUTHENTICATION ENDPOINTS ---

@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...), full_name: str = Form(...), email: str = Form(...)):
    # FIX: Secure password hashing (Bcrypt)
    hashed_password = hash_password(password)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password, full_name, email) VALUES (?, ?, ?, ?)", 
                       (username, hashed_password, full_name, email))
        conn.commit()
        return {"message": "User registered successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    # FIX: Secure password verification
    if user and verify_password(password, user['password']):
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['username']}, expires_delta=access_token_expires
        )
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user_id": user['id'], 
            "role": user['role'], 
            "username": user['username'],
            "is_premium": user['is_premium']
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- COURSES & SEARCH ---

@app.get("/courses/search")
async def search_courses(q: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    # FIX: SQL Injection (Parameterized query)
    query = "SELECT * FROM courses WHERE title LIKE ? OR description LIKE ?"
    params = (f"%{q}%", f"%{q}%")
    cursor.execute(query, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

# --- PROFILE (FIXED IDOR) ---

@app.get("/profile/{user_id}")
async def get_profile(user_id: int, current_user: dict = Depends(get_current_user)):
    # FIX: IDOR (Only allow user to see their own profile or admin)
    if current_user['id'] != user_id and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, email, role, is_premium FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    raise HTTPException(status_code=404, detail="User not found")

@app.put("/profile/{user_id}")
async def update_profile(user_id: int, full_name: str = Form(...), email: str = Form(...), current_user: dict = Depends(get_current_user)):
    # FIX: IDOR (Only allow user to update their own profile)
    if current_user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET full_name = ?, email = ? WHERE id = ?", (full_name, email, user_id))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

# --- ENROLLMENT & PAYMENT (FIXED PRICE MANIPULATION) ---

@app.get("/admin/enrollments")
async def get_all_enrollments(admin: dict = Depends(get_admin_user)):
    # FIX: Access Control (Admin only)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''SELECT e.id, u.username, u.full_name, c.title as course_title, c.price 
                      FROM enrollments e 
                      JOIN users u ON e.user_id = u.id 
                      JOIN courses c ON e.course_id = c.id''')
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

@app.post("/enroll")
async def enroll(course_id: int = Form(...), current_user: dict = Depends(get_current_user)):
    # FIX: Remove amount from Form, verify against DB
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT price FROM courses WHERE id = ?", (course_id,))
    course = cursor.fetchone()
    if not course:
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")
    
    price = course['price']
    # MOCK: In a real app, you would process the payment for `price` here.
    
    cursor.execute("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)", (current_user['id'], course_id))
    conn.commit()
    conn.close()
    return {"message": f"Successfully enrolled! Payment of ${price} processed."}

@app.get("/my-courses/{user_id}")
async def get_my_courses(user_id: int, current_user: dict = Depends(get_current_user)):
    # FIX: Authorization check
    if current_user['id'] != user_id and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''SELECT c.* FROM courses c 
                      JOIN enrollments e ON c.id = e.course_id 
                      WHERE e.user_id = ?''', (user_id,))
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

@app.post("/payment/premium")
async def process_payment(current_user: dict = Depends(get_current_user)):
    # FIX: Use hardcoded/server-side price for premium
    PREMIUM_PRICE = 99.99
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_premium = 1 WHERE id = ?", (current_user['id'],))
    conn.commit()
    conn.close()
    return {"message": f"Payment of ${PREMIUM_PRICE} successful. You are now a Premium member!"}

# --- REVIEWS (STORED XSS PROTECTION ON FRONTEND, BUT WE CAN ALSO ESCAPE HERE) ---

@app.post("/courses/{course_id}/reviews")
async def post_review(course_id: int, content: str = Form(...), current_user: dict = Depends(get_current_user)):
    # FIX: Input validation/sanitization could be added here
    # For now, we'll rely on frontend safe rendering, but let's be safe.
    import html
    safe_content = html.escape(content)
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reviews (course_id, user_id, content) VALUES (?, ?, ?)", (course_id, current_user['id'], safe_content))
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

# --- ADMIN ENDPOINTS (REMOVED DANGEROUS ONES) ---

@app.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, email, role FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users

@app.get("/admin/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
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
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
