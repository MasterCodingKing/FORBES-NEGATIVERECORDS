import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AffiliateDirectory() {
  const columns = [
    { key: "clientCode", label: "Client Code", render: (r) => r.clientCode || "—" },
    { key: "name", label: "Client Name" },
    {
      key: "branches",
      label: "Branches",
      render: (r) =>
        r.SubDomains && r.SubDomains.length > 0
          ? r.SubDomains.map((b) => b.name).join(", ")
          : "—",
    },
    {
      key: "contacts",
      label: "Contacts",
      render: (r) =>
        r.Users && r.Users.length > 0
          ? r.Users.map((u) => [u.firstName, u.lastName].filter(Boolean).join(" ")).join(", ")
          : "—",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Affiliate Directory</h2>
      <DataTable columns={columns} fetchUrl="/directory" api={api} />
    </div>
  );
}
