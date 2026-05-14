// ============================================================
// notification_app_be/server.js
// ============================================================
// This is the main server file for our backend application.
// We are using Express, which is a popular web framework for Node.js.
// ============================================================

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // We need this to make HTTP requests from Node
// Import our custom logging middleware!
import { Log, setAuthToken, createLogger } from '../logging_middleware/index.js';

const app = express();
const PORT = 3000;

// The base URL for the Affordmed evaluation API
const EVAL_API_BASE = 'http://4.224.186.213';

// Create a logger specifically for the backend stack
const logger = createLogger('backend');

// Middleware
app.use(cors()); // Allows our React frontend to talk to this backend
app.use(express.json()); // Allows Express to understand JSON data in the request body

// ============================================================
// 1. REGISTRATION ENDPOINT
// ============================================================
// The frontend will call this to register the student.
app.post('/register', async (req, res) => {
  try {
    // We expect these EXACT fields from the frontend
    const { email, name, mobileNo, githubUsername, rollNo, accessCode } = req.body;

    console.log("Attempting to register with Affordmed API...");
    
    // Call the Affordmed Evaluation API to register
    const response = await fetch(`${EVAL_API_BASE}/evaluation-service/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        name: name,
        mobileNo: mobileNo,
        githubUsername: githubUsername,
        rollNo: rollNo,
        accessCode: accessCode
      })
    });

    const data = await response.json();
    
    // If we have an auth token set, let's log this action!
    await logger.info('route', `Registration attempted for ${email}`);
    
    // Send the Affordmed API response back to our frontend
    res.json(data);
  } catch (error) {
    console.error("Registration error:", error);
    await logger.error('route', `Registration failed: ${error.message}`);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ============================================================
// 2. AUTHENTICATION ENDPOINT
// ============================================================
// We need to call this to get a Bearer token, which is required
// for sending logs later.
app.post('/auth', async (req, res) => {
  try {
    // The Affordmed API requires clientID and clientSecret
    // You get these AFTER you successfully register!
    const { clientID, clientSecret } = req.body;

    const response = await fetch(`${EVAL_API_BASE}/evaluation-service/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientID: clientID,
        clientSecret: clientSecret
      })
    });

    const data = await response.json();
    
    // If the API gave us an access_token, we must SAVE IT in our logging middleware!
    if (data && data.access_token) {
      console.log("Successfully got auth token! Setting it in logging_middleware...");
      setAuthToken(data.access_token);
      
      // Now that we have a token, we can finally send a success log!
      await logger.info('auth', 'Backend successfully authenticated and received token.');
    }

    // Send the token back to the frontend too, just in case they need it
    res.json(data);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

// ============================================================
// 3. TEST ENDPOINT (Just to check if server is running)
// ============================================================
app.get('/test', async (req, res) => {
  // Let's log that someone hit the test endpoint
  await logger.debug('route', 'Test endpoint was accessed');
  res.send('Backend is running properly! Ready for evaluation.');
});

// ============================================================
// START THE SERVER
// ============================================================
app.listen(PORT, async () => {
  console.log(`🚀 Backend Server is running on http://localhost:${PORT}`);
  // We can't log to the API yet because we don't have a token on startup!
  // We must call /auth first.
});