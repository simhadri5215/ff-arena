let currentChatUser = null;
const ADMIN_EMAIL = "kodinanikodinani123@gmail.com";
const BASE_URL = "https://ff-arena.onrender.com";

// 🔥 IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, doc, getDoc, updateDoc, addDoc, collection, getDocs, setDoc, deleteDoc,
  query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔥 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAqG5jyxQniu3sVK9c_PLE7acv5RtuJFO4",
  authDomain: "ff-arena-67782.firebaseapp.com",
  projectId: "ff-arena-67782"
};

// 🔥 INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

let wallet = 0;
let userId = null;

// ================= LOGIN =================
onAuthStateChanged(auth, async (authUser) => {
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  userId = authUser.uid;

  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      wallet: 0,
      username: authUser.email.split("@")[0],
      wins: 0
    });
  }

  loadWallet();
  loadMatches("ongoing");

  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) {
    adminPanel.style.display =
      authUser.email === ADMIN_EMAIL ? "block" : "none";
  }
});

// ================= WALLET =================
async function loadWallet() {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return;

  const data = snap.data();
  wallet = data.wallet || 0;

  document.getElementById("walletAmount").innerText = wallet;

  const userEl = document.getElementById("userIdText");
  if (userEl) userEl.innerText = data.username || "Player";
}

// ================= UI =================
window.toggleWallet = function() {
  const el = document.getElementById("walletMenu");
  if (!el) return;
  el.style.display = (el.style.display === "block") ? "none" : "block";
};

window.toggleProfile = function() {
  const el = document.getElementById("profileMenu");
  if (!el) return;
  el.style.display = (el.style.display === "block") ? "none" : "block";
};

// ================= MATCHES =================
window.loadMatches = async function(type) {
  const snapshot = await getDocs(collection(db, "matches"));
  let html = "";

  snapshot.forEach(docSnap => {
    const m = docSnap.data();

    if (m.status !== type) return;

    const now = Date.now();
    const matchTime = m.time || 0;
    const diff = matchTime - now;

    let timerText = "";
    let isOver = false;

    if (!matchTime) {
      timerText = "⚠️ No Time Set";
    } else if (diff <= 0) {
      timerText = "⛔ Match Over";
      isOver = true;
    } else {
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timerText = `⏳ ${hours}h ${mins}m ${secs}s`;
    }

    html += `
      <div class="match-card">

        <h3>${m.title}</h3>

        ${m.winner ? `<p>🏆 Winner: ${m.winner}</p>` : ""}

        <p>📅 ${matchTime ? new Date(matchTime).toLocaleString() : "Not Set"}</p>
        <p>${timerText}</p>

        <p>💰 Prize ₹${m.prize}</p>
        <p>🎫 Entry ₹${m.entry}</p>
        <p>👥 ${m.players}/${m.maxPlayers}</p>

        ${m.joinedUsers && m.joinedUsers.includes(userId) ? `
          <div style="background:#222; padding:10px; margin-top:10px; border-radius:8px;">
            
            <p>
              🎮 Room ID: ${m.roomId || "Not set"}
              <button onclick="copyText('${m.roomId}')">📋 Copy</button>
            </p>

            <p>
              🔑 Password: ${m.roomPass || "Not set"}
              <button onclick="copyText('${m.roomPass}')">📋 Copy</button>
            </p>

          </div>
        ` : ""}

        ${auth.currentUser?.email === ADMIN_EMAIL && m.playerNames 
          ? Object.values(m.playerNames).map(n => `<p>🎮 ${n}</p>`).join("") 
          : ""}

        ${m.results ? m.results.map(p => `
          <p>
            ${p.position === 1 ? "🥇" : p.position === 2 ? "🥈" : p.position === 3 ? "🥉" : ""}
            ${p.name} - ${p.kills} kills
          </p>
        `).join("") : ""}

        ${auth.currentUser?.email === ADMIN_EMAIL ? `
          <button onclick="editMatch('${docSnap.id}')">✏️ Edit</button>

          <button onclick="openResultPanel('${docSnap.id}')">📊 Enter Results</button>
        ` : ""}

        ${
          isOver && auth.currentUser?.email === ADMIN_EMAIL
          ? `<button onclick="deleteMatch('${docSnap.id}')">🗑 Delete</button>`
          : `<button onclick="joinMatch('${docSnap.id}', ${m.entry})">Join</button>`
        }

      </div>
    `;
  });

  document.getElementById("matches").innerHTML = html;
};
// ================= JOIN =================
window.joinMatch = async function(matchId, entryFee) {

  const gameName = prompt("Enter your Game Name:");
  if (!gameName || gameName.length < 3) {
  alert("Enter valid name ❌");
  return;
}
const q = query(collection(db, "users"), where("username", "==", gameName));
const snapCheck = await getDocs(q);

if (!snapCheck.empty) {
  alert("Name already taken ❌");
  return;
}

  if (!gameName || !gameName.trim()) {
    alert("Game name required");
    return;
  }

  if (wallet < entryFee) {
    alert("Not enough balance");
    return;
  }

  const ref = doc(db, "matches", matchId);
  const snap = await getDoc(ref);
  const data = snap.data();
  if (data.joinedUsers && data.joinedUsers.includes(userId)) {
  alert("You already joined ❌");
  return;
}

  // 🔥 CHECK MATCH TIME
  const now = Date.now();
  if (data.time && now >= data.time) {
    alert("Match already started ❌");
    return;
  }
  
  // BONUS: If you want to block entries 5 mins before, you can use this instead:
  // if (data.time && now >= data.time - (5 * 60 * 1000)) {
  //   alert("Entry closed ❌");
  //   return;
  // }

  if (data.players >= data.maxPlayers) {
    alert("Match Full");
    return;
  }

  // already joined
  if (data.joinedUsers?.includes(userId)) {
    showRoom(data);
    return;
  }

  // update
  await updateDoc(ref, {
    players: data.players + 1,
    joinedUsers: [...(data.joinedUsers || []), userId],
    playerNames: {
      ...(data.playerNames || {}),
      [userId]: gameName.trim()
    }
  });

  wallet -= entryFee;
  await updateDoc(doc(db, "users", userId), { wallet });

  // 🔥 FIX: GET UPDATED MATCH DATA
  const updatedSnap = await getDoc(ref);
  const updatedData = updatedSnap.data();

  alert("✅ Joined");

  showRoom(updatedData); // ✅ now correct

  loadWallet();
  loadMatches("ongoing");
};


// ================= CREATE MATCH =================
window.createMatch = async function() {
  const timeValue = mTime.value;

  if (!timeValue) {
    alert("Please select date & time");
    return;
  }

  await addDoc(collection(db, "matches"), {
    title: mTitle.value,
    time: new Date(timeValue).getTime(),
    prize: Number(mPrize.value),
    entry: Number(mEntry.value),
    mode: mMode.value,
    map: mMap.value,
    maxPlayers: Number(mMax.value),
    players: 0,
    status: mStatus.value,
    roomId: mRoomId.value,
    roomPass: mRoomPass.value,
    joinedUsers: [],
    playerNames: {},
  });

  alert("✅ Match Created");
};

// ================= EDIT MATCH =================
window.editMatch = async function(id) {

  const title = prompt("Match name:");
  const prize = prompt("Prize:");
  const entry = prompt("Entry fee:");
  const max = prompt("Max players:");

  // 🔥 IMPORTANT FIX
  const roomIdInput = prompt("Room ID:");
  const roomPassInput = prompt("Room Password:");

  // get existing data
  const ref = doc(db, "matches", id);
  const snap = await getDoc(ref);
  const old = snap.data();

  // 🔥 SAFE UPDATE (keeps old value if empty)
  const roomId = roomIdInput ? roomIdInput : old.roomId;
  const roomPass = roomPassInput ? roomPassInput : old.roomPass;

  await updateDoc(ref, {
    title: title || old.title,
    prize: Number(prize) || old.prize,
    entry: Number(entry) || old.entry,
    maxPlayers: Number(max) || old.maxPlayers,
    roomId: roomId,
    roomPass: roomPass
  });

  alert("✅ Match Updated");

  loadMatches("ongoing");
};

// ================= PROFILE =================
window.openProfile = async function() {
  const snap = await getDoc(doc(db, "users", userId));
  const d = snap.data();

  document.getElementById("profilePage").style.display = "block";
  profileName.innerText = d.username;
  profileWallet.innerText = d.wallet;
  profileWins.innerText = d.wins;
  profileId.innerText = userId;
};

// ================= LOGOUT =================
window.logout = async function() {
  await signOut(auth);
  window.location.href = "login.html";
};

// ================= DEPOSIT & RAZORPAY =================
window.addMoney = async function() {
  const amount = Number(document.getElementById("depositAmount").value);

  if (!amount || amount < 40) {
    alert("Minimum ₹40 required");
    return;
  }

  try {
    const res = await ffetch("https://your-backend.onrender.com/create-order", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ amount: amount * 100 })
    });

    let order;
    try {
      order = await res.json();
    } catch {
      alert("❌ Backend error. Restart server.");
      return;
    }

    new Razorpay({
      key: "rzp_live_SjLhqPai5YkEF5",
      amount: order.amount,
      order_id: order.id,
      handler: async function () {
        wallet += amount;
        await updateDoc(doc(db, "users", userId), { wallet });

        await addDoc(collection(db, "transactions"), {
          userId,
          type: "deposit",
          amount,
          time: new Date()
        });

        loadWallet();
        alert("Payment Successful");
      }
    }).open();

  } catch (err) {
    console.log(err);
    alert("Payment Failed");
  }
};

window.loadTransactions = async function() {
  const snapshot = await getDocs(collection(db, "transactions"));
  let html = "";
  snapshot.forEach(docSnap => {
    const t = docSnap.data();
    if (t.userId !== userId) return;
    html += `<div>${t.type} ₹${t.amount}</div>`;
  });
  document.getElementById("transactions").innerHTML = html;
};

window.loadLeaderboard = async function() {
  const snapshot = await getDocs(collection(db, "users"));
  let users = [];
  snapshot.forEach(docSnap => { users.push(docSnap.data()); });
  users.sort((a, b) => (b.wins || 0) - (a.wins || 0));
  let html = "";
  users.slice(0, 20).forEach((u, i) => {
    html += `<div>#${i+1} ${u.username} - ₹${u.wins || 0}</div>`;
  });
  document.getElementById("leaderboard").innerHTML = html;
  console.log("DEBUG HIT HERE");
};

window.requestWithdraw = async function() {
  const amount = Number(document.getElementById("withdrawAmount").value);
  const upi = document.getElementById("upiId").value;

 if (amount < 40) {
  alert("Minimum withdrawal is ₹40 ❌");
  return;
}
  if (!upi) {
    alert("Enter UPI");
    return;
  }
  if (wallet < amount) {
    alert("Not enough balance");
    return;
  }

  await addDoc(collection(db, "withdrawals"), {
    userId,
    amount,
    upi,
    status: "pending",
    time: new Date()
  });

  alert("Withdraw Requested");
};

window.deleteMatch = async function(matchId) {

  if (!confirm("Delete this match?")) return;

  try {

    const res = await fetch(`${BASE_URL}/delete-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        matchId: matchId,
        email: auth.currentUser.email
      })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Match deleted");
      loadMatches("ongoing");
    } else {
      alert("❌ Failed: " + (data.error || "Error"));
    }

  } catch (err) {
    console.log(err);
    alert("Server not reachable");
  }
};

window.loadWithdrawals = async function() {
  if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
    alert("Admin only");
    return;
  }

  const snapshot = await getDocs(collection(db, "withdrawals"));
  let html = "";
  snapshot.forEach(docSnap => {
    const w = docSnap.data();
    html += `
      <div style="border:1px solid #444; padding:10px; margin:5px;">
        <p>👤 ${w.userId}</p>
        <p>💰 ₹${w.amount}</p>
        <p>📱 ${w.upi}</p>
        <p>📌 Status: ${w.status}</p>
        ${w.status === "pending" ? `
          <button onclick="approveWithdraw('${docSnap.id}', '${w.userId}', ${w.amount})">✅ Approve</button>
          <button onclick="rejectWithdraw('${docSnap.id}')">❌ Reject</button>
        ` : ""}
      </div>
    `;
  });
  document.getElementById("withdrawList").innerHTML = html;
};

window.approveWithdraw = async function(id, uid, amount) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  if ((data.wallet || 0) < amount) {
    alert("User has insufficient balance");
    return;
  }

  await updateDoc(userRef, { wallet: data.wallet - amount });
  await updateDoc(doc(db, "withdrawals", id), { status: "approved" });

  alert("Approved");
  loadWithdrawals();
};

window.rejectWithdraw = async function(id) {
  await updateDoc(doc(db, "withdrawals", id), { status: "rejected" });
  alert("Rejected");
  loadWithdrawals();
};

window.givePrize = async function() {

  const uid = document.getElementById("winnerId").value;
  const amount = Number(document.getElementById("prizeAmount").value);

  if (!uid || !amount) {
    alert("Enter user ID and amount");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/give-prize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uid: uid,
        amount: amount,
        email: auth.currentUser.email // 🔥 IMPORTANT
      })
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Prize given successfully");
    } else {
      alert("❌ Failed: " + (data.error || "Error"));
    }

  } catch (err) {
    console.log(err);
    alert("Server error");
  }
};

function showRoom(m) {

  if (!m.roomId || !m.roomPass) {
    alert("❌ Room not set by admin yet");
    return;
  }

  alert(
    "🎮 ROOM DETAILS\n\n" +
    "Room ID: " + m.roomId + "\n" +
    "Password: " + m.roomPass
  );
}

window.copyText = function(text) {

  if (!text || text === "Not set") {
    alert("Nothing to copy");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      alert("✅ Copied: " + text);
    })
    .catch(() => {
      alert("❌ Copy failed");
    });
};

window.updateMatch = async function() {

  if (!editingMatchId) return;

  const ref = doc(db, "matches", editingMatchId);
  const snap = await getDoc(ref);
  const old = snap.data();

  await updateDoc(ref, {
    title: eTitle.value || old.title,
    prize: ePrize.value === "" ? old.prize : Number(ePrize.value),
    entry: eEntry.value === "" ? old.entry : Number(eEntry.value), // ✅ FIX
    maxPlayers: eMax.value === "" ? old.maxPlayers : Number(eMax.value),
    roomId: eRoomId.value || old.roomId,
    roomPass: eRoomPass.value || old.roomPass
  });

  alert("✅ Match Updated");

  closeEdit();
  loadMatches("ongoing");
};

setInterval(async function () {

  const snapshot = await getDocs(collection(db, "matches"));
  const now = Date.now();

  snapshot.forEach(async function (docSnap) {

    const m = docSnap.data();

    // skip if no time
    if (!m.time) {
      return;
    }

    const startTime = m.time;
    const endTime = m.time + (10 * 60 * 1000); // 10 minutes

    // 🔥 upcoming → ongoing
    if (now >= startTime && now < endTime && m.status === "upcoming") {
      await updateDoc(doc(db, "matches", docSnap.id), {
        status: "ongoing"
      });
    }

    // 🔥 ongoing → resulted
    if (now >= endTime && m.status !== "resulted") {
      await updateDoc(doc(db, "matches", docSnap.id), {
        status: "resulted"
      });
    }

  });

}, 10000); // every 10 seconds

// ================= CHAT SYSTEM =================

// open chat
window.openChat = function() {
  const box = document.getElementById("chatBox");

  if (!box) {
    alert("Chat UI not found");
    return;
  }

  box.style.display = box.style.display === "flex" ? "none" : "flex";

  loadChat();
};

// send message (player)
window.sendMessage = async function() {

  const text = chatInput.value.trim();
  if (!text) return;

  // 🔥 mark unread for admin
  await setDoc(doc(db, "chats", userId), {
    lastMessage: text,
    updatedAt: new Date(),
    adminSeen: false   // 🔥 IMPORTANT
  }, { merge: true });

  await addDoc(collection(db, "chats", userId, "messages"), {
    sender: "user",
    text,
    time: new Date()
  });

  chatInput.value = "";
};
// load chat (real-time)
function loadChat() {

  const q = query(
    collection(db, "chats", userId, "messages"),
    orderBy("time")
  );

  onSnapshot(q, (snapshot) => {

    let html = "";

    snapshot.forEach(doc => {
      const m = doc.data();

      html += `
        <div style="text-align:${m.sender === "user" ? "right" : "left"};">
          <p>${m.text}</p>
        </div>
      `;
    });

    const chatBox = document.getElementById("chatMessages");
    if (chatBox) {
      chatBox.innerHTML = html;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
};

// load users (admin panel)
window.loadUsers = async function() {

  if (auth.currentUser.email !== ADMIN_EMAIL)
    return alert("Admin only");

  const snapshot = await getDocs(collection(db, "chats"));

  let html = "";

  snapshot.forEach(docSnap => {

    const data = docSnap.data();

    // 🔥 show ONLY users who have unread messages
    if (data.adminSeen === false) {

      html += `
        <div onclick="openAdminChat('${docSnap.id}')">
          🔴 ${docSnap.id}
        </div>
      `;
    }
  });

  userList.innerHTML = html || "No new messages";
};
window.openAdminChat = function(uid) {

  console.log("Opening chat:", uid); // debug

  currentChatUser = uid;

  const box = document.getElementById("adminChatBox");
  if (!box) {
    alert("Admin chat UI missing");
    return;
  }

  box.style.display = "block";

  document.getElementById("chatUser").innerText = "Chat: " + uid;

  const q = query(
    collection(db, "chats", uid, "messages"),
    orderBy("time")
  );

  onSnapshot(q, (snapshot) => {

    let html = "";

    snapshot.forEach(doc => {
      const m = doc.data();

      html += `
        <div style="text-align:${m.sender === "admin" ? "right" : "left"};">
          <p>${m.text}</p>
        </div>
      `;
    });

    const msgBox = document.getElementById("adminMessages");
    if (msgBox) {
      msgBox.innerHTML = html;
      msgBox.scrollTop = msgBox.scrollHeight;
    }
  });
};

window.sendAdminMessage = async function() {

  if (!currentChatUser) return alert("Select user");

  const text = adminInput.value.trim();
  if (!text) return;

  // 🔥 mark as seen
  await setDoc(doc(db, "chats", currentChatUser), {
    adminSeen: true
  }, { merge: true });

  await addDoc(collection(db, "chats", currentChatUser, "messages"), {
    sender: "admin",
    text,
    time: new Date()
  });

  adminInput.value = "";
};
window.closeProfile = function() {
  const profile = document.getElementById("profilePage");

  if (!profile) {
    console.log("profilePage not found");
    return;
  }

  profile.style.display = "none";
};
window.openResultPanel = function(matchId) {
  document.getElementById("resultBox").innerHTML = "<h1>HELLO WORKING</h1>";
};
window.submitResults = async function(matchId) {

  const snap = await getDoc(doc(db, "matches", matchId));
  const data = snap.data();

  let players = [];

  for (let uid in data.playerNames) {

    let name = data.playerNames[uid];

    let kills = Number(document.getElementById("kill_" + uid).value) || 0;

    players.push({
      uid: uid,
      name: name,
      kills: kills
    });
  }

  // 🔥 SORT BY KILLS
  players.sort((a, b) => b.kills - a.kills);

  // 🔥 ADD POSITION
  players.forEach((p, i) => {
    p.position = i + 1;
  });

  // 🔥 SAVE TO FIRESTORE
  await updateDoc(doc(db, "matches", matchId), {
    results: players
  });

  alert("Results Saved ✅");

  loadMatches("resulted"); // refresh
};
window.openResultPanel = async function(matchId) {

  const snap = await getDoc(doc(db, "matches", matchId));
  const data = snap.data();

  let html = "<h3>Enter Kills</h3>";

  for (let uid in data.playerNames) {

    let name = data.playerNames[uid];

    html += `
      <div style="margin:10px; padding:10px; border:1px solid #444">

        <p>🎮 Name: ${name}</p>

        <p>
          🆔 ID: ${uid}
          <button onclick="copyId('${uid}')">📋 Copy</button>
        </p>

        <input type="number" id="kill_${uid}" placeholder="Enter kills">

      </div>
    `;
  }

  html += `<button id="submitBtn">Submit</button>`;

  document.getElementById("resultBox").innerHTML = html;

  document.getElementById("submitBtn").onclick = function() {
    submitResults(matchId);
  };
};
window.copyId = function(uid) {
  navigator.clipboard.writeText(uid);
  alert("Copied: " + uid);
};
