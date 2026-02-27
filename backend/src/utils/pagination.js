/**
 * Unified server-side pagination, search, and sort helper.
 *
 * Usage in a controller:
 *   const { page, limit, skip, search, orderBy } = parsePaginationParams(req.query, {
 *     searchableFields: ['firstName', 'lastName', 'email'],
 *     defaultSort: 'createdAt',
 *     defaultOrder: 'desc',
 *     sortableFields: ['createdAt', 'name', 'email'],
 *   });
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Parse query params into a standard pagination/search/sort shape.
 *
 * @param {object} query - req.query
 * @param {object} opts
 * @param {string[]}  opts.searchableFields  - Prisma field names to ILIKE search
 * @param {string}    opts.defaultSort       - default orderBy field (default: 'createdAt')
 * @param {string}    opts.defaultOrder      - 'asc' | 'desc' (default: 'desc')
 * @param {string[]}  opts.sortableFields    - allowed sort columns
 *
 * @returns {{ page, limit, skip, search, where, orderBy }}
 */
function parsePaginationParams(query = {}, opts = {}) {
  const {
    searchableFields = [],
    defaultSort = "createdAt",
    defaultOrder = "desc",
    sortableFields = [],
  } = opts;

  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit || DEFAULT_LIMIT, 10), 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  const search = (query.search || "").trim();

  // Build search WHERE clause
  const where = {};
  if (search && searchableFields.length > 0) {
    where.OR = searchableFields.map((field) => ({
      [field]: { contains: search, mode: "insensitive" },
    }));
  }

  // Build orderBy
  let sortBy = query.sortBy || defaultSort;
  const sortOrder =
    query.sortOrder === "asc" || query.sortOrder === "desc"
      ? query.sortOrder
      : defaultOrder;

  // Validate sortBy against allowed fields
  if (sortableFields.length > 0 && !sortableFields.includes(sortBy)) {
    sortBy = defaultSort;
  }

  const orderBy = { [sortBy]: sortOrder };

  return { page, limit, skip, search, where, orderBy };
}

/**
 * Build a standard paginated JSON response.
 */
function paginatedResponse(data, total, page, limit) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

module.exports = { parsePaginationParams, paginatedResponse, DEFAULT_LIMIT, MAX_LIMIT };
