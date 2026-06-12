import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = "/api";

function App() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [adminData, setAdminData] = useState({ users: [], stats: {}, enrollments: [] });
  const [reviews, setReviews] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);

  // FIX: Helper for authenticated requests
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const token = user?.access_token;
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
  }, [user]);

  const fetchMyCourses = useCallback(async () => {
    if (!user) return;
    const res = await authenticatedFetch(`${API_BASE}/my-courses/${user.user_id}`);
    if (res.ok) {
      const data = await res.json();
      setMyCourses(data);
    }
  }, [user, authenticatedFetch]);

  const fetchReviews = useCallback(async (courseId) => {
    const res = await fetch(`${API_BASE}/courses/${courseId}/reviews`);
    if (res.ok) {
      const data = await res.json();
      setReviews(prev => ({ ...prev, [courseId]: data }));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      fetchMyCourses();
    } else {
      localStorage.removeItem('user');
      setMyCourses([]);
    }
  }, [user, fetchMyCourses]);

  const fetchCourses = async (query = '') => {
    const res = await fetch(`${API_BASE}/courses/search?q=${query}`);
    const data = await res.json();
    setCourses(data);
    data.forEach(c => fetchReviews(c.id));
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
    } else {
      const err = await res.json();
      alert(err.detail || "Registration failed");
    }
  };

  const fetchProfile = async (id) => {
    const res = await authenticatedFetch(`${API_BASE}/profile/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProfileData(data);
    } else {
      alert("Unauthorized to view profile");
    }
  };

  const fetchAdmin = async () => {
    const [resU, resS, resE] = await Promise.all([
      authenticatedFetch(`${API_BASE}/admin/users`),
      authenticatedFetch(`${API_BASE}/admin/stats`),
      authenticatedFetch(`${API_BASE}/admin/enrollments`)
    ]);
    
    if (resU.ok && resS.ok && resE.ok) {
      setAdminData({ 
        users: await resU.json(), 
        stats: await resS.json(),
        enrollments: await resE.json() 
      });
    } else {
      alert("Admin access denied");
      setView('home');
    }
  };

  const startEnrollment = (course) => {
    setSelectedCourse(course);
    setView('checkout');
  };

  const confirmEnrollment = async (e) => {
    e.preventDefault();
    // FIX: Only send course_id, backend handles user_id and price
    const formData = new FormData();
    formData.append('course_id', selectedCourse.id);
    
    const res = await authenticatedFetch(`${API_BASE}/enroll`, { method: 'POST', body: formData });
    if (res.ok) {
      alert("Payment successful and Enrolled!");
      fetchMyCourses();
      setView('courses');
    } else {
      alert("Enrollment failed");
    }
  };

  const postReview = async (e, courseId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/reviews`, { method: 'POST', body: formData });
    if (res.ok) {
      fetchReviews(courseId);
      e.target.reset();
    }
  };

  const buyPremium = async (e) => {
    e.preventDefault();
    // FIX: Backend handles price
    const res = await authenticatedFetch(`${API_BASE}/payment/premium`, { method: 'POST' });
    if (res.ok) {
      alert("Welcome to Premium!");
      // Update local user state
      setUser(prev => ({...prev, is_premium: 1}));
      setView('home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => setView('home')}>MyEduConnect (PATCHED)</h1>
        <div className="space-x-6 flex items-center text-sm font-medium">
          <button onClick={() => { setView('courses'); fetchCourses(); }} className="hover:text-blue-500">Courses</button>
          {user ? (
            <>
              <button onClick={() => { setView('my-courses'); fetchMyCourses(); }} className="hover:text-blue-500 relative">
                My Courses
                {myCourses.length > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {myCourses.length}
                  </span>
                )}
              </button>
              {user.role === 'admin' && <button onClick={() => { setView('admin'); fetchAdmin(); }} className="text-red-600 font-bold hover:bg-red-50 px-3 py-1 rounded">Admin Panel</button>}
              <button onClick={() => { setView('profile'); fetchProfile(user.user_id); }} className="hover:text-blue-500">Profile</button>
              <button onClick={() => {setUser(null); setView('home');}} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => setView('login')} className="hover:text-blue-500">Login</button>
              <button onClick={() => setView('register')} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700">Get Started</button>
            </>
          )}
        </div>
      </nav>

      <main className="container mx-auto p-8">
        
        {view === 'home' && (
          <div className="py-20 text-center">
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">Learn Without Limits</h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">Access the world's most advanced cybersecurity curriculum. Secure and verified.</p>
            <div className="flex justify-center space-x-4">
              <button onClick={() => { setView('courses'); fetchCourses(); }} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition transform">Browse Courses</button>
              {user && !user?.is_premium && (
                <button onClick={() => setView('premium')} className="bg-yellow-400 text-yellow-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition transform">Upgrade to Premium</button>
              )}
            </div>
          </div>
        )}

        {view === 'courses' && (
          <section>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-bold">Educational Catalog</h2>
              <div className="flex bg-white rounded-xl shadow p-1 border">
                <input 
                  type="text" placeholder="Search courses (SQLi Patched)..." 
                  className="p-3 w-80 focus:outline-none"
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={() => fetchCourses(search)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Search</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition">
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white italic text-3xl font-black">
                    {course.title.substring(0,2).toUpperCase()}
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold mb-3">{course.title}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">{course.description}</p>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-3xl font-black text-gray-900">${course.price}</span>
                      {user && (
                        <button 
                          onClick={() => startEnrollment(course)} 
                          className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition"
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                    <div className="border-t pt-6">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Student Reviews</h4>
                      <div className="space-y-3 mb-6">
                        {reviews[course.id]?.map(r => (
                          <div key={r.id} className="bg-gray-50 p-3 rounded-lg text-sm italic">
                            <span className="font-bold not-italic">{r.username}: </span>
                            {/* FIX: Removed dangerouslySetInnerHTML */}
                            <span>{r.content}</span>
                          </div>
                        ))}
                      </div>
                      {user && (
                        <form onSubmit={(e) => postReview(e, course.id)} className="flex bg-gray-100 rounded-lg p-1">
                          <input name="content" placeholder="Add a review..." className="bg-transparent p-2 text-sm flex-grow focus:outline-none" required />
                          <button type="submit" className="bg-white px-3 py-1 rounded-md text-sm font-bold shadow-sm">Post</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === 'checkout' && selectedCourse && (
          <section className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-black mb-2">Complete Enrollment</h2>
            <p className="text-gray-500 mb-8">You are enrolling in: <span className="font-bold text-gray-900">{selectedCourse.title}</span></p>
            
            <form onSubmit={confirmEnrollment} className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-blue-800 uppercase text-xs">Course Price</span>
                <span className="text-4xl font-black text-blue-900">${selectedCourse.price}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400">Card Number</label>
                <input name="card_number" placeholder="4242 4242 4242 4242" className="w-full border-2 p-4 rounded-xl font-mono" required />
              </div>

              {/* FIX: Removed 'amount' input field. Price is managed by backend. */}

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setView('courses')} className="flex-grow bg-gray-100 p-4 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-grow bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200">Pay & Enroll</button>
              </div>
            </form>
          </section>
        )}

        {view === 'my-courses' && (
          <section>
            <h2 className="text-4xl font-bold mb-10">My Dashboard</h2>
            <div className="bg-white p-8 rounded-3xl shadow-xl mb-12 flex items-center space-x-10">
              <div className="text-center border-r pr-10">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Enrolled</p>
                <p className="text-5xl font-black text-blue-600">{myCourses.length}</p>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Welcome back, {user.username}!</h3>
                <p className="text-gray-500">Continue where you left off in your educational journey.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myCourses.map(course => (
                <div key={course.id} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{course.title}</h3>
                    <p className="text-gray-400 text-sm italic">Enrollment Verified</p>
                  </div>
                  <button className="bg-green-100 text-green-700 px-6 py-2 rounded-full font-bold">Access Course</button>
                </div>
              ))}
              {myCourses.length === 0 && <p className="text-center text-gray-400 italic py-10">You haven't enrolled in any courses yet.</p>}
            </div>
          </section>
        )}

        {view === 'admin' && (
          <section>
            <h2 className="text-4xl font-black mb-10">Platform Control Center</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white p-8 rounded-3xl shadow-lg border-b-8 border-blue-500">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Total Students</p>
                <p className="text-5xl font-black">{adminData.stats.total_users || 0}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-lg border-b-8 border-green-500">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Total Enrollments</p>
                <p className="text-5xl font-black">{adminData.stats.total_enrollments || 0}</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-lg border-b-8 border-yellow-500">
                <p className="text-gray-400 text-xs font-bold uppercase mb-2">Active Courses</p>
                <p className="text-5xl font-black">3</p>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <h3 className="text-2xl font-bold mb-6">User Management</h3>
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">ID</th>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Username</th>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Full Name</th>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminData.users.map(u => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="p-6 text-gray-500 font-mono">#{u.id}</td>
                          <td className="p-6 font-bold">{u.username}</td>
                          <td className="p-6">{u.full_name}</td>
                          <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-6">Enrollment Details</h3>
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Student</th>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Course</th>
                        <th className="p-6 font-bold uppercase text-xs text-gray-400">Revenue (Mocked)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminData.enrollments.map(e => (
                        <tr key={e.id} className="border-b hover:bg-gray-50">
                          <td className="p-6">
                            <p className="font-bold">{e.full_name}</p>
                            <p className="text-xs text-gray-400">@{e.username}</p>
                          </td>
                          <td className="p-6 font-semibold">{e.course_title}</td>
                          <td className="p-6 font-bold text-green-600">${e.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'login' && (
          <section className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-black mb-8 text-center">Login</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <input name="username" placeholder="Username" className="w-full border-2 p-4 rounded-xl" required />
              <input name="password" type="password" placeholder="Password" className="w-full border-2 p-4 rounded-xl" required />
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg">Access Dashboard</button>
            </form>
          </section>
        )}

        {view === 'register' && (
          <section className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-black mb-8 text-center">Join Us</h2>
            <form onSubmit={handleRegister} className="space-y-6">
              <input name="username" placeholder="Choose Username" className="w-full border-2 p-4 rounded-xl" required />
              <input name="password" type="password" placeholder="Create Password" className="w-full border-2 p-4 rounded-xl" required />
              <input name="full_name" placeholder="Full Name" className="w-full border-2 p-4 rounded-xl" required />
              <input name="email" type="email" placeholder="Email Address" className="w-full border-2 p-4 rounded-xl" required />
              <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg">Create Account</button>
            </form>
          </section>
        )}

        {view === 'profile' && profileData && (
          <section className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-2xl border-t-8 border-blue-500">
            <h2 className="text-3xl font-black mb-8">My Account</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Account ID</p>
                <p className="text-xl font-black">#{profileData.id}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Member Status</p>
                <p className="text-xl font-black text-blue-600 uppercase">{profileData.role}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Full Name</p>
                <p className="text-xl font-black">{profileData.full_name}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Email</p>
                <p className="text-xl font-black">{profileData.email}</p>
              </div>
            </div>
          </section>
        )}

        {view === 'premium' && (
          <section className="max-w-xl mx-auto bg-white p-10 rounded-3xl shadow-2xl text-center border-t-8 border-yellow-400">
            <h2 className="text-4xl font-black mb-4">Go Premium</h2>
            <p className="text-gray-500 mb-10">Access all courses and get a personalized certificate.</p>
            <div className="text-6xl font-black mb-10 text-gray-900">$99.99<span className="text-sm font-normal text-gray-400">/lifetime</span></div>
            <form onSubmit={buyPremium} className="space-y-6 text-left">
              <input name="card_number" placeholder="4242 4242 4242 4242" className="w-full border-2 p-4 rounded-xl font-mono" required />
              <button type="submit" className="w-full bg-yellow-400 text-yellow-900 p-4 rounded-xl font-black text-xl shadow-xl shadow-yellow-100">Unlock Everything</button>
            </form>
          </section>
        )}

      </main>

      <footer className="mt-20 p-12 text-center text-gray-400 text-sm border-t bg-white">
        &copy; 2026 MyEduConnect Platform. Built for Educational Vulnerability Testing.
      </footer>
    </div>
  );
}

export default App;
