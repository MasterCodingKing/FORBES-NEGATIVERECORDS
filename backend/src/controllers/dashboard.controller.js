const { prisma } = require("../models");

/**
 * GET /api/dashboard/stats
 * Returns summary cards, daily search data (last 30 days), and top 10 clients.
 * Admin only.
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // --- Run all queries in parallel ---
    const [
      totalClients,
      totalAffiliates,
      totalSearches,
      totalRecords,
      dailySearches,
      topClients,
      pendingUnlocks,
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

    return res.json({
      summary: {
        totalClients,
        totalAffiliates,
        totalSearches,
        totalRecords,
        pendingUnlocks,
      },
      dailySearchChart,
      topClients,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboardStats };
