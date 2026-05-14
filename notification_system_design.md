# Notification System Design
**Campus Hiring Notification Platform — Affordmed Evaluation**

---

# Stage 1

## REST API Design for Campus Notification Platform

The notification platform allows students to receive real-time updates about Placements, Events, and Results. Below are the REST API endpoints, their request/response structures, and headers.

---

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints (except login/register) require a Bearer token in the `Authorization` header.

---

### Endpoints

#### 1. Get All Notifications
Fetches paginated list of notifications for the currently logged-in student.

**Endpoint:**
```
GET /notifications
```

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Query Parameters:**
| Parameter         | Type   | Required | Description                              |
|-------------------|--------|----------|------------------------------------------|
| page              | number | No       | Page number (default: 1)                 |
| limit             | number | No       | Number of results per page (default: 10) |
| notification_type | string | No       | Filter: "Placement", "Event", "Result"   |
| is_read           | boolean| No       | Filter unread notifications              |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Placement",
        "message": "TCS is hiring! Apply before May 30.",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:30Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 97,
      "limit": 10
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized. Please login again."
}
```

---

#### 2. Get Single Notification
Fetches details of a specific notification and marks it as read.

**Endpoint:**
```
GET /notifications/:id
```

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
    "type": "Placement",
    "message": "TCS is hiring! Apply before May 30.",
    "isRead": true,
    "createdAt": "2026-04-22T17:51:30Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Notification not found."
}
```

---

#### 3. Mark Notification as Read
Marks a specific notification as read without fetching full details.

**Endpoint:**
```
PATCH /notifications/:id/read
```

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read."
}
```

---

#### 4. Mark All Notifications as Read

**Endpoint:**
```
PATCH /notifications/read-all
```

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

---

#### 5. Create Notification (Admin/HR only)
Allows HR to broadcast a new notification to students.

**Endpoint:**
```
POST /notifications
```

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "type": "Placement",
  "message": "Infosys campus drive on June 5th. Register now!",
  "targetStudentIds": ["all"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Notification sent to 50000 students.",
  "notificationId": "abc123-def456"
}
```

---

### Real-Time Notification Mechanism

For real-time delivery, we use **WebSockets** via **Socket.io**:

1. When a student logs in, their frontend connects to the WebSocket server.
2. The student joins a room named after their `studentId`.
3. When HR sends a notification, the backend emits a `new_notification` event to all connected student rooms.
4. The frontend listens for this event and shows a toast/badge immediately — no page refresh needed.

**WebSocket Events:**
```
Client → Server:  "join"              { studentId: "s1042" }
Server → Client:  "new_notification"  { id, type, message, createdAt }
```

---

# Stage 2

## Persistent Storage Design

### Recommended Database: PostgreSQL (Relational)

**Why PostgreSQL?**
- Notifications have a clear structure (id, type, message, studentId, timestamps) — perfect for relational tables.
- We need to filter by `studentId`, `type`, `isRead`, and sort by `createdAt` — SQL handles this efficiently.
- PostgreSQL supports JSONB for flexible metadata if we need it later.
- It scales well with proper indexing for millions of rows.

---

### Database Schema

```sql
-- Students table: stores all registered students
CREATE TABLE students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  rollNo      VARCHAR(50) UNIQUE NOT NULL,
  createdAt   TIMESTAMP DEFAULT NOW()
);

-- Notifications table: one row per notification per student
CREATE TABLE notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notificationType   VARCHAR(50) NOT NULL CHECK (notificationType IN ('Placement', 'Event', 'Result')),
  message            TEXT NOT NULL,
  isRead             BOOLEAN DEFAULT FALSE,
  createdAt          TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup of a student's unread notifications
CREATE INDEX idx_notifications_student_isread
  ON notifications (studentId, isRead, createdAt DESC);

-- Index for filtering by notification type
CREATE INDEX idx_notifications_type
  ON notifications (notificationType, createdAt DESC);
```

---

### Problems as Data Volume Increases

| Problem | Description |
|---|---|
| Slow queries | Without indexes, `SELECT WHERE studentId=...` scans the full table |
| Storage bloat | 50k students × 5M notifications = very large table |
| Write bottleneck | Bulk inserts (50k rows at once) block reads |
| Connection limits | Too many concurrent DB connections exhaust resources |

### Solutions
1. **Partitioning** — Partition the `notifications` table by `createdAt` month. Old data in separate partitions can be archived cheaply.
2. **Read replicas** — Route all `SELECT` queries to replica DBs, writes only to primary.
3. **Connection pooling** — Use PgBouncer to reuse DB connections instead of creating new ones.
4. **Archiving** — Move notifications older than 90 days to a cold storage table.

---

### SQL Queries Based on Stage 1 API

```sql
-- GET /notifications?page=1&limit=10 (for studentId = 's1042')
SELECT id, notificationType, message, isRead, createdAt
FROM notifications
WHERE studentId = 's1042'
ORDER BY createdAt DESC
LIMIT 10 OFFSET 0;

-- GET /notifications?notification_type=Placement
SELECT id, notificationType, message, isRead, createdAt
FROM notifications
WHERE studentId = 's1042' AND notificationType = 'Placement'
ORDER BY createdAt DESC
LIMIT 10 OFFSET 0;

-- PATCH /notifications/:id/read
UPDATE notifications
SET isRead = TRUE
WHERE id = 'd146095a-0d86-4a34-9e69-3900a14576bc' AND studentId = 's1042';

-- PATCH /notifications/read-all
UPDATE notifications
SET isRead = TRUE
WHERE studentId = 's1042' AND isRead = FALSE;
```

---

# Stage 3

## Query Analysis & Optimization

### The Original Query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Is This Query Accurate?
**Mostly yes**, but there is a minor issue:
- `SELECT *` fetches ALL columns (including large `message` TEXT fields) even when the frontend may only need `id`, `type`, and `createdAt`. This wastes network bandwidth and memory.
- Better to use `SELECT id, notificationType, message, isRead, createdAt`.

### Why Is It Slow?
Without an index on `(studentID, isRead, createdAt)`, PostgreSQL performs a **full table scan** — it reads every single row in the `notifications` table to find matches. With 5,000,000 rows, this is extremely slow.

### What Would We Change?
```sql
-- Step 1: Add a composite index (if not already present)
CREATE INDEX idx_notifications_student_isread_date
  ON notifications (studentID, isRead, createdAt ASC);

-- Step 2: Rewrite the query to be more selective
SELECT id, notificationType, message, isRead, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC
LIMIT 20; -- Always paginate!
```

**Likely computation cost after indexing:**
- Before index: O(n) full table scan — ~5M row reads
- After index: O(log n + k) — ~log(5M) ≈ 23 steps to find first match, then k rows for this student

### Is Adding Indexes on Every Column a Good Idea?
**No!** Here's why:
- Every index takes up disk space and RAM.
- Every `INSERT`, `UPDATE`, `DELETE` must also update ALL indexes — this slows down writes dramatically.
- The HR's "Notify All" (50k inserts) would become extremely slow.
- Only index columns that are actually used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

### Query: Find All Students with Placement Notifications in the Last 7 Days
```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

With index on `(notificationType, createdAt)`, this is fast even at 5M rows.

---

# Stage 4

## Caching Strategy for Notification Fetches

### The Problem
Every page load triggers `SELECT * FROM notifications WHERE studentId = ...`. With 50,000 concurrent students, this is 50,000 DB queries per page load — the DB cannot handle this.

### Proposed Solutions

#### Solution 1: In-Memory Cache (Redis)
- After the first DB fetch, store the result in Redis with a key like `notifications:studentId:1042`.
- Set a TTL (Time To Live) of 60 seconds.
- Subsequent requests within 60 seconds read from Redis (microseconds) instead of PostgreSQL (milliseconds).

**Tradeoffs:**
| Pro | Con |
|---|---|
| Extremely fast (sub-millisecond reads) | Data can be stale by up to 60 seconds |
| Reduces DB load by 90%+ | Requires extra infrastructure (Redis server) |
| Scales horizontally | Cache invalidation is hard (when does it refresh?) |

**Cache Invalidation Strategy:**
- When HR sends a new notification, delete the cache for ALL affected students.
- When a student reads a notification, delete their specific cache key so next request reflects updated `isRead`.

#### Solution 2: HTTP Cache-Control Headers
- Set `Cache-Control: max-age=30` on the notifications API response.
- Browser caches the response and doesn't even hit the server for 30 seconds.

**Tradeoffs:**
| Pro | Con |
|---|---|
| Zero infrastructure cost | Can't invalidate per-student (affects all users) |
| Works automatically in browsers | New notifications won't appear for up to 30s |

#### Solution 3: Pagination + Cursor-Based Loading
- Never load all notifications at once. Load only the latest 10.
- Use a cursor (last seen `createdAt`) to load more on scroll.
- Reduces data transferred per request by 90%.

**Tradeoffs:**
| Pro | Con |
|---|---|
| Dramatically reduces payload size | Harder to implement than offset pagination |
| Works without caching infrastructure | Can't jump to arbitrary pages |

### Recommended Approach
Combine **Redis** + **Cursor Pagination**. Redis handles repeated reads, cursor pagination keeps each query small.

---

# Stage 5

## Scaling "Notify All" for 50,000 Students

### The Problem with the Pseudocode
```javascript
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)        // synchronous!
    send_in_app_notification(student_id, message) // synchronous!
```

**Issues:**
1. **Synchronous loop** — sends emails one-by-one. If each email takes 100ms, 50,000 emails = 5,000 seconds (83 minutes!). The HR waits forever.
2. **No error handling** — if one email fails, does the whole loop stop?
3. **No retry logic** — failed notifications are silently lost.
4. **Single point of failure** — if the email server goes down mid-loop, we lose track of progress.
5. **Blocks the server** — the HTTP request to `/notify-all` would time out (servers usually timeout after 30s).

### Recommended Architecture: Message Queue (Bull/BullMQ + Redis)

```
HR clicks "Notify All"
         │
         ▼
Backend receives request
         │
         ├─ Immediately responds: "Notification job queued!" ✓
         │
         ▼
Push ONE JOB to Redis Queue (Bull)
         │
         ▼
Worker processes queue in BATCHES (e.g., 500 students at a time)
         │
         ├── Batch 1: students 1–500   → email API + socket emit
         ├── Batch 2: students 501–1000 → email API + socket emit
         └── ... (100 batches total for 50k students)
         │
         ▼
If batch fails → automatic retry with exponential backoff
```

**Why this is better:**
| Feature | Pseudocode Approach | Queue Approach |
|---|---|---|
| HR wait time | 83 minutes | Instant response |
| Error handling | None | Auto-retry per batch |
| Scalability | 1 thread | Add more workers |
| Visibility | None | Dashboard shows progress |
| Reliability | Loses progress on crash | Queue persists to Redis |

---

# Stage 6

## Priority Inbox — Top 10 Notifications Algorithm

### Problem Statement
Display the top 10 most important notifications first. Priority is determined by:
1. **Type weight**: Placement (3) > Result (2) > Event (1)
2. **Recency**: More recent notifications rank higher within the same type

### Approach: Priority Score Formula

For each notification, calculate a score:
```
score = typeWeight × 10^10 + unixTimestamp
```

This ensures type always dominates, but within the same type, newer notifications rank higher.

### Implementation (JavaScript)
See `priority_inbox.js` in the repository root.

### Maintaining Top 10 as New Notifications Arrive
Use a **Min-Heap of size 10**:
1. Start with the first 10 notifications in the heap.
2. For each new notification: if its score > heap minimum → pop minimum, push new one.
3. Time complexity: O(n log 10) ≈ O(n) — much better than sorting all n notifications each time.
