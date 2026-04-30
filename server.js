const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();

// ✅ CORS FIX
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());

// ✅ BODY PARSER
app.use(express.json());

// ✅ Serve frontend
app.use(express.static("public"));

// 🔐 Razorpay keys
const KEY_ID = "rzp_live_SjLhqPai5YkEF5";
const KEY_SECRET = "ffXDSNucsQ5VCTp1dSXZPdRu";

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET
});

// ================= FIREBASE SAFE INIT =================
let db = null;

try {
  const serviceAccount = require("./serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();
  console.log("✅ Firebase connected");

} catch (err) {
  console.log("⚠️ Firebase not initialized (missing key)");
}

// ================= CREATE ORDER =================
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR"
    });

    res.json(order);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Order failed" });
  }
});

// ================= VERIFY =================
app.post("/verify", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const body = order_id + "|" + payment_id;

    const expected = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected === signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ================= ADMIN CHECK =================
function verifyAdmin(req, res, next) {
  const { email } = req.body;

  if (email !== "kodinanikodinani123@gmail.com") {
    return res.status(403).json({ error: "Not admin" });
  }

  next();
}

// ================= GIVE PRIZE =================
app.post("/give-prize", verifyAdmin, async (req, res) => {

  if (!db) {
    return res.status(500).json({ error: "Firebase not connected" });
  }

  const { uid, amount } = req.body;

  try {
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = snap.data();

    await userRef.update({
      wallet: (data.wallet || 0) + amount,
      wins: (data.wins || 0) + amount
    });

    await db.collection("transactions").add({
      userId: uid,
      type: "prize",
      amount,
      time: new Date()
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed" });
  }
});

// ================= DELETE MATCH =================
app.post("/delete-match", verifyAdmin, async (req, res) => {

  if (!db) {
    return res.status(500).json({ error: "Firebase not connected" });
  }

  const { matchId } = req.body;

  try {
    await db.collection("matches").doc(matchId).delete();
    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= TEST =================
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ================= PORT FIX =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
