import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore, doc, setDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 YOUR CONFIG (already correct)
const firebaseConfig = {
  apiKey: "AIzaSyAqG5jyxQniu3sVK9c_PLE7acv5RtuJFO4",
  authDomain: "ff-arena-67782.firebaseapp.com",
  projectId: "ff-arena-67782",
  storageBucket: "ff-arena-67782.firebasestorage.app",
  messagingSenderId: "572073220842",
  appId: "1:572073220842:web:6e29ae6dc17751dfc25593"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth + DB
const auth = getAuth(app);
const db = getFirestore(app);

// ================= REGISTER =================
window.register = async function() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  if (!username) {
    alert("Enter game name");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);

    const user = userCred.user;

    // 🔥 SAVE USERNAME IN FIRESTORE
    await setDoc(doc(db, "users", user.uid), {
      wallet: 0,
      username: username
    });

    alert("Registered successfully!");

  } catch (e) {
    alert(e.message);
  }
};
// ================= LOGIN =================
window.login = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    await signInWithEmailAndPassword(auth, email, password);

    alert("✅ Login Success!");
    window.location.href = "index.html";
  } catch (error) {
    alert("❌ " + error.message);
  }
};
import { sendPasswordResetEmail } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔐 FORGOT PASSWORD
window.forgotPassword = async function() {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("Enter your email first");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("📧 Reset link sent!");
  } catch (e) {
    alert(e.message);
  }
};