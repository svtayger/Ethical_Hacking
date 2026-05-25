from fastapi import FastAPI, Request, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import mysql.connector
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

# Database Connection
def get_db_conn():
    return mysql.connector.connect(
        host="db",
        user="root",
        password="password",
        database="myeduconnect"
    )

# Static files for "leaking" sensitive info
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...), full_name: str = Form(...), email: str = Form(...)):
    # VULNERABILITY: Weak Password Storage (MD5)
    hashed_password = hashlib.md5(password.encode()).hexdigest()
    conn = get_db_conn()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password, full_name, email) VALUES (%s, %s, %s, %s)", 
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
    conn = get_db_conn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, hashed_password))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        # VULNERABILITY: Plaintext Session Handling (Simulation)
        return {"message": "Login successful", "user_id": user['id'], "role": user['role'], "token": "CLEAR_TEXT_SESSION_TOKEN_12345"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/courses/search")
async def search_courses(q: str = ""):
    conn = get_db_conn()
    cursor = conn.cursor(dictionary=True)
    # VULNERABILITY: SQL Injection (Raw string formatting)
    query = f"SELECT * FROM courses WHERE title LIKE '%{q}%' OR description LIKE '%{q}%'"
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()
    return results

@app.get("/profile/{user_id}")
async def get_profile(user_id: int):
    # VULNERABILITY: IDOR (No authentication or ownership check)
    conn = get_db_conn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username, full_name, email, role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return user
    raise HTTPException(status_code=404, detail="User not found")

@app.put("/profile/{user_id}")
async def update_profile(user_id: int, full_name: str = Form(...), email: str = Form(...)):
    # VULNERABILITY: IDOR (Any user can update any other user's profile)
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET full_name = %s, email = %s WHERE id = %s", (full_name, email, user_id))
    conn.commit()
    conn.close()
    return {"message": "Profile updated"}

@app.post("/courses/{course_id}/reviews")
async def post_review(course_id: int, user_id: int = Form(...), content: str = Form(...)):
    # VULNERABILITY: Stored XSS (No sanitization)
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reviews (course_id, user_id, content) VALUES (%s, %s, %s)", (course_id, user_id, content))
    conn.commit()
    conn.close()
    return {"message": "Review added"}

@app.get("/courses/{course_id}/reviews")
async def get_reviews(course_id: int):
    conn = get_db_conn()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.course_id = %s", (course_id,))
    reviews = cursor.fetchall()
    conn.close()
    return reviews

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
