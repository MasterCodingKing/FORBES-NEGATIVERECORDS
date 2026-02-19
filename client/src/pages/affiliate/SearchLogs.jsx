import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function SearchLogs() {
  const [tab, setTab] = useState("my");

  const myColumns = [
    { key: "searchType", label: "Type" },
    { key: "searchTerm", label: "Search Term" },
    {
      key: "isBilled",
      label: "Billed",
      render: (r) => (
        <span className={r.isBilled ? "text-success" : "text-sidebar-text"}>
          {r.isBilled ? "Yes" : "No"}
        </span>
      ),
    },
    { key: "fee", label: "Fee" },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  const affiliateColumns = [
    {
      key: "user",
      label: "User",
      render: (r) => {
        const u = r.User;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : r.userId;
      },
    },
    ...myColumns,
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Search Logs</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === "my"
              ? "bg-sidebar-active text-sidebar-active-text"
              : "bg-card-bg text-sidebar-text border border-card-border"
          }`}
        >
          My Searches
        </button>
        <button
          onClick={() => setTab("affiliates")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            tab === "affiliates"
              ? "bg-sidebar-active text-sidebar-active-text"
              : "bg-card-bg text-sidebar-text border border-card-border"
          }`}
        >
          Affiliate Searches
        </button>
      </div>

      {tab === "my" ? (
        <DataTable columns={myColumns} fetchUrl="/search-logs/my" api={api} searchable={false} />
      ) : (
        <DataTable columns={affiliateColumns} fetchUrl="/search-logs/affiliates" api={api} searchable={false} />
      )}
    </div>
  );
}
