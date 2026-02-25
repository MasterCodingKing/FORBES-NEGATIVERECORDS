import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/**
 * Reusable server-side paginated DataTable.
 *
 * Props:
 *  - columns:      [{ key, label, render? }]
 *  - fetchUrl:     string — API path (e.g. "/clients")
 *  - fetchFn:      async (params) => { data, total, page, totalPages } — optional custom fetch
 *  - queryParams:  {} extra query string params merged into every request
 *  - pageSize:     number (default 10)
 *  - searchable:   bool (default true)
 *  - onRowClick:   fn(row)
 *  - refreshKey:   any — change to force re-fetch
 *  - emptyMessage: string
 */
export default function DataTable({
  columns = [],
  fetchUrl,
  fetchFn,
  queryParams = {},
  pageSize = 10,
  searchable = true,
  onRowClick,
  refreshKey,
  emptyMessage = "No data found",
  api
}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const queryParamsStr = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const loadData = useCallback(
    async (p, s) => {
      setLoading(true);
      try {
        const params = { page: p, limit: pageSize, search: s, ...queryParams };
        let result;

        if (fetchFn) {
          result = await fetchFn(params);
        } else if (fetchUrl && api) {
          const qs = new URLSearchParams(params).toString();
          const res = await api.get(`${fetchUrl}?${qs}`);
          result = res.data;
        }

        if (result) {
          setData(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 1);
        }
      } catch {
        setData([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl, fetchFn, pageSize, api, queryParamsStr]
  );

  // Re-fetch when page, refreshKey, or queryParams change
  useEffect(() => {
    loadData(page, search);
  }, [page, refreshKey, loadData]);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadData(1, val);
    }, 350);
  };

  const goTo = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // Compute visible page buttons (max 5)
  const pageButtons = [];
  const maxButtons = 5;
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) pageButtons.push(i);

  return (
    <div>
      {/* Search */}
      {searchable && (
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="border border-card-border rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary-header"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-nav-bg text-primary-on-dark">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sidebar-text">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sidebar-text">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick?.(row)}
                    className={`border-t border-card-border hover:bg-sidebar-bg transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                        {col.render ? col.render(row) : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-sidebar-text">
        <span>
          Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, total)} of {total}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(1)}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-card-border disabled:opacity-40 hover:bg-sidebar-bg"
          >
            ««
          </button>
          <button
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
            className="px-2 py-1 rounded border border-card-border disabled:opacity-40 hover:bg-sidebar-bg"
          >
            «
          </button>

          {pageButtons.map((p) => (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`px-3 py-1 rounded border ${
                p === page
                  ? "bg-btn-primary text-btn-primary-text border-btn-primary"
                  : "border-card-border hover:bg-sidebar-bg"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-card-border disabled:opacity-40 hover:bg-sidebar-bg"
          >
            »
          </button>
          <button
            onClick={() => goTo(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 rounded border border-card-border disabled:opacity-40 hover:bg-sidebar-bg"
          >
            »»
          </button>
        </div>
      </div>
    </div>
  );
}
