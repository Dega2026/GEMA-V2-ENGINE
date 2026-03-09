const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { validateSecurityEnv } = require("./config/env");
const {
  buildCorsOptions,
  attachRequestId,
  globalApiLimiter,
  adminApiLimiter,
  authApiLimiter,
  wafGuard,
} = require("./middleware/securityHardening");

// Load .env before importing modules that read env vars at require-time.
dotenv.config({ path: path.join(__dirname, "../.env") });
validateSecurityEnv();

// استيراد ملفات الراوتس
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const projectRoutes = require("./routes/projectRoutes");
const machineryRoutes = require("./routes/machineryRoutes");
const engineeringHubRoutes = require("./routes/engineeringHubRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const regulatoryRoutes = require("./routes/regulatoryRoutes");
const newsRoutes = require("./routes/newsRoutes");
const reportRoutes = require("./routes/reportRoutes");
const auditRoutes = require("./routes/auditRoutes");
const leadRoutes = require("./routes/leadRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const automationRoutes = require("./routes/automationRoutes");
const portalRoutes = require("./routes/portalRoutes");
const pageRoutes = require("./routes/pageRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { startDailyReportScheduler } = require("./scripts/dailyReport");
const app = express();
const isProduction = String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const frontendPublicDir = path.join(__dirname, "../frontend/public");
const frontendSrcDir = path.join(__dirname, "../frontend/src");
const frontendPagesDir = path.join(frontendSrcDir, "pages");

// --- Middleware ---
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: isProduction,
  }),
);
app.use(attachRequestId);
app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(wafGuard);

// --- Static frontend assets ---
app.use(express.static(frontendPublicDir));
app.use("/css", express.static(path.join(frontendSrcDir, "css")));
app.use("/js", express.static(path.join(frontendSrcDir, "js")));
app.use("/webfonts", express.static(path.join(frontendSrcDir, "webfonts")));

// --- الداتابيز ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ GEMA Database Connected... Matrix Ready"))
  .catch((err) => console.error("❌ Connection Error:", err));

// ==========================================
// --- الـ API (تجميع كل المسارات في مكان واحد) ---
// ==========================================
app.use("/api/users", userRoutes);
app.use("/api/auth", authApiLimiter, authRoutes);
app.use("/api/products", globalApiLimiter, productRoutes);
app.use("/api/projects", globalApiLimiter, projectRoutes);
app.use("/api/machinery", globalApiLimiter, machineryRoutes);
app.use("/api/engineering-hub", globalApiLimiter, engineeringHubRoutes);
app.use("/api/maintenance", globalApiLimiter, maintenanceRoutes);
app.use("/api/regulatory", globalApiLimiter, regulatoryRoutes);
app.use("/api/news", globalApiLimiter, newsRoutes);
app.use("/api/reports", adminApiLimiter, reportRoutes);
app.use("/api/audit", adminApiLimiter, auditRoutes);
app.use("/api/leads", adminApiLimiter, leadRoutes);
app.use("/api/analytics", adminApiLimiter, analyticsRoutes);
app.use("/api/automation", adminApiLimiter, automationRoutes);
app.use("/api/portal", adminApiLimiter, portalRoutes);
app.use("/api/pages", adminApiLimiter, pageRoutes);
app.use("/api/page-content", adminApiLimiter, pageRoutes);
app.use("/api/pharmacies", globalApiLimiter, pharmacyRoutes);
app.use("/api/ai", aiRoutes);

// --- Frontend page routes ---
const pageRouteMap = {
  "/": "index.html",
  "/about": "about.html",
  "/contact": "contact.html",
  "/direct-sourcing": "direct-sourcing.html",
  "/engineering": "engineering.html",
  "/hub": "hub.html",
  "/logistics": "logistics.html",
  "/manufacturing": "manufacturing.html",
  "/news": "news.html",
  "/products": "products.html",
  "/product-details": "product-details.html",
  "/quote": "quote.html",
  "/regulatory": "regulatory.html",
  "/service-details": "service-details.html",
  "/trading": "trading.html",
  "/turnkey": "turnkey.html",
  "/admin": "admin.html",
  "/client-portal": "client-portal.html",
};

for (const [routePath, fileName] of Object.entries(pageRouteMap)) {
  app.get(routePath, (req, res) => {
    res.sendFile(path.join(frontendPagesDir, fileName));
  });
}

app.get("/pharmacy/:slug", (req, res) => {
  res.sendFile(path.join(frontendPagesDir, "pharmacy-landing.html"));
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use((req, res) => {
  if (!req.path.startsWith("/api/")) {
    return res.status(404).sendFile(path.join(frontendPagesDir, "404.html"));
  }

  res.status(404).json({ success: false, message: "Not Found" });
});

// --- تشغيل السيرفر ---
const PORT = process.env.PORT || 5000;

// عدلنا السطر ده عشان يسمع لكل الاجهزة في الشبكة (0.0.0.0)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
    =========================================
    🛡️  GEMA-V2 ENGINE: ONLINE
    🔗  Local: http://localhost:${PORT}
    📱  Mobile: http://192.168.1.10:${PORT}
    🚀  MSA Intelligence Unit: ACTIVATED
    =========================================
    `);

  const shouldRunAiReportScheduler =
    String(process.env.ENABLE_DAILY_AI_REPORT || "").trim().toLowerCase() === "true"
    || isProduction;

  if (shouldRunAiReportScheduler) {
    startDailyReportScheduler();
  }
});
