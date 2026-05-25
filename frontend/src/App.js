import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8000";

function App() {
  const [view, setView] = useState('home'); // home, login, register, profile, courses, admin, premium
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [adminData, setAdminData] = useState({ users: [], stats: {} });
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const fetchCourses = async (query = '') => {
    // VULNERABILITY: SQL Injection via query param
    const res = await fetch(`${API_BASE}/courses/search?q=${query}`);
    const data = await res.json();
    setCourses(data);
    data.forEach(c => fetchReviews(c.id));
  };

  const fetchReviews = async (courseId) => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/reviews`);
    const data = await res.json();
    setReviews(prev => ({ ...prev, [courseId]: data }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch(`${API_BASE}/login`, { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setView('home');
    } else {
      alert("Invalid credentials");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch(`${API_BASE}/register`, { method: 'POST', body: formData });
    if (res.ok) {
      alert("Registered! Please login.");
      setView('login');
    }
  };

  const fetchProfile = async (id) => {
    // VULNERABILITY: IDOR - fetching profile by ID
    const res = await fetch(`${API_BASE}/profile/${id}`);
    const data = await res.json();
    setProfileData(data);
  };

  const fetchAdmin = async () => {
    const resU = await fetch(`${API_BASE}/admin/users`);
    const resS = await fetch(`${API_BASE}/admin/stats`);
    setAdminData({ users: await resU.json(), stats: await resS.json() });
  };

  const enroll = async (courseId) => {
    const formData = new FormData();
    formData.append('user_id', user.user_id);
    formData.append('course_id', courseId);
    await fetch(`${API_BASE}/enroll`, { method: 'POST', body: formData });
    alert("Enrolled!");
  };

  const postReview = async (e, courseId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('user_id', user.user_id);
    await fetch(`${API_BASE}/courses/${courseId}/reviews`, { method: 'POST', body: formData });
    fetchReviews(courseId);
    e.target.reset();
  };

  const buyPremium = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('user_id', user.user_id);
    // VULNERABILITY: Price manipulation in amount field
    await fetch(`${API_BASE}/payment/premium`, { method: 'POST', body: formData });
    alert("Welcome to Premium!");
    setView('home');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => setView('home')}>MyEduConnect</h1>
        <div className="space-x-6 flex items-center">
          <button onClick={() => { setView('courses'); fetchCourses(); }} className="hover:text-blue-500">Courses</button>
          {user ? (
            <>
              {user.role === 'admin' && <button onClick={() => { setView('admin'); fetchAdmin(); }} className="text-red-600 font-semibold">Admin Panel</button>}
              <button onClick={() => { setView('profile'); fetchProfile(user.user_id); }} className="hover:text-blue-500">Profile</button>
              <button onClick={() => setUser(null)} className="bg-gray-200 px-4 py-2 rounded">Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('login')} className="hover:text-blue-500">Login</button>
              <button onClick={() => setView('register')} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      {view === 'home' && (
        <div className="py-20 text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h2 className="text-5xl font-extrabold mb-4">Master Your Future</h2>
          <p className="text-xl mb-8">Access world-class education anywhere, anytime.</p>
          <button onClick={() => { setView('courses'); fetchCourses(); }} className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100">Browse Courses</button>
          {!user?.is_premium && (
            <button onClick={() => setView('premium')} className="ml-4 border-2 border-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-blue-600 transition">Go Premium</button>
          )}
        </div>
      )}

      <main className="container mx-auto p-8">
        
        {/* Course Search & Grid */}
        {view === 'courses' && (
          <section>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Course Catalog</h2>
              <div className="flex space-x-2">
                <input 
                  type="text" placeholder="Search..." 
                  className="border p-2 rounded w-64"
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={() => fetchCourses(search)} className="bg-blue-600 text-white px-4 py-2 rounded">Search</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="h-40 bg-blue-100 flex items-center justify-center text-blue-500">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-green-600">${course.price}</span>
                      {user && <button onClick={() => enroll(course.id)} className="text-blue-600 font-semibold hover:underline">Enroll Now</button>}
                    </div>
                    <hr className="my-4" />
                    <h4 className="font-bold text-sm mb-2">Student Reviews:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                      {reviews[course.id]?.map(r => (
                        <div key={r.id} className="text-xs bg-gray-50 p-2 rounded">
                          <span className="font-bold">{r.username}: </span>
                          {/* VULNERABILITY: Stored XSS */}
                          <span dangerouslySetInnerHTML={{ __html: r.content }} />
                        </div>
                      ))}
                    </div>
                    {user && (
                      <form onSubmit={(e) => postReview(e, course.id)} className="flex space-x-2">
                        <input name="content" placeholder="Review..." className="border text-xs p-1 flex-grow rounded" />
                        <button type="submit" className="bg-gray-800 text-white text-xs px-2 py-1 rounded">Post</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Login */}
        {view === 'login' && (
          <section className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input name="username" placeholder="Username" className="w-full border p-3 rounded" required />
              <input name="password" type="password" placeholder="Password" className="w-full border p-3 rounded" required />
              <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-bold">Login</button>
            </form>
            <p className="mt-4 text-center text-sm">Don't have an account? <button onClick={() => setView('register')} className="text-blue-600">Register</button></p>
          </section>
        )}

        {/* Register */}
        {view === 'register' && (
          <section className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Register</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <input name="username" placeholder="Username" className="w-full border p-3 rounded" required />
              <input name="password" type="password" placeholder="Password" className="w-full border p-3 rounded" required />
              <input name="full_name" placeholder="Full Name" className="w-full border p-3 rounded" required />
              <input name="email" type="email" placeholder="Email" className="w-full border p-3 rounded" required />
              <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded font-bold">Create Account</button>
            </form>
          </section>
        )}

        {/* Profile (IDOR) */}
        {view === 'profile' && profileData && (
          <section className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">User Profile</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${profileData.is_premium ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                {profileData.is_premium ? 'Premium' : 'Standard'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded">
                <label className="text-xs text-gray-500 uppercase font-bold">Username</label>
                <p className="text-lg font-semibold">{profileData.username}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <label className="text-xs text-gray-500 uppercase font-bold">Role</label>
                <p className="text-lg font-semibold capitalize">{profileData.role}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded col-span-2">
                <label className="text-xs text-gray-500 uppercase font-bold">Full Name</label>
                <p className="text-lg font-semibold">{profileData.full_name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded col-span-2">
                <label className="text-xs text-gray-500 uppercase font-bold">Email Address</label>
                <p className="text-lg font-semibold">{profileData.email}</p>
              </div>
            </div>
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Account Security</h3>
              <p className="text-sm text-gray-500 mb-4 italic">Note: Your session token is stored in cleartext for educational purposes.</p>
              <code className="block bg-red-50 p-4 rounded text-red-700 break-all text-xs">
                {user?.token}
              </code>
            </div>
          </section>
        )}

        {/* Premium Payment */}
        {view === 'premium' && (
          <section className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-xl text-center">
            <h2 className="text-3xl font-bold mb-2 text-yellow-600">Go Premium</h2>
            <p className="text-gray-600 mb-8">Unlock all courses and priority support for life.</p>
            <div className="text-4xl font-bold mb-8">$99.99</div>
            <form onSubmit={buyPremium} className="space-y-4 text-left">
              <label className="block text-sm font-bold">Card Details</label>
              <input placeholder="1234 5678 9012 3456" className="w-full border p-3 rounded" disabled />
              <label className="block text-sm font-bold mt-4">Confirm Amount</label>
              <input name="amount" type="number" defaultValue="99.99" className="w-full border p-3 rounded text-green-600 font-bold" />
              <button type="submit" className="w-full bg-yellow-500 text-white p-3 rounded font-bold mt-4 hover:bg-yellow-600 shadow-lg">Pay & Upgrade</button>
            </form>
          </section>
        )}

        {/* Admin Panel */}
        {view === 'admin' && (
          <section>
            <h2 className="text-3xl font-bold mb-8">System Administration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">Total Users</h3>
                <p className="text-4xl font-bold">{adminData.stats.total_users}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                <h3 className="text-gray-500 text-sm font-bold uppercase mb-2">Total Enrollments</h3>
                <p className="text-4xl font-bold">{adminData.stats.total_enrollments}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-4 font-bold">ID</th>
                    <th className="p-4 font-bold">Username</th>
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{u.id}</td>
                      <td className="p-4">{u.username}</td>
                      <td className="p-4">{u.full_name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4 capitalize">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      <footer className="mt-20 p-8 text-center text-gray-500 text-sm border-t bg-white">
        &copy; 2026 MyEduConnect - Educational Laboratory (Vulnerable by Design)
      </footer>
    </div>
  );
}

export default App;
