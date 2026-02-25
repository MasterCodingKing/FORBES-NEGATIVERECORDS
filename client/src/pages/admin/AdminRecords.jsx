import { useState, useRef } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

const emptyForm = {
  type: "Individual",
  lastName: "", firstName: "", middleName: "", alias: "",
  companyName: "", caseNo: "", plaintiff: "", caseType: "", courtType: "",
  branch: "", city: "", dateFiled: "",
  bounce: "", decline: "", delinquent: "", telecom: "", watch: "",
  isScanned: false, isScannedCsv: false, isScannedPdf: false,
  details: "", source: "",
};

export default function AdminRecords() {
  const [tab, setTab] = useState("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const fileRef = useRef(null);

  // Detail view state
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm({ ...form, [name]: inputType === "checkbox" ? checked : value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/records", form);
      setSuccess("Record added");
      setForm({ ...emptyForm });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Select a file");

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/records/ocr-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data.message);
      fileRef.current.value = "";
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    }
  };

  const handleViewRecord = async (row) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const res = await api.get(`/records/details/${row.id}`);
      setDetailRecord(res.data);
    } catch {
      setDetailRecord(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "type", label: "Type" },
    {
      key: "name",
      label: "Name / Company",
      render: (r) =>
        r.type === "Individual"
          ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
          : r.companyName,
    },
    { key: "caseNo", label: "Case No." },
    { key: "plaintiff", label: "Plaintiff" },
    { key: "dateFiled", label: "Date Filed", render: (r) => r.dateFiled ? new Date(r.dateFiled).toLocaleDateString() : "—" },
    { key: "source", label: "Source", render: (r) => r.source || "—" },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleViewRecord(r); }}
          className="text-primary-header text-xs font-medium hover:underline"
        >
          View Details
        </button>
      ),
    },
  ];

  const inp = "w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header";

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Records</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      <div className="flex gap-2 mb-4">
        {["list", "add", "ocr"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium capitalize ${
              tab === t
                ? "bg-sidebar-active text-sidebar-active-text"
                : "bg-card-bg text-sidebar-text border border-card-border"
            }`}
          >
            {t === "ocr" ? "OCR Upload" : t === "add" ? "Add Record" : "All Records"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <DataTable columns={columns} fetchUrl="/records" api={api} refreshKey={refreshKey} />
      )}

      {tab === "add" && (
        <form onSubmit={handleAdd} className="bg-card-bg border border-card-border rounded-lg p-5 space-y-5">
          {/* Type selector */}
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-primary-header mb-1">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className={inp}>
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </div>

          {/* Row 1: Last Name, First Name, Middle Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Last Name <span className="text-error">*</span></label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className={inp} required={form.type === "Individual"} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">First Name <span className="text-error">*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className={inp} required={form.type === "Individual"} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} className={inp} />
            </div>
          </div>

          {/* Row 2: Alias, Company, Case No */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Alias</label>
              <input name="alias" value={form.alias} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Company</label>
              <input name="companyName" value={form.companyName} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Case No. <span className="text-error">*</span></label>
              <input name="caseNo" value={form.caseNo} onChange={handleChange} className={inp} required />
            </div>
          </div>

          {/* Row 3: Plaintiff, Case Type, Court Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Plaintiff <span className="text-error">*</span></label>
              <input name="plaintiff" value={form.plaintiff} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Case Type <span className="text-error">*</span></label>
              <input name="caseType" value={form.caseType} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Court Type <span className="text-error">*</span></label>
              <input name="courtType" value={form.courtType} onChange={handleChange} className={inp} required />
            </div>
          </div>

          {/* Row 4: Branch, City, Date Filed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Branch <span className="text-error">*</span></label>
              <input name="branch" value={form.branch} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">City</label>
              <input name="city" value={form.city} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Date Filed <span className="text-error">*</span></label>
              <input name="dateFiled" type="date" value={form.dateFiled} onChange={handleChange} className={inp} required />
            </div>
          </div>

          {/* Row 5: Bounce, Decline, Delinquent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Bounce</label>
              <input name="bounce" value={form.bounce} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Decline</label>
              <input name="decline" value={form.decline} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Delinquent</label>
              <input name="delinquent" value={form.delinquent} onChange={handleChange} className={inp} />
            </div>
          </div>

          {/* Row 6: Telecom, Watch */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Telecom</label>
              <input name="telecom" value={form.telecom} onChange={handleChange} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Watch</label>
              <input name="watch" value={form.watch} onChange={handleChange} className={inp} />
            </div>
            <div />
          </div>

          {/* Row 7: Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-sidebar-text">
              <input type="checkbox" name="isScanned" checked={form.isScanned} onChange={handleChange} className="accent-primary-header" />
              Is Scanned
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-sidebar-text">
              <input type="checkbox" name="isScannedCsv" checked={form.isScannedCsv} onChange={handleChange} className="accent-primary-header" />
              Is Scanned CSV
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-sidebar-text">
              <input type="checkbox" name="isScannedPdf" checked={form.isScannedPdf} onChange={handleChange} className="accent-primary-header" />
              Is Scanned PDF
            </label>
          </div>

          {/* Details & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Details</label>
              <textarea name="details" value={form.details} onChange={handleChange} rows="3" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Source</label>
              <input name="source" value={form.source} onChange={handleChange} className={inp} />
            </div>
          </div>

          <button type="submit" className="bg-btn-primary text-btn-primary-text px-6 py-2 rounded text-sm font-medium hover:opacity-90">
            Save Record
          </button>
        </form>
      )}

      {tab === "ocr" && (
        <form onSubmit={handleUpload} className="bg-card-bg border border-card-border rounded-lg p-4 max-w-lg space-y-3">
          <p className="text-sm text-sidebar-text">Upload a PDF or image file to extract records using OCR.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-sidebar-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-nav-bg file:text-primary-on-dark hover:file:opacity-90"
          />
          <button type="submit" className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Upload & Process
          </button>
        </form>
      )}

      {/* Record Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary-header">Record Details</h3>
              <button
                onClick={() => { setShowDetail(false); setDetailRecord(null); }}
                className="text-sidebar-text hover:text-error text-xl font-bold"
              >&times;</button>
            </div>

            {detailLoading ? (
              <p className="text-sidebar-text text-sm">Loading...</p>
            ) : !detailRecord ? (
              <p className="text-error text-sm">Failed to load record details.</p>
            ) : (
              <>
                {/* Record Data */}
                <div className="bg-card-bg border border-card-border rounded p-4 mb-4">
                  <h4 className="font-bold text-primary-header text-sm mb-3">Record Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div><span className="font-medium">Type:</span> {detailRecord.record.type}</div>
                    <div><span className="font-medium">Name:</span> {[detailRecord.record.firstName, detailRecord.record.middleName, detailRecord.record.lastName].filter(Boolean).join(" ") || "—"}</div>
                    <div><span className="font-medium">Alias:</span> {detailRecord.record.alias || "—"}</div>
                    <div><span className="font-medium">Company:</span> {detailRecord.record.companyName || "—"}</div>
                    <div><span className="font-medium">Case No:</span> {detailRecord.record.caseNo}</div>
                    <div><span className="font-medium">Plaintiff:</span> {detailRecord.record.plaintiff}</div>
                    <div><span className="font-medium">Case Type:</span> {detailRecord.record.caseType}</div>
                    <div><span className="font-medium">Court Type:</span> {detailRecord.record.courtType}</div>
                    <div><span className="font-medium">Branch:</span> {detailRecord.record.branch}</div>
                    <div><span className="font-medium">City:</span> {detailRecord.record.city || "—"}</div>
                    <div><span className="font-medium">Date Filed:</span> {new Date(detailRecord.record.dateFiled).toLocaleDateString()}</div>
                    <div><span className="font-medium">Bounce:</span> {detailRecord.record.bounce || "—"}</div>
                    <div><span className="font-medium">Decline:</span> {detailRecord.record.decline || "—"}</div>
                    <div><span className="font-medium">Delinquent:</span> {detailRecord.record.delinquent || "—"}</div>
                    <div><span className="font-medium">Telecom:</span> {detailRecord.record.telecom || "—"}</div>
                    <div><span className="font-medium">Watch:</span> {detailRecord.record.watch || "—"}</div>
                    <div><span className="font-medium">Source:</span> {detailRecord.record.source || "—"}</div>
                  </div>
                  {detailRecord.record.details && (
                    <div className="mt-2 text-sm"><span className="font-medium">Details:</span> {detailRecord.record.details}</div>
                  )}
                </div>

                {/* Lock Information */}
                <div className="bg-card-bg border border-card-border rounded p-4 mb-4">
                  <h4 className="font-bold text-primary-header text-sm mb-3">Lock Information</h4>
                  {detailRecord.record.recordLock ? (
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Locked By:</span> {[detailRecord.record.recordLock.user?.firstName, detailRecord.record.recordLock.user?.lastName].filter(Boolean).join(" ") || detailRecord.record.recordLock.user?.email || "Unknown"}</div>
                      <div><span className="font-medium">Affiliate:</span> {detailRecord.record.recordLock.user?.client?.name || "—"}</div>
                      <div><span className="font-medium">Locked At:</span> {new Date(detailRecord.record.recordLock.lockedAt || detailRecord.record.recordLock.createdAt).toLocaleString()}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-sidebar-text">No lock on this record.</p>
                  )}
                </div>

                {/* Access Requests */}
                <div className="bg-card-bg border border-card-border rounded p-4 mb-4">
                  <h4 className="font-bold text-primary-header text-sm mb-3">Access Requests</h4>
                  {detailRecord.record.unlockRequests?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-nav-bg text-primary-on-dark">
                          <tr>
                            <th className="px-3 py-2 text-left">Requestor</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Reason</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Reviewed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRecord.record.unlockRequests.map((ur) => (
                            <tr key={ur.id} className="border-t border-card-border">
                              <td className="px-3 py-2">{[ur.requester?.firstName, ur.requester?.lastName].filter(Boolean).join(" ") || ur.requester?.email || "Unknown"}</td>
                              <td className="px-3 py-2">{new Date(ur.createdAt).toLocaleString()}</td>
                              <td className="px-3 py-2 max-w-xs truncate">{ur.reason || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ur.status === "approved" ? "bg-success/10 text-success" : ur.status === "denied" ? "bg-error/10 text-error" : "bg-warning/10 text-warning"}`}>
                                  {ur.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">{ur.reviewedAt ? new Date(ur.reviewedAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-sidebar-text">No access requests.</p>
                  )}
                </div>

                {/* Search History */}
                <div className="bg-card-bg border border-card-border rounded p-4 mb-4">
                  <h4 className="font-bold text-primary-header text-sm mb-3">Search History</h4>
                  {detailRecord.searchHistory?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-nav-bg text-primary-on-dark">
                          <tr>
                            <th className="px-3 py-2 text-left">User</th>
                            <th className="px-3 py-2 text-left">Affiliate</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Billed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRecord.searchHistory.map((sh) => (
                            <tr key={sh.id} className="border-t border-card-border">
                              <td className="px-3 py-2">{[sh.user?.firstName, sh.user?.lastName].filter(Boolean).join(" ") || sh.user?.email || "Unknown"}</td>
                              <td className="px-3 py-2">{sh.user?.client?.name || "—"}</td>
                              <td className="px-3 py-2">{new Date(sh.createdAt).toLocaleString()}</td>
                              <td className="px-3 py-2">{sh.isBilled ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-sidebar-text">No search history found.</p>
                  )}
                </div>

                {/* Lock History */}
                <div className="bg-card-bg border border-card-border rounded p-4">
                  <h4 className="font-bold text-primary-header text-sm mb-3">Lock History</h4>
                  {detailRecord.record.lockHistories?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-nav-bg text-primary-on-dark">
                          <tr>
                            <th className="px-3 py-2 text-left">User</th>
                            <th className="px-3 py-2 text-left">Affiliate</th>
                            <th className="px-3 py-2 text-left">Action</th>
                            <th className="px-3 py-2 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRecord.record.lockHistories.map((lh) => (
                            <tr key={lh.id} className="border-t border-card-border">
                              <td className="px-3 py-2">{[lh.user?.firstName, lh.user?.lastName].filter(Boolean).join(" ") || lh.user?.email || "Unknown"}</td>
                              <td className="px-3 py-2">{lh.user?.client?.name || "—"}</td>
                              <td className="px-3 py-2">{lh.action}</td>
                              <td className="px-3 py-2">{new Date(lh.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-sidebar-text">No lock history.</p>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => { setShowDetail(false); setDetailRecord(null); }}
                    className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
