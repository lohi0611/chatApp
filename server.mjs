import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

console.log("--- CHATFLOW BACKEND (NO AI) ---");

// Placeholder for future backend features
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running smoothly." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
