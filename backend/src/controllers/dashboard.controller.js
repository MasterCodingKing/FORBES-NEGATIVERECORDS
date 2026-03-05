const { prisma } = require("../models");

/**
 * GET /api/dashboard/stats
 * Returns summary cards, daily search data (last 30 days), monthly/yearly analytics, and top 10 clients.
 * Admin only.
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Start of current year
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // --- Run all queries in parallel ---
    const [
      totalClients,
      totalAffiliates,
      totalSearches,
      totalRecords,
      dailySearches,
      topClients,
      pendingUnlocks,
      monthlySearches,
      yearlySearches,
    ] = await Promise.all([
      // 1. Total active clients
      prisma.client.count({ where: { isActive: 1 } }),

      // 2. Total approved affiliate users
      prisma.user.count({
        where: { role: { name: "Affiliate" }, isApproved: 1 },
      }),

      // 3. Total searches (all time)
      prisma.searchLog.count(),

      // 4. Total negative records
      prisma.negativeRecord.count(),

      // 5. Daily searches for the last 30 days
      prisma.$queryRaw`
        SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // 6. Top 10 clients by search requests
      prisma.$queryRaw`
        SELECT
          c.id,
          c.name AS "clientName",
          COUNT(sl.id)::int AS "totalSearches"
        FROM clients c
        JOIN search_logs sl ON sl."clientId" = c.id
        GROUP BY c.id, c.name
        ORDER BY "totalSearches" DESC
        LIMIT 10
      `,

      // 7. Pending unlock requests
      prisma.unlockRequest.count({ where: { status: "pending" } }),

      // 8. Monthly searches (last 12 months)
      prisma.$queryRaw`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') AS month,
          COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,

      // 9. Yearly searches (all years)
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR FROM "createdAt")::int AS year,
          COUNT(*)::int AS count
        FROM search_logs
        GROUP BY EXTRACT(YEAR FROM "createdAt")
        ORDER BY year ASC
      `,
    ]);

    // Normalize daily searches: fill missing dates with 0
    const dateMap = new Map();
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      dateMap.set(key, 0);
    }
    for (const row of dailySearches) {
      const key =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10);
      dateMap.set(key, row.count);
    }

    const dailySearchChart = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Normalize monthly searches: fill missing months
    const monthMap = new Map();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, 0);
    }
    for (const row of monthlySearches) {
      monthMap.set(row.month, row.count);
    }
    const monthlySearchChart = Array.from(monthMap.entries()).map(([month, count]) => ({
      month,
      count,
    }));

    return res.json({
      summary: {
        totalClients,
        totalAffiliates,
        totalSearches,
        totalRecords,
        pendingUnlocks,
      },
      dailySearchChart,
      monthlySearchChart,
      yearlySearchChart: yearlySearches,
      topClients,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats };
