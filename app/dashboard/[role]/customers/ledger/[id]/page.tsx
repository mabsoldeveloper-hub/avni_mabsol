"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomerLedgerPage() {
  const params = useParams();
  const id = params.id as string;
 // const code = params.code as string;
 

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const [view, setView] = useState<"ledger" | "sales" | "outstanding">("ledger");


  useEffect(() => {
    if (!id) return;

fetch(`/api/customers/ledger/${id}`)
    

      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center">
          <div className="spinner-border text-primary"></div>
          <p className="mt-3">Loading Ledger...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          Ledger not found.
        </div>
      </div>
    );
  }


  


  const rows =
  view === "ledger"
    ? data?.ledger || []
    : view === "sales"
    ? data?.sales || []
    : data?.outstanding || [];

  return (
    <div className="container-fluid py-4">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold">
            Customer Ledger
          </h3>

          <small className="text-muted">
            Complete Ledger Statement
          </small>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers"
            className="px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
          >
            Back
          </Link>

          <button
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 shadow-sm transition-all cursor-pointer"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>

      {/* Customer Card */}



<div className="card shadow-sm border-0 mb-4">
  <div className="card-header bg-primary text-white fw-bold">
    Customer Information
  </div>

  <div className="card-body">
    <div className="row g-4">

      <div className="col-md-4">
        <small className="text-muted">Customer Name</small>
        <h5 className="fw-bold mb-0">
          {data.customer?.name}
        </h5>
      </div>

      {/* <div className="col-md-2">
        <small className="text-muted">Code</small>
        <h6>{data.customer?.code}</h6>
      </div> */}

      <div className="col-md-2">
        <small className="text-muted">City</small>
        <h6>{data.customer?.city || "-"}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">GST No</small>
        <h6>{data.customer?.gst || "-"}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">Current Balance</small>

        <h5 className="text-danger fw-bold">
          ₹
          {Number(
            data.customer?.currentBalance || 0
          ).toLocaleString()}
        </h5>

      </div>

      <div className="col-md-2">
        <small className="text-muted">Last Bill</small>
        <h6>{data.summary?.lastBillNo || "-"}</h6>
      </div>

      <div className="col-md-2">
        <small className="text-muted">Last Bill Date</small>
        <h6>{data.summary?.lastBillDate || "-"}</h6>
      </div>

    </div>
  </div>
</div>

      {/* Summary */}
      <div className="row g-3 mb-4">

  {/* Total Bills */}
  <div className="col-lg-3 col-md-6">
    <div
      className="card shadow-sm h-100 border-0"
      style={{ cursor: "pointer" }}
      onClick={() => setView("ledger")}
    >
      <div className="card-body text-center">
        <small className="text-muted">Total Bills</small>
        {/* <h3> {data.ledger?.length || 0}</h3> */}
        <h3>{data.summary?.totalBills || 0}</h3>
      </div>
    </div>
  </div>

  {/* Total Sales */}
  <div className="col-lg-3 col-md-6">
    <div className="card shadow-sm h-100 border-0">
      <div className="card-body text-center">
        <small className="text-muted">Total Sales</small>
        <h3 className="text-success">
          ₹{Number(data.summary?.totalSales || 0).toLocaleString()}
        </h3>
      </div>
    </div>
  </div>

  {/* Outstanding Bills */}
  <div className="col-lg-3 col-md-6">
    <div
      className="card shadow-sm h-100 border-0"
      style={{ cursor: "pointer" }}
      onClick={() => setView("outstanding")}
    >
      <div className="card-body text-center">
        <small className="text-muted">Outstanding Bills</small>
        <h3 className="text-danger">
          {data.summary?.outstandingBills || 0}
        </h3>
      </div>
    </div>
  </div>

  {/* Outstanding Amount */}
  <div className="col-lg-3 col-md-6">
    <div className="card shadow-sm h-100 border-0">
      <div className="card-body text-center">
        <small className="text-muted">Outstanding Amount</small>
        <h3 className="text-danger">
          ₹{Number(data.summary?.outstandingAmount || 0).toLocaleString()}
        </h3>
      </div>
    </div>
  </div>

  {/* Opening */}
  <div className="col-lg-3 col-md-6">
    <div className="card shadow-sm border-0">
      <div className="card-body text-center">
        <small className="text-muted">Opening Balance</small>
        <h4>
          ₹{Number(data.summary?.opening || 0).toLocaleString()}
        </h4>
      </div>
    </div>
  </div>

  {/* Debit */}
  <div className="col-lg-3 col-md-6">
    <div className="card shadow-sm border-0">
      <div className="card-body text-center">
        <small className="text-muted">Debit</small>
        <h4 className="text-danger">
          ₹{Number(data.summary?.debit || 0).toLocaleString()}
        </h4>
      </div>
    </div>
  </div>

  {/* Credit */}
  <div className="col-lg-3 col-md-6">
    <div className="card shadow-sm border-0">
      <div className="card-body text-center">
        <small className="text-muted">Credit</small>
        <h4 className="text-success">
          ₹{Number(data.summary?.credit || 0).toLocaleString()}
        </h4>
      </div>
    </div>
  </div>

  {/* Ledger Balance */}
  <div className="col-lg-3 col-md-6">
    <div
      className="card shadow-sm border-0"
      style={{ cursor: "pointer" }}
      onClick={() => setView("ledger")}
    >
      <div className="card-body text-center">
        <small className="text-muted">Ledger Balance</small>
        <h4 className="text-primary">
          ₹{Number(data.summary?.ledgerBalance || 0).toLocaleString()}
        </h4>
      </div>
    </div>
  </div>

</div>























      {/* Ledger */}


      <div className="card shadow">

      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">

      <div>
        <h6 className="mb-0">

          {view === "ledger" && "Ledger Register"}

          {view === "sales" && "Sales Register"}

          {view === "outstanding" && "Outstanding Register"}

        </h6>

        <small>

          Total Records : {rows.length}

        </small>
      </div>

<div className="flex items-center gap-1.5">

  <button
    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
      view === "ledger"
        ? "bg-amber-500 text-white shadow-xs"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`}
    onClick={() => setView("ledger")}
  >
    Ledger
  </button>

  <button
    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
      view === "sales"
        ? "bg-amber-500 text-white shadow-xs"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`}
    onClick={() => setView("sales")}
  >
    Sales
  </button>

  <button
    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
      view === "outstanding"
        ? "bg-amber-500 text-white shadow-xs"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`}
    onClick={() => setView("outstanding")}
  >
    Outstanding
  </button>

</div>

</div>

      

        <div className="table-responsive">

          {/* <table className="table table-bordered table-hover mb-0"> */}
          <table className="table table-hover align-middle mb-0">

          <thead className="table-dark">

            {view === "ledger" ? (

            <tr>

            <th>Date</th>

            <th>Voucher</th>

            <th>Bill No</th>

            <th>Particulars</th>

            <th className="text-end">Debit</th>

            <th className="text-end">Credit</th>

            <th className="text-end">Balance</th>

            </tr>

            ) : (

            <tr>

            <th>Date</th>

            <th>Voucher</th>

            <th>Bill No</th>

            <th className="text-end">Amount</th>

            <th className="text-end">Received</th>

            <th className="text-end">Pending</th>

            <th>Status</th>

            </tr>

            )}

            </thead>

            <tbody>
              {/* {data.ledger?.length > 0 ? (

                data.map((row: any, index: number) => ( */}

                {rows.length > 0 ? (

                rows.map((row:any,index:number)=>

                  <tr key={index}
                    style={{
                      cursor: "pointer"
                    }}
                    onClick={() =>
                      //router.push(`/dashboard/invoice/${row.voucher}`)
                     router.push(`/dashboard/voucher/${row.voucher}`)
                    }
                  >
                  

                    {view==="ledger" ? (

                    <>

                    <td>{row.date}</td>

                    <td className="fw-bold text-primary">

                    {row.voucher}

                    </td>

                    <td>{row.billNo}</td>

                    <td>{row.particulars}</td>

                    <td className="text-end text-danger">

                    {row.debit>0
                    ?Number(row.debit).toLocaleString()
                    :"-"}

                    </td>

                    <td className="text-end text-success">

                    {row.credit>0
                    ?Number(row.credit).toLocaleString()
                    :"-"}

                    </td>

                    <td className="text-end fw-bold">

                    {Number(row.balance).toLocaleString()}

                    </td>

                    </>

                    ):(

                    <>

                    <td>{row.date}</td>

                    <td className="fw-bold text-primary">

                    {row.voucher}

                    </td>

                    <td>{row.billNo}</td>

                    <td className="text-end">

                    ₹{Number(row.amount).toLocaleString()}

                    </td>

                    <td className="text-end text-success">

                    ₹{Number(row.received).toLocaleString()}

                    </td>

                    <td className="text-end text-danger">

                    ₹{Number(row.pending).toLocaleString()}

                    </td>

                    <td>

                    <span
                    className={`badge ${
                    row.status==="Paid"
                    ?"bg-success"
                    :row.status==="Partial"
                    ?"bg-warning text-dark"
                    :"bg-danger"
                    }`}
                    >

                    {row.status}

                    </span>

                    </td>

                    </>

                    )}
                </tr>

                )

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="text-center py-4"
                  >
                    No Ledger Found
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}