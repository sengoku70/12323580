// ============================================================
// priority_inbox.js
// ============================================================
// Stage 6: Priority Inbox Implementation
// This is a simple newbie-friendly algorithm to sort notifications.
// It gives "Placement" the highest priority, then "Result", then "Event".
// If two notifications have the same type, the newer one wins.
// ============================================================

// A simple list of test notifications to try out our algorithm
const notifications = [
  { id: 1, type: "Event", message: "Hackathon tomorrow!", timestamp: 1682000000 },
  { id: 2, type: "Placement", message: "Google is hiring!", timestamp: 1682000100 },
  { id: 3, type: "Result", message: "Midterm results out.", timestamp: 1682000200 },
  { id: 4, type: "Placement", message: "Microsoft is hiring!", timestamp: 1682000300 },
];

/**
 * This function calculates a "priority score" for a single notification.
 * A higher score means it's more important and should show up first.
 */
function getPriorityScore(notification) {
  // 1. Give each type a weight. Bigger numbers are more important.
  let typeWeight = 0;
  
  if (notification.type === "Placement") {
    typeWeight = 3; // Most important!
  } else if (notification.type === "Result") {
    typeWeight = 2; // Important
  } else if (notification.type === "Event") {
    typeWeight = 1; // Least important
  }

  // 2. We multiply the typeWeight by a HUGE number.
  // This makes sure that ANY Placement (even an old one) 
  // will have a bigger score than ANY Result.
  // Then we just add the timestamp to sort newest-first within the same type.
  const score = (typeWeight * 10000000000) + notification.timestamp;
  
  return score;
}

/**
 * This function takes a list of notifications, calculates their scores,
 * and sorts them from highest score to lowest score.
 */
function sortNotificationsByPriority(notifList) {
  // We use the built-in .sort() method in JavaScript
  return notifList.sort((a, b) => {
    const scoreA = getPriorityScore(a);
    const scoreB = getPriorityScore(b);

    // We want the HIGHEST score first, so we do scoreB - scoreA
    return scoreB - scoreA;
  });
}

// --- Let's test it out! ---
console.log("=== Before Sorting ===");
console.log(notifications.map(n => `${n.type}: ${n.message}`));

const sorted = sortNotificationsByPriority(notifications);

console.log("\n=== After Priority Sorting ===");
console.log(sorted.map(n => `${n.type}: ${n.message}`));

// If you just want the top 10, you can do:
// const top10 = sorted.slice(0, 10);
