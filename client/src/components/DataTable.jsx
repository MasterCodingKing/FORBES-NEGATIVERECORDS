import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Reusable server-side paginated DataTable with sorting, page-size selector, and export.
 *
 * Props:
 *  - columns:      [{ key, label, render?, sortable? }]
 *  - fetchUrl:     string — API path (e.g. "/clients")
 *  - fetchFn:      async (params) => { data, total, page, totalPages } — optional custom fetch
 *  - queryParams:  {} extra query string params merged into every request
 *  - pageSize:     number (default 10)
 *  - searchable:   bool (default true)
 *  - sortable:     bool (default true) — enable column sorting
 *  - exportable:   bool (default false) — show PDF/Excel export buttons
 *  - exportUrl:    string — base export API path (e.g. "/records")
 *  - onRowClick:   fn(row)
 *  - refreshKey:   any — change to force re-fetch
 *  - emptyMessage: string
 *  - api:          axios instance
 */
export default function DataTable({
  columns = [],
  fetchUrl,
  fetchFn,
  queryParams = {},
  pageSize: initialPageSize = 10,
  searchable = true,
  sortable = true,
  exportable = false,
  exportUrl,
  onRowClick,
  refreshKey,
  emptyMessage = "No data found",
  api
}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const queryParamsStr = useMemo(() => JSON.stringify(queryParams), [queryParams]);

  const loadData = useCallback(
    async (p, s, sBy, sOrder, limit) => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const params = {
          page: p,
          limit: limit,
          search: s,
          ...queryParams,
        };
        if (sBy) {
          params.sortBy = sBy;
          params.sortOrder = sOrder;
        }

        let result;
        if (fetchFn) {
          result = await fetchFn(params);
        } else if (fetchUrl && api) {
          const qs = new URLSearchParams(params).toString();
          const res = await api.get(`${fetchUrl}?${qs}`, {
            signal: controller.signal,
          });
          result = res.data;
        }

        if (result) {
          setData(result.data || []);
          setTotal(result.total || 0);
          setTotalPages(result.totalPages || 1);
        }
      } catch (err) {
        if (err?.name !== "AbortError" && err?.code !== "ERR_CANCELED") {
          setData([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetchUrl, fetchFn, api, queryParamsStr]
  );

  // Re-fetch when page, refreshKey, pageSize, sort, or queryParams change
  useEffect(() => {
    loadData(page, search, sortBy, sortOrder, pageSize);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [page, refreshKey, pageSize, sortBy, sortOrder, loadData]);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadData(1, val, sortBy, sortOrder, pageSize);
    }, 350);
  };

  // Handle sort toggle
  const handleSort = (key) => {
    if (!sortable) return;
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Export handler
  const handleExport = async (format) => {
    if (!exportUrl || !api) return;
    setExporting(format);
    try {
      const params = new URLSearchParams({
        search,
        ...(sortBy ? { sortBy, sortOrder } : {}),
        ...queryParams,
        format,
      });
      const res = await api.get(`${exportUrl}/export?${params.toString()}`, {
        responseType: "blob",
      });
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const contentDisposition = res.headers["content-disposition"];
      let filename = `export.${ext}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail — could add toast notification
    } finally {
      setExporting("");
    }
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

  // Sort indicator
  const SortIcon = ({ colKey }) => {
    if (sortBy !== colKey) {
      return <span className="ml-1 text-sidebar-text/40">⇅</span>;
    }
    return (
      <span className="ml-1">
        {sortOrder === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div>
      {/* Toolbar: Search + Page Size + Export */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {searchable && (
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="border border-card-border rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary-header"
          />
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Page Size Selector */}
          <label className="text-xs text-sidebar-text">Show</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-card-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-header"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <label className="text-xs text-sidebar-text">entries</label>

          {/* Export Buttons */}
          {exportable && exportUrl && (
            <div className="flex gap-1 ml-3">
              <button
                onClick={() => handleExport("pdf")}
                disabled={!!exporting}
                className="px-3 py-1.5 text-xs font-medium rounded border border-card-border hover:bg-sidebar-bg disabled:opacity-40"
              >
                {exporting === "pdf" ? "Exporting…" : "PDF"}
              </button>
              <button
                onClick={() => handleExport("excel")}
                disabled={!!exporting}
                className="px-3 py-1.5 text-xs font-medium rounded border border-card-border hover:bg-sidebar-bg disabled:opacity-40"
              >
                {exporting === "excel" ? "Exporting…" : "Excel"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-nav-bg text-primary-on-dark">
              <tr>
                {columns.map((col) => {
                  const isSortable = sortable && col.sortable !== false && col.key !== "actions";
                  return (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left whitespace-nowrap ${
                        isSortable ? "cursor-pointer select-none hover:bg-white/10" : ""
                      }`}
                      onClick={isSortable ? () => handleSort(col.key) : undefined}
                    >
                      {col.label}
                      {isSortable && <SortIcon colKey={col.key} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="border-t border-card-border">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="animate-pulse bg-card-border/40 rounded h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
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
