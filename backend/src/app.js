const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { sequelize } = require("./config/database");
const { initModels } = require("./models");
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

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

initModels();

sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("Database synced");
    await seedRolesAndAdmin();
  })
  .catch((err) => {
    console.error("Database sync failed", err);
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

module.exports = app;
