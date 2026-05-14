// ============================================================
// logging_middleware/index.js
// ============================================================
// This is the MAIN file of our logging middleware package.
// It exports a single function called `Log` that can be used
// by BOTH the backend (Node.js) and the frontend (React/browser)
// to send structured log messages to the Affordmed evaluation API.
//
// Why do we need this?
//   - Instead of just using console.log() everywhere, we send
//     logs to a central server so the evaluators can track what
//     our app is doing at each stage.
//   - This makes debugging easier because all logs from frontend
//     AND backend go to one place.
// ============================================================

// ------------------------------------------------------------
// VALID VALUES — these are the only values the API will accept.
// Sending anything else will cause the API to reject our log.
// ------------------------------------------------------------

// Which part of the system sent this log?
const VALID_STACKS = ["backend", "frontend"];

// How serious is this log message?
// debug = just info for developers
// info  = normal operational message
// warn  = something might go wrong
// error = something went wrong but app still running
// fatal = something went wrong and app might crash
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];

// Which "package" (folder/module) inside the app sent this log?
// Backend-only packages:
const VALID_BE_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
];

// Frontend-only packages:
const VALID_FE_PACKAGES = ["api", "component", "hook", "page", "state", "style"];

// Packages that are valid in BOTH backend and frontend:
const VALID_SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

// Combine all valid packages into one big list for easy validation
const ALL_VALID_PACKAGES = [
  ...VALID_BE_PACKAGES,
  ...VALID_FE_PACKAGES,
  ...VALID_SHARED_PACKAGES,
];

// ------------------------------------------------------------
// CONFIGURATION — where to send the logs and how to auth
// ------------------------------------------------------------

// The Affordmed evaluation API endpoint for logs
const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";

// We store the Bearer token here so it can be set once and reused.
// The token is obtained by calling the /auth endpoint.
// It is VALID for 2 HOURS before you need to refresh it.
let authToken = null;

// ------------------------------------------------------------
// setAuthToken() — call this once at startup with your Bearer token
// ------------------------------------------------------------
// Parameters:
//   token (string) — the Bearer token from the /auth API response
//
// Example usage:
//   import { setAuthToken } from './index.js'
//   setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
// ------------------------------------------------------------
export function setAuthToken(token) {
  // Just save the token so the Log() function can use it later
  authToken = token;
  console.log("[logging_middleware] Auth token has been set.");
}

// ------------------------------------------------------------
// Log() — the MAIN function of this package!
// ------------------------------------------------------------
// This function sends a log message to the Affordmed evaluation API.
//
// Parameters:
//   stack   (string) — "backend" or "frontend"
//   level   (string) — "debug" | "info" | "warn" | "error" | "fatal"
//   pkg     (string) — which module/package is logging this
//   message (string) — the actual log message text
//
// Returns: a Promise that resolves when the log has been sent
//
// Example usage:
//   import { Log } from '../logging_middleware/index.js'
//   await Log("backend", "info", "route", "Server started on port 3000")
// ------------------------------------------------------------
export async function Log(stack, level, pkg, message) {
  // --- Step 1: Validate inputs before sending anything ---
  // We check each argument to make sure it's a valid value.
  // If something is wrong, we print a warning and skip the API call.

  if (!VALID_STACKS.includes(stack)) {
    console.warn(
      `[logging_middleware] Invalid stack: "${stack}". Must be one of: ${VALID_STACKS.join(", ")}`
    );
    return; // Stop here, don't send an invalid log
  }

  if (!VALID_LEVELS.includes(level)) {
    console.warn(
      `[logging_middleware] Invalid level: "${level}". Must be one of: ${VALID_LEVELS.join(", ")}`
    );
    return;
  }

  if (!ALL_VALID_PACKAGES.includes(pkg)) {
    console.warn(
      `[logging_middleware] Invalid package: "${pkg}". Must be one of: ${ALL_VALID_PACKAGES.join(", ")}`
    );
    return;
  }

  if (!message || typeof message !== "string") {
    console.warn("[logging_middleware] Message must be a non-empty string.");
    return;
  }

  // --- Step 2: Check that we have a token ---
  // Without a token, the API will reject our request with a 401 error.
  if (!authToken) {
    console.warn(
      "[logging_middleware] No auth token set! Call setAuthToken() first."
    );
    // We'll still try to send the log, but it will probably fail.
    // This helps developers realize they forgot to set the token.
  }

  // --- Step 3: Build the request body ---
  // The API expects this exact JSON structure
  const logPayload = {
    stack: stack,   // e.g., "backend"
    level: level,   // e.g., "info"
    package: pkg,   // e.g., "route"   (note: 'package' is a reserved word in JS, so we use 'pkg' as parameter name)
    message: message, // e.g., "Server started on port 3000"
  };

  // --- Step 4: Send the log to the API ---
  try {
    const response = await fetch(LOG_API_URL, {
      method: "POST", // We are SENDING data, so we use POST
      headers: {
        "Content-Type": "application/json", // Tell the server we're sending JSON
        Authorization: `Bearer ${authToken}`, // Our access token for authentication
      },
      body: JSON.stringify(logPayload), // Convert our JS object to a JSON string
    });

    // --- Step 5: Check the response ---
    if (!response.ok) {
      // response.ok is false if status code is 400, 401, 500, etc.
      console.error(
        `[logging_middleware] API responded with status ${response.status} for log: [${stack}][${level}][${pkg}] ${message}`
      );
    }
    // If successful, we don't need to do anything else.
    // The log has been recorded on the server.
  } catch (err) {
    // This catches network errors (e.g., server is down, no internet)
    console.error("[logging_middleware] Failed to send log to API:", err.message);
  }
}

// ------------------------------------------------------------
// createLogger() — a helper to create a pre-configured logger
// ------------------------------------------------------------
// Instead of always typing the stack name, you can create a
// logger that is already set to "backend" or "frontend".
//
// Example:
//   const logger = createLogger("backend")
//   await logger.info("route", "Server started!")
//   await logger.error("controller", "Something broke!")
// ------------------------------------------------------------
export function createLogger(stack) {
  // Return an object with methods for each log level
  // This makes it more convenient to use in your code
  return {
    debug: (pkg, message) => Log(stack, "debug", pkg, message),
    info:  (pkg, message) => Log(stack, "info",  pkg, message),
    warn:  (pkg, message) => Log(stack, "warn",  pkg, message),
    error: (pkg, message) => Log(stack, "error", pkg, message),
    fatal: (pkg, message) => Log(stack, "fatal", pkg, message),
  };
}

// Export a default object that contains everything for easy import
export default { Log, setAuthToken, createLogger };
