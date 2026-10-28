
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDR0bJYzDrEKW5Pb1BxQwLhHq_Yd5J-RkY",
  authDomain: "student-hub-14.firebaseapp.com",
  projectId: "student-hub-14",
  storageBucket: "student-hub-14.firebasestorage.app",
  messagingSenderId: "955278354069",
  appId: "1:955278354069:web:ab09932b0629683154dd9c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make Firebase available to the existing app without
// rewriting script.js.
window.studentHubFirebase = { app, auth, db };

console.log("Student Hub Firebase initialized successfully.");
