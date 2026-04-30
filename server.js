const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
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

// ================= CREATE ORDER =================
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    console.log("👉 Creating order for:", amount);

    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR"
    });

    console.log("✅ Order created:", order.id);

    res.json(order); // 🔥 always JSON

  } catch (err) {
    console.log("❌ ERROR:", err);
    res.status(500).json({ error: "Order failed" }); // 🔥 FIXED
  }
});

// ================= VERIFY PAYMENT =================
app.post("/verify", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;

    const body = order_id + "|" + payment_id;

    const expected = crypto
      .createHmac("sha256", KEY_SECRET) // 🔥 FIXED
      .update(body)
      .digest("hex");

    if (expected === signature) {
      console.log("✅ Payment verified");
      res.json({ success: true });
    } else {
      console.log("❌ Invalid signature");
      res.status(400).json({ success: false });
    }

  } catch (err) {
    console.log("❌ VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// ================= START SERVER =================
app.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});
const admin = require("firebase-admin");

// 🔥 Load Firebase service key
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
function verifyAdmin(req, res, next) {
  const { email } = req.body;

  if (email !== "kodinanikodinani123@gmail.com") {
    return res.status(403).json({ error: "Not admin" });
  }

  next();
}
app.post("/give-prize", verifyAdmin, async (req, res) => {

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
app.post("/delete-match", verifyAdmin, async (req, res) => {

  const { matchId } = req.body;

  try {
    await db.collection("matches").doc(matchId).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running");
});