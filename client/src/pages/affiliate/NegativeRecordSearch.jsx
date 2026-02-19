import { useState } from "react";
import api from "../../api/axios";

export default function NegativeRecordSearch() {
  const [tab, setTab] = useState("Individual");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [billed, setBilled] = useState(null);
  const [remainingCredit, setRemainingCredit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setBilled(null);
    setLoading(true);
    try {
      const res = await api.get(`/records/search?type=${tab}&term=${encodeURIComponent(term)}`);
      setResults(res.data.results);
      setBilled(res.data.billed);
      setRemainingCredit(res.data.remainingCredit);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Negative Records Search</h2>

      <div className="flex gap-2 mb-4">
        {["Individual", "Company"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setResults([]);
              setBilled(null);
              setTerm("");
            }}
            className={`px-4 py-2 rounded text-sm font-medium ${
              tab === t
                ? "bg-sidebar-active text-sidebar-active-text"
                : "bg-card-bg text-sidebar-text border border-card-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={tab === "Individual" ? "Enter name..." : "Enter company name..."}
          className="border border-card-border rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary-header"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {billed !== null && (
        <div className={`text-sm rounded p-3 mb-4 ${billed ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
          {billed
            ? `You were billed for this search. Remaining credit: ${remainingCredit}`
            : "Duplicate search — no charge."}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary-header text-primary-on-dark">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Name / Company</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-card-border">
                  <td className="px-4 py-3">{r.id}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">
                    {r.type === "Individual"
                      ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
                      : r.companyName}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate">{r.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && billed !== null && (
        <p className="text-center text-sidebar-text text-sm">No records found.</p>
      )}
    </div>
  );
}
