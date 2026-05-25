import React, { useState, useEffect } from 'react';

function App() {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [profileId, setProfileId] = useState(1);
  const [profileData, setProfileData] = useState(null);
  const [review, setReview] = useState('');

  const backendUrl = "http://localhost:8000";

  const handleSearch = async () => {
    // VULNERABILITY: SQL Injection happens in the backend via this query param
    const res = await fetch(`${backendUrl}/courses/search?q=${searchTerm}`);
    const data = await res.json();
    setCourses(data);
  };

  const fetchProfile = async () => {
    // VULNERABILITY: IDOR - Fetching any profile by ID
    const res = await fetch(`${backendUrl}/profile/${profileId}`);
    const data = await res.json();
    setProfileData(data);
  };

  const postReview = async (courseId) => {
    // VULNERABILITY: Stored XSS - Sending unsanitized input
    const formData = new FormData();
    formData.append('user_id', 1); // Mock user ID
    formData.append('content', review);
    await fetch(`${backendUrl}/courses/${courseId}/reviews`, {
      method: 'POST',
      body: formData
    });
    setReview('');
    alert('Review posted!');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>MyEduConnect - Vulnerable EdTech Platform</h1>
      
      <section>
        <h2>Course Search</h2>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          placeholder="Search courses..."
        />
        <button onClick={handleSearch}>Search</button>
        <ul>
          {courses.map(course => (
            <li key={course.id}>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <textarea 
                placeholder="Write a review..." 
                onChange={(e) => setReview(e.target.value)}
              />
              <button onClick={() => postReview(course.id)}>Post Review</button>
              
              <h4>Reviews:</h4>
              <ReviewsList courseId={course.id} backendUrl={backendUrl} />
            </li>
          ))}
        </ul>
      </section>

      <hr />

      <section>
        <h2>View Profile (IDOR Demo)</h2>
        <input 
          type="number" 
          value={profileId} 
          onChange={(e) => setProfileId(e.target.value)} 
        />
        <button onClick={fetchProfile}>View Profile</button>
        {profileData && (
          <div style={{ background: '#f0f0f0', padding: '10px' }}>
            <p>Username: {profileData.username}</p>
            <p>Full Name: {profileData.full_name}</p>
            <p>Email: {profileData.email}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewsList({ courseId, backendUrl }) {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch(`${backendUrl}/courses/${courseId}/reviews`)
      .then(res => res.json())
      .then(data => setReviews(data));
  }, [courseId, backendUrl]);

  return (
    <div>
      {reviews.map(r => (
        <div key={r.id} style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}>
          <strong>{r.username}: </strong>
          {/* VULNERABILITY: Stored XSS - Rendering raw HTML */}
          <span dangerouslySetInnerHTML={{ __html: r.content }} />
        </div>
      ))}
    </div>
  );
}

export default App;
