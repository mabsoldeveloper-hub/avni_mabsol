import Link from "next/link";
import { redirect } from "next/navigation";
import { FaArrowLeft, FaDatabase, FaLayerGroup, FaTable } from "react-icons/fa";
import { getVfpTableRows } from "@/lib/vfp/data";
import ProtectedPage from "@/components/ProtectedPage";
import { getCurrentUser } from "@/lib/auth";

type PageProps = {
  params: Promise<{ table: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function toSearchParams(value: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      params.set(key, entry);
    }
  }

  return params;
}

export default async function VfpTablePage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { table } = await params;
  const query = toSearchParams(await searchParams);
  const data = await getVfpTableRows(table, query, user.email);

  if (!data.table) {
    return (
      <ProtectedPage permission="vfp.view">
        <div className="container-fluid p-0">
          <Link className="btn btn-outline-secondary btn-sm mb-3 d-inline-flex align-items-center" href="/dashboard/mabsolcrmsync">
            <FaArrowLeft className="me-2" />
            Back to Mabsol CRM Sync
          </Link>
          <div className="alert alert-warning d-flex align-items-center gap-3 border-0 shadow-sm">
            <FaArrowLeft className="fs-4 flex-shrink-0" />
            <div>
              This table is not available yet. Start the sync worker and run a rescan.
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  const visibleColumns =
    data.table.columns.length > 0
      ? data.table.columns.slice(0, 16).map((column) => column.name)
      : Object.keys(data.rows[0] || {})
          .filter((key) => !key.startsWith("_"))
          .slice(0, 16);

  const previousPage = Math.max(data.page - 1, 1);
  const nextPage = Math.min(data.page + 1, Math.max(data.totalPages, 1));

  return (
    <ProtectedPage permission="vfp.view">
      <div className="container-fluid p-0">
        
        {/* Page Toolbar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <Link className="btn btn-outline-secondary btn-sm mb-3 d-inline-flex align-items-center" href="/dashboard/mabsolcrmsync">
              <FaArrowLeft className="me-2" /> Back to Mabsol CRM Sync
            </Link>
            <div className="d-flex align-items-center text-primary fw-bold mb-2 text-uppercase tracking-wider" style={{ fontSize: "0.8rem" }}>
              <FaTable className="me-2" /> Synced DBF Data
            </div>
            <h1 className="h3 fw-bold mb-1 text-dark">{data.table.tableName}</h1>
            <p className="text-secondary small mb-0">
              Imported rows fetched from MongoDB collection{" "}
              <span className="fw-semibold font-monospace">{data.table.targetCollection}</span>.
            </p>
          </div>
          <div className="bg-light p-3 rounded border text-center text-md-end">
            <div className="fs-3 fw-bold text-primary">{data.total}</div>
            <div className="text-secondary small fw-semibold">synced row(s)</div>
          </div>
        </div>

        {/* Table summary card */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3 bg-white h-100">
              <div className="text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                <FaDatabase className="text-primary" /> Target Collection
              </div>
              <div className="h5 fw-bold mb-0 text-dark font-monospace text-truncate">{data.table.targetCollection}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3 bg-white h-100">
              <div className="text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                <FaLayerGroup className="text-primary" /> Columns Count
              </div>
              <div className="h5 fw-bold mb-0 text-dark">{data.table.columns.length}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3 bg-white h-100">
              <div className="text-secondary fw-semibold small mb-2 d-flex align-items-center gap-2">
                <FaTable className="text-primary" /> Pagination Page
              </div>
              <div className="h5 fw-bold mb-0 text-dark">
                {data.page} / {Math.max(data.totalPages, 1)}
              </div>
            </div>
          </div>
        </div>

        {/* Rows Card */}
        <div className="card border-0 shadow-sm bg-white mb-4">
          <div className="card-header bg-white border-0 pt-4 px-4">
            <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
              <FaTable className="text-primary" />
              Rows Content
            </h5>
            <p className="text-secondary small mb-0">Showing up to {data.limit} records per page.</p>
          </div>
          <div className="card-body px-0 py-2">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-uppercase font-monospace" style={{ fontSize: "0.75rem" }}>
                  <tr>
                    <th className="ps-4" style={{ width: "60px" }}>#</th>
                    {visibleColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td className="text-center text-muted p-4" colSpan={visibleColumns.length + 1}>
                        No rows imported yet.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, index) => (
                      <tr key={String(row._id || index)}>
                        <td className="text-muted ps-4">
                          {(data.page - 1) * data.limit + index + 1}
                        </td>
                        {visibleColumns.map((column) => (
                          <td 
                            className="text-truncate text-secondary" 
                            key={column} 
                            title={formatCell(row[column])}
                            style={{ maxWidth: "200px" }}
                          >
                            {formatCell(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Toolbar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3 pb-4">
          <div className="text-muted small">
            Page {data.page} of {Math.max(data.totalPages, 1)}
          </div>
          <div className="btn-group">
            <Link
              className={`btn btn-outline-primary ${data.page <= 1 ? "disabled" : ""}`}
              href={`/dashboard/mabsolcrmsync/${encodeURIComponent(
                data.table.tableName
              )}?page=${previousPage}`}
            >
              Previous
            </Link>
            <Link
              className={`btn btn-outline-primary ${
                data.page >= data.totalPages ? "disabled" : ""
              }`}
              href={`/dashboard/mabsolcrmsync/${encodeURIComponent(
                data.table.tableName
              )}?page=${nextPage}`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
