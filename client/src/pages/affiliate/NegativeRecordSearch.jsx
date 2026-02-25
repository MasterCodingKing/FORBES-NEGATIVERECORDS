import { useState } from "react";
import api from "../../api/axios";

export default function NegativeRecordSearch() {
  const [tab, setTab] = useState("Individual");
  const [term, setTerm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Locked record info sub-view
  const [lockedInfoView, setLockedInfoView] = useState(null); // { record, lock, accessHistory }
  const [lockedInfoLoading, setLockedInfoLoading] = useState(false);
  const [lockedInfoError, setLockedInfoError] = useState("");

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

  // Print state
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState("");
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [pendingPrintRecord, setPendingPrintRecord] = useState(null);

  // Toast state
  const [toast, setToast] = useState(null); // { message, type }
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setLockedInfoView(null);
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
    } catch (err) {
      setError(err.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const individualValid = firstName.trim() || middleName.trim() || lastName.trim();
  const companyValid = term.trim();

  // --- Locked record info sub-view ---
  const openLockedInfoView = async (record) => {
    setLockedInfoError("");
    setLockedInfoLoading(true);
    setLockedInfoView({ record, lock: null, accessHistory: [] });
    try {
      const res = await api.get(`/records/${record.id}/lock-info`);
      setLockedInfoView(res.data);
    } catch (err) {
      setLockedInfoError(err.response?.data?.message || "Failed to load lock details");
      setLockedInfoView(null);
    } finally {
      setLockedInfoLoading(false);
    }
  };

  const closeLockedInfoView = () => {
    setLockedInfoView(null);
    setLockedInfoError("");
  };

  // --- Unlock request modal ---
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
      showToast("Your access request has been submitted successfully.", "success");
      setResults((prev) =>
        prev.map((r) =>
          r.id === selectedRecord.id ? { ...r, hasPendingRequest: true } : r
        )
      );
      // Also update the lockedInfoView record if open
      if (lockedInfoView?.record?.id === selectedRecord.id) {
        setLockedInfoView((prev) => ({
          ...prev,
          record: { ...prev.record, hasPendingRequest: true },
        }));
      }
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

  // --- View detail modal ---
  const openViewModal = (record) => {
    setViewRecord(record);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewRecord(null);
    setPrintError("");
  };

  // --- Print ---
  const requestPrint = (record) => {
    setPendingPrintRecord(record);
    setShowPrintConfirm(true);
  };

  const cancelPrint = () => {
    setShowPrintConfirm(false);
    setPendingPrintRecord(null);
  };

  const confirmPrint = () => {
    setShowPrintConfirm(false);
    if (pendingPrintRecord) {
      handlePrint(pendingPrintRecord);
      setPendingPrintRecord(null);
    }
  };

  const handlePrint = async (record) => {
    setPrintError("");
    setPrintLoading(true);
    try {
      const res = await api.post(`/records/${record.id}/print`);
      const { record: r, printMeta } = res.data;

      const name =
        r.type === "Individual"
          ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
          : r.companyName;

      const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
      const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "—";

      const caseRows = (r.caseNo || r.caseType)
        ? `<tr>
             <td>${r.caseNo || "—"}</td>
             <td>${r.caseType || "—"}</td>
             <td>${r.plaintiff || "—"}</td>
             <td>${fmtDate(r.dateFiled)}</td>
             <td>${r.city || "—"}</td>
             <td>${r.courtType || "—"}</td>
             <td>${r.branch || "—"}</td>
           </tr>`
        : `<tr><td colspan="7" class="empty">Court/Case Not Found</td></tr>`;

      const makeSection = (label, value) => {
        // Handle null, empty string, or undefined
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return `
            <div class="section-label">${label}: <span class="count">0</span></div>
            <div class="section-status no-records">No Records Found</div>
          `;
        }
        
        // Parse comma-separated values
        const items = typeof value === 'string' 
          ? value.split(',').map(v => v.trim()).filter(v => v)
          : [value];
        const count = items.length;
        
        return `
          <div class="section-label">${label}: <span class="count">${count}</span></div>
          <div class="section-status">${items.join(', ')}</div>
        `;
      };

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>NEGATIVE RECORDS DETAIL REPORT — ${name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px 32px; }
            .report-title { text-align: center; font-size: 18px; font-weight: bold; color: #0d2d5e; margin-bottom: 20px; letter-spacing: 1px; }
            .border-box { border: 2px solid #0d2d5e; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            table th { background: #0d2d5e; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 600; }
            table td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
            table td.empty { text-align: center; color: #999; font-style: italic; padding: 10px; }
            .section-label { font-weight: bold; margin-top: 16px; font-size: 12px; }
            .section-label .count { color: #E53935; font-weight: bold; }
            .section-status { margin-top: 2px; margin-bottom: 4px; font-size: 11px; }
            .no-records { color: #E53935; font-weight: bold; }
            .disclaimer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 12px; }
            .disclaimer h4 { font-size: 12px; margin-bottom: 6px; }
            .disclaimer p { font-size: 10px; color: #444; line-height: 1.5; text-align: justify; }
            @media print { .no-print { display: none !important; } body { padding: 12px 20px; } }
          </style>
        </head>
        <body>
          <div class="report-title">NEGATIVE RECORDS DETAIL REPORT</div>

          <!-- Inquiry Info -->
          <div class="border-box">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Inquiry Date</th>
                  <th>Inquiry By</th>
                  <th>Client</th>
                  <th>Branch</th>
                  <th>Reference No</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${name}</td>
                  <td>${fmtDateTime(printMeta?.inquiryDate)}</td>
                  <td>${printMeta?.inquiryBy || "—"}</td>
                  <td>${printMeta?.client || "—"}</td>
                  <td>${printMeta?.branch || "All"}</td>
                  <td>${printMeta?.referenceNo || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Case Info -->
          <div class="border-box">
            <table>
              <thead>
                <tr>
                  <th>Case No.</th>
                  <th>Case Type</th>
                  <th>Plaintiff</th>
                  <th>Date Filed</th>
                  <th>City</th>
                  <th>Court</th>
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                ${caseRows}
              </tbody>
            </table>
          </div>

          <!-- Category Sections -->
          ${makeSection("Court Case", r.caseNo ? r.caseType : null)}
          ${makeSection("Bounce Check", r.bounce)}
          ${makeSection("Watch List", r.watch)}
          ${makeSection("Telecoms", r.telecom)}
          ${makeSection("Declined", r.decline)}
          ${makeSection("Delinquent", r.delinquent)}

          <!-- Disclaimer -->
          <div class="disclaimer">
            <h4>Disclaimer</h4>
            <p>
              This report, to be treated in strictest confidence, upon request and in accordance with
              the subscription agreement entered into by and between Forbes Financial Consultancy Corporation
              (FFCC) and the user, the terms of which agreement are hereby incorporated by reference, for exclusive
              use as one factor to be considered in connection with credit, insurance, marketing, and other business
              decisions, and for no other purpose. It may contain information from sources which FFCC does not
              control and which information, unless otherwise indicated, may not have been verified. It shall not be
              used as evidence in any legal proceeding nor shall it be shown to subject or others, and neither shall
              its source be disclosed. FFCC has acted with due diligence and in utmost good faith and does not
              guarantee the accuracy, completeness, and timeliness of this report or does it assume any part of the
              user's risk in its use or non-use. FFCC shall not and cannot be held liable for any loss, injury or damage
              caused or may hereafter be caused, directly or indirectly, by the use of the report or arising from the
              acts on the part of FFCC, its officers, agents, and personnel relative to the procurement, collection,
              and/or communication of any information relative thereto. Any point of clarification may be promptly
              raised solely and exclusively with FFCC.
            </p>
          </div>

          <div class="no-print" style="margin-top:24px;text-align:center;">
            <button onclick="window.print()" style="padding:8px 24px;background:#0d2d5e;color:#fff;border:none;cursor:pointer;border-radius:4px;font-size:13px;">Print</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      setPrintError(err.response?.data?.message || "Failed to print record");
    } finally {
      setPrintLoading(false);
    }
  };

  const getRecordName = (r) =>
    r.type === "Individual"
      ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
      : r.companyName;

  // ==============================
  // Locked Record Info Sub-View
  // ==============================
  if (lockedInfoView || lockedInfoLoading) {
    const { record, lock, accessHistory } = lockedInfoView || {};
    const recordInResults = results.find((r) => r.id === record?.id) || record;
    const hasPending = recordInResults?.hasPendingRequest;

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={closeLockedInfoView}
              className="text-primary-header hover:opacity-70 flex items-center gap-1 text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Negative Records Simple Search
            </button>
          </div>
          {!lockedInfoLoading && lock && !hasPending && (
            <button
              onClick={() => openRequestModal(record)}
              className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90"
            >
              Request Access
            </button>
          )}
          {!lockedInfoLoading && hasPending && (
            <span className="text-xs font-medium px-3 py-2 rounded bg-warning/10 text-warning">
              Request Pending
            </span>
          )}
        </div>

        {lockedInfoLoading && (
          <div className="text-sidebar-text text-sm">Loading lock details...</div>
        )}

        {lockedInfoError && (
          <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{lockedInfoError}</div>
        )}

        {!lockedInfoLoading && lock && (
          <>
            {/* Notice */}
            <div className="flex items-start gap-2 bg-warning/10 text-warning text-sm rounded p-3 mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Access to this record is locked. Below are the details for your reference.
            </div>

            {/* Lock info table */}
            <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-nav-bg text-primary-on-dark">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Date Locked</th>
                    <th className="px-4 py-3 text-left">Inquire by</th>
                    <th className="px-4 py-3 text-left">Affiliate</th>
                    <th className="px-4 py-3 text-left">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">{record?.name || getRecordName(record)}</td>
                    <td className="px-4 py-3">
                      {lock.lockedAt ? new Date(lock.lockedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-btn-primary">
                      {lock.lockedBy?.username || lock.lockedBy?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lock.lockedBy?.affiliate?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-btn-primary">
                      {lock.lockedBy?.branch || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Lock owner contact details */}
            <div className="bg-card-bg border border-card-border rounded-lg p-4 mb-6 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <h4 className="col-span-full font-semibold text-primary-header mb-1">Lock Owner Contact Details</h4>
              {lock.lockedBy?.telephone && (
                <div><span className="font-medium">Telephone:</span> {lock.lockedBy.telephone}</div>
              )}
              {lock.lockedBy?.mobileNumber && (
                <div><span className="font-medium">Mobile:</span> {lock.lockedBy.mobileNumber}</div>
              )}
              {lock.lockedBy?.email && (
                <div><span className="font-medium">Email:</span> {lock.lockedBy.email}</div>
              )}
              {lock.lockedBy?.position && (
                <div><span className="font-medium">Position:</span> {lock.lockedBy.position}</div>
              )}
              {lock.lockedBy?.department && (
                <div><span className="font-medium">Department:</span> {lock.lockedBy.department}</div>
              )}
              {lock.lockedBy?.affiliate?.telephone && (
                <div><span className="font-medium">Affiliate Tel:</span> {lock.lockedBy.affiliate.telephone}</div>
              )}
              {lock.lockedBy?.affiliate?.email && (
                <div><span className="font-medium">Affiliate Email:</span> {lock.lockedBy.affiliate.email}</div>
              )}
            </div>

            {/* Access History */}
            <h4 className="text-base font-bold text-primary-header mb-3">Access History</h4>
            <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-nav-bg text-primary-on-dark">
                  <tr>
                    <th className="px-4 py-3 text-left">Affiliate</th>
                    <th className="px-4 py-3 text-left">Branch</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Full Name</th>
                    <th className="px-4 py-3 text-left">Search Date</th>
                  </tr>
                </thead>
                <tbody>
                  {accessHistory && accessHistory.length > 0 ? (
                    accessHistory.map((h) => (
                      <tr key={h.id} className="border-t border-card-border">
                        <td className="px-4 py-3">{h.affiliate}</td>
                        <td className="px-4 py-3 text-btn-primary">{h.branch}</td>
                        <td className="px-4 py-3">{h.username}</td>
                        <td className="px-4 py-3">{h.fullName}</td>
                        <td className="px-4 py-3">
                          {h.searchDate ? new Date(h.searchDate).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sidebar-text">
                        No access history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Unlock Request Modal */}
        {showModal && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-primary-header mb-4">Request Access</h3>
              <div className="bg-card-bg border border-card-border rounded p-3 mb-4 text-sm space-y-1">
                <p><span className="font-medium">Record ID:</span> {selectedRecord.id}</p>
                <p><span className="font-medium">Name:</span> {selectedRecord.name || getRecordName(selectedRecord)}</p>
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
                      className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
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

  // ==============================
  // Main Search View
  // ==============================
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
          className="bg-btn-primary text-btn-primary-text px-6 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {printError && (
        <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{printError}</div>
      )}

      {results.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-nav-bg text-primary-on-dark">
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
                    <div className="flex gap-2 items-center flex-wrap">
                      {/* Unlocked/owned: View and Print */}
                      {!r.isLocked && (
                        <>
                          <button
                            onClick={() => openViewModal(r)}
                            className="bg-card-bg text-sidebar-text border border-card-border px-3 py-1 rounded text-xs font-medium hover:opacity-80"
                          >
                            View
                          </button>
                          <button
                            onClick={() => requestPrint(r)}
                            disabled={printLoading}
                            className="bg-btn-primary text-btn-primary-text px-3 py-1 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {printLoading ? "..." : "Print"}
                          </button>
                        </>
                      )}
                      {/* Locked: show Request Access or Pending */}
                      {r.isLocked && !r.hasPendingRequest && (
                        <button
                          onClick={() => openLockedInfoView(r)}
                          className="bg-btn-primary text-btn-primary-text px-3 py-1 rounded text-xs font-medium hover:opacity-90"
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

      {results.length === 0 && !loading && error === "" && (
        <p className="text-center text-sidebar-text text-sm mt-4">
          Enter a name or company to search.
        </p>
      )}

      {/* View Record Detail Modal */}
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
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Close
              </button>
              <button
                onClick={() => { closeViewModal(); requestPrint(viewRecord); }}
                disabled={printLoading}
                className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {printLoading ? "Preparing..." : "Print"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Confirmation Modal */}
      {showPrintConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-warning/10 rounded-full p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-warning" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-primary-header">Confirm Print</h3>
            </div>
            <p className="text-sm text-sidebar-text mb-5">
              Printing this document will deduct credits from your account. Do you want to continue?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelPrint}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={confirmPrint}
                className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90"
              >
                Yes, Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-success text-white' : 'bg-error text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
