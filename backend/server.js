require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

// Allow your frontend (adjust origin as needed)
app.use(
  cors({
     origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://digi-tech-a1-app-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, // set true only if using cookies/auth headers that require it
  })
);

// Handle preflight quickly (optional but nice)
app.options("*", cors());

app.use(express.json());
app.use("/api", routes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/api`);
});
