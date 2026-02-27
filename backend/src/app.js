const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { prisma } = require("./config/prisma");
const { seedRolesAndAdmin } = require("./seeders/initial.seeder");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const clientRoutes = require("./routes/client.routes");
const subDomainRoutes = require("./routes/sub_domain.routes");
const unlockRoutes = require("./routes/unlock.routes");
const newsRoutes = require("./routes/news.routes");
const creditRoutes = require("./routes/credit.routes");
const recordRoutes = require("./routes/record.routes");
const searchLogRoutes = require("./routes/search_log.routes");
const directoryRoutes = require("./routes/directory.routes");
const notificationRoutes = require("./routes/notification.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const exportRoutes = require("./routes/export.routes");

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Connect to PostgreSQL via Prisma and seed initial data
prisma
  .$connect()
  .then(async () => {
    console.log("Database connected (Prisma + PostgreSQL)");
    await seedRolesAndAdmin();
  })
  .catch((err) => {
    console.error("Database connection failed", err);
  });

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/sub-domains", subDomainRoutes);
app.use("/api/unlock-requests", unlockRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/credits", creditRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/search-logs", searchLogRoutes);
app.use("/api/directory", directoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);

module.exports = app;
