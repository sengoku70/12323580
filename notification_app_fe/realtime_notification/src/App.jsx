// ============================================================
// notification_app_fe/realtime_notification/src/App.jsx
// ============================================================
// This is the main Frontend file using React.
// We are building a simple UI to:
// 1. Register with the Affordmed API
// 2. Authenticate and get a Bearer token
// 3. Display some test notifications
// ============================================================

import { useState } from 'react';
import './App.css';

// Import our custom logging middleware (since we use Vite, we can import from outside src!)
// Note: Depending on your Vite config, importing from outside src might require
// extra setup. If it fails, you can copy the logging_middleware into the src folder.
import { Log, setAuthToken, createLogger } from '../../../logging_middleware/index.js';

// Create a logger for the frontend stack
const logger = createLogger('frontend');

function App() {
  // --- STATE VARIABLES ---
  // We use these to keep track of what the user types in the form
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    mobileNo: '',
    githubUsername: '',
    rollNo: '',
    accessCode: ''
  });

  // We need to save the clientID and clientSecret after registration
  const [credentials, setCredentials] = useState({
    clientID: '',
    clientSecret: ''
  });

  // We save the token after successful login
  const [token, setToken] = useState('');
  
  // Status messages to show the user
  const [message, setMessage] = useState('');

  // --- HANDLE INPUT CHANGES ---
  // This updates our state whenever the user types in a text box
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // --- 1. REGISTRATION FUNCTION ---
  const handleRegister = async (e) => {
    e.preventDefault(); // Stop the page from reloading when submitting the form
    setMessage('Registering...');
    
    try {
      // Send the data to our Node.js backend (which then calls Affordmed)
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.clientID && data.clientSecret) {
        setMessage('Registration Successful! Now you can Login.');
        // Save the credentials we got back
        setCredentials({
          clientID: data.clientID,
          clientSecret: data.clientSecret
        });
      } else {
        setMessage('Registration failed. ' + JSON.stringify(data));
      }
    } catch (error) {
      setMessage('Error connecting to backend server.');
      console.error(error);
    }
  };

  // --- 2. LOGIN / AUTH FUNCTION ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('Logging in...');

    try {
      const response = await fetch('http://localhost:3000/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.access_token) {
        setMessage('Login Successful! Token received.');
        setToken(data.access_token);
        
        // --- IMPORTANT ---
        // We must set the auth token in our frontend logging middleware too!
        setAuthToken(data.access_token);
        
        // Send our first frontend log to the server
        await logger.info('component', 'User successfully logged in on frontend.');
      } else {
        setMessage('Login failed. ' + JSON.stringify(data));
      }
    } catch (error) {
      setMessage('Error connecting to backend server.');
      console.error(error);
    }
  };

  // --- 3. SEND A TEST LOG FUNCTION ---
  const handleTestLog = async () => {
    if (!token) {
      setMessage("You need to login first to get a token!");
      return;
    }
    setMessage("Sending test log...");
    
    // We send a 'debug' log from the 'page' package
    await logger.debug('page', 'Student clicked the Send Test Log button!');
    setMessage("Test log sent! Check the Affordmed dashboard.");
  };

  return (
    <div className="app-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial' }}>
      <h1>Campus Hiring Notification App</h1>
      
      {/* Show messages to the user */}
      {message && (
        <div style={{ padding: '10px', backgroundColor: '#e0f7fa', marginBottom: '20px', borderRadius: '5px' }}>
          <strong>Status:</strong> {message}
        </div>
      )}

      {/* --- REGISTRATION FORM --- */}
      <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
        <h2>Step 1: Register</h2>
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required />
          <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} required />
          <input type="text" name="mobileNo" placeholder="Mobile Number" value={formData.mobileNo} onChange={handleInputChange} required />
          <input type="text" name="githubUsername" placeholder="GitHub Username" value={formData.githubUsername} onChange={handleInputChange} required />
          <input type="text" name="rollNo" placeholder="Roll Number" value={formData.rollNo} onChange={handleInputChange} required />
          <input type="text" name="accessCode" placeholder="Access Code (from document)" value={formData.accessCode} onChange={handleInputChange} required />
          <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
            Register
          </button>
        </form>
      </div>

      {/* --- LOGIN FORM --- */}
      {/* We only show this if we got the credentials from Step 1 */}
      {credentials.clientID && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
          <h2>Step 2: Login</h2>
          <p>We received your Client ID and Secret! Click below to get the Auth Token.</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" value={credentials.clientID} readOnly />
            <input type="text" value={credentials.clientSecret} readOnly />
            <button type="submit" style={{ padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
              Login & Get Token
            </button>
          </form>
        </div>
      )}

      {/* --- TEST LOGGING BUTTON --- */}
      {token && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
          <h2>Step 3: Test Logging Middleware</h2>
          <p>You have the token. Try sending a log from the frontend!</p>
          <button onClick={handleTestLog} style={{ padding: '10px', backgroundColor: '#FF9800', color: 'white', border: 'none', cursor: 'pointer' }}>
            Send Test Log
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
