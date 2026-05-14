// ============================================================
// logging_middleware/loginmiddleware.js
// ============================================================
// This file simply re-exports everything from index.js.
// It exists so other parts of the project can import from
// either 'loginmiddleware.js' or 'index.js' — both will work.
// ============================================================

export { Log, setAuthToken, createLogger } from './index.js'
