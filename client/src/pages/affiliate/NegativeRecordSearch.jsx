import { useState } from "react";
import api from "../../api/axios";

export default function NegativeRecordSearch() {
  const [tab, setTab] = useState("Individual");
  const [term, setTerm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [results, setResults] = useState([]);
  const [billed, setBilled] = useState(null);
  const [remainingCredit, setRemainingCredit] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Unlock request modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View detail modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setBilled(null);
    setLoading(true);
    try {
      let url = `/records/search?type=${tab}`;
      if (tab === "Individual") {
        if (firstName) url += `&firstName=${encodeURIComponent(firstName.trim())}`;
        if (middleName) url += `&middleName=${encodeURIComponent(middleName.trim())}`;
        if (lastName) url += `&lastName=${encodeURIComponent(lastName.trim())}`;
      } else {
        url += `&term=${encodeURIComponent(term.trim())}`;
      }
      const res = await api.get(url);
      setResults(res.data.results);
      setBilled(res.data.billed);
      setRemainingCredit(res.data.remainingCredit);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const individualValid = firstName.trim() || middleName.trim() || lastName.trim();
  const companyValid = term.trim();

  const openRequestModal = (record) => {
    setSelectedRecord(record);
    setReason("");
    setModalError("");
    setModalSuccess("");
    setShowModal(true);
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setModalError("");
    setModalSuccess("");
    setSubmitting(true);
    try {
      await api.post("/unlock-requests", {
        recordId: selectedRecord.id,
        reason: reason || null,
      });
      setModalSuccess("Access request submitted successfully.");
      setResults((prev) =>
        prev.map((r) =>
          r.id === selectedRecord.id ? { ...r, hasPendingRequest: true } : r
        )
      );
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setReason("");
    setModalError("");
    setModalSuccess("");
  };

  const openViewModal = (record) => {
    setViewRecord(record);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewRecord(null);
  };

  const getRecordName = (r) =>
    r.type === "Individual"
      ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
      : r.companyName;

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
              setFirstName("");
              setMiddleName("");
              setLastName("");
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

      <form onSubmit={handleSearch} className="mb-6">
        {tab === "Individual" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-sidebar-text mb-1">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name..."
                className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sidebar-text mb-1">Middle Name</label>
              <input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Enter middle name..."
                className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sidebar-text mb-1">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name..."
                className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter company name..."
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (tab === "Individual" ? !individualValid : !companyValid)}
          className="bg-primary-header text-primary-on-dark px-6 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
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
                <th className="px-4 py-3 text-left">Case No.</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-card-border">
                  <td className="px-4 py-3">{r.id}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">{getRecordName(r)}</td>
                  <td className="px-4 py-3">{r.caseNo}</td>
                  <td className="px-4 py-3">
                    {r.isLocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-error/10 text-error">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-success/10 text-success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                        </svg>
                        Unlocked
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {/* View button — only when NOT locked */}
                      {!r.isLocked && (
                        <button
                          onClick={() => openViewModal(r)}
                          className="bg-primary-header text-primary-on-dark px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                        >
                          View
                        </button>
                      )}
                      {/* Locked: show lock info + request access */}
                      {r.isLocked && !r.hasPendingRequest && (
                        <button
                          onClick={() => openRequestModal(r)}
                          className="bg-primary-header text-primary-on-dark px-3 py-1 rounded text-xs font-medium hover:opacity-90"
                        >
                          Request Access
                        </button>
                      )}
                      {r.isLocked && r.hasPendingRequest && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-warning/10 text-warning">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && billed !== null && (
        <p className="text-center text-sidebar-text text-sm">No records found.</p>
      )}

      {/* View Record Detail Modal (for unlocked/owned records) */}
      {showViewModal && viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary-header">Record Details</h3>
              <button onClick={closeViewModal} className="text-sidebar-text hover:text-error text-xl font-bold">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="font-medium">Type:</span> {viewRecord.type}</div>
              <div><span className="font-medium">Name:</span> {getRecordName(viewRecord)}</div>
              <div><span className="font-medium">Alias:</span> {viewRecord.alias || "—"}</div>
              <div><span className="font-medium">Company:</span> {viewRecord.companyName || "—"}</div>
              <div><span className="font-medium">Case No:</span> {viewRecord.caseNo}</div>
              <div><span className="font-medium">Plaintiff:</span> {viewRecord.plaintiff}</div>
              <div><span className="font-medium">Case Type:</span> {viewRecord.caseType}</div>
              <div><span className="font-medium">Court Type:</span> {viewRecord.courtType}</div>
              <div><span className="font-medium">Branch:</span> {viewRecord.branch}</div>
              <div><span className="font-medium">City:</span> {viewRecord.city || "—"}</div>
              <div><span className="font-medium">Date Filed:</span> {viewRecord.dateFiled ? new Date(viewRecord.dateFiled).toLocaleDateString() : "—"}</div>
              <div><span className="font-medium">Bounce:</span> {viewRecord.bounce || "—"}</div>
              <div><span className="font-medium">Decline:</span> {viewRecord.decline || "—"}</div>
              <div><span className="font-medium">Delinquent:</span> {viewRecord.delinquent || "—"}</div>
              <div><span className="font-medium">Telecom:</span> {viewRecord.telecom || "—"}</div>
              <div><span className="font-medium">Watch:</span> {viewRecord.watch || "—"}</div>
              <div><span className="font-medium">Source:</span> {viewRecord.source || "—"}</div>
              <div><span className="font-medium">Scanned:</span> {viewRecord.isScanned ? "Yes" : "No"}</div>
            </div>
            {viewRecord.details && (
              <div className="mt-3 text-sm"><span className="font-medium">Details:</span> {viewRecord.details}</div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Request Modal */}
      {showModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-primary-header mb-4">Request Access</h3>
            <div className="bg-card-bg border border-card-border rounded p-3 mb-4 text-sm space-y-1">
              <p><span className="font-medium">Record ID:</span> {selectedRecord.id}</p>
              <p>
                <span className="font-medium">Name:</span>{" "}
                {getRecordName(selectedRecord)}
              </p>
              {/* Show lock owner info */}
              {selectedRecord.lockedByAffiliate && (
                <p><span className="font-medium">Locked by Affiliate:</span> {selectedRecord.lockedByAffiliate}</p>
              )}
              {selectedRecord.lockedByName && (
                <p><span className="font-medium">Locked by:</span> {selectedRecord.lockedByName}</p>
              )}
              {selectedRecord.lockedAt && (
                <p><span className="font-medium">Locked at:</span> {new Date(selectedRecord.lockedAt).toLocaleString()}</p>
              )}
            </div>

            {modalError && (
              <div className="bg-error/10 text-error text-sm rounded p-3 mb-3">{modalError}</div>
            )}
            {modalSuccess && (
              <div className="bg-success/10 text-success text-sm rounded p-3 mb-3">{modalSuccess}</div>
            )}

            {!modalSuccess ? (
              <form onSubmit={handleRequestAccess}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-sidebar-text mb-1">
                    Reason for Access
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="3"
                    placeholder="Please provide a reason for your request..."
                    className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
