"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function VoucherPage() {
  const params = useParams();

  const voucher = params.voucher as string;

  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!voucher) return;

    fetch(`/api/voucher/${voucher}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [voucher]);

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary"></div>
        <h5 className="mt-3">Loading Voucher...</h5>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          Voucher not found.
        </div>
      </div>
    );
  }



  // ==========================================
// Accounting Voucher
// ==========================================

if (data.entries) {
  return (
    <div className="container-fluid py-4">

      <div className="card shadow">

        <div className="card-header bg-success text-white">
          <h4 className="mb-0">
            {data.voucherType} Voucher
          </h4>
        </div>

        <div className="card-body">

          <div className="row mb-4">

            <div className="col-md-3">
              <strong>Voucher</strong>
              <br />
              {data.header.voucher}
            </div>

            <div className="col-md-3">
              <strong>Date</strong>
              <br />
              {data.header.date}
            </div>

            <div className="col-md-6">
              <strong>Narration</strong>
              <br />
              {data.header.narration}
            </div>

          </div>

          <div className="table-responsive">

            <table className="table table-bordered">

              <thead className="table-dark">

                <tr>

                  <th>Ledger</th>

                  <th className="text-end">
                    Debit
                  </th>

                  <th className="text-end">
                    Credit
                  </th>

                </tr>

              </thead>

              <tbody>

                {data.entries.map(
                  (row: any, index: number) => (

                    <tr key={index}>

                      <td>
                        {row.ledger}
                      </td>

                      <td className="text-end">

                        {row.debit > 0
                          ? row.debit.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                              }
                            )
                          : ""}

                      </td>

                      <td className="text-end">

                        {row.credit > 0
                          ? row.credit.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                              }
                            )
                          : ""}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

              <tfoot>

                <tr className="table-success">

                  <th>Total</th>

                  <th className="text-end">

                    {data.totals.debit.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                      }
                    )}

                  </th>

                  <th className="text-end">

                    {data.totals.credit.toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                      }
                    )}

                  </th>

                </tr>

              </tfoot>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

  const colorMap: any = {
    S: "primary",
    P: "success",
    R: "warning",
    B: "danger",
    W: "warning",
    Q: "danger",
    U: "danger",
    u: "warning",
    T: "danger",
    t: "warning",
    J: "secondary",
  };

  const titleMap: any = {
    S: "Sales Invoice",
    P: "Purchase Invoice",
    R: "Sales Return (Credit Note)",
    B: "Purchase Return (Debit Note)",
    W: "Sales Return (Break/Expiry)",
    Q: "Purchase Return (Break/Expiry)",
    U: "Price Difference Debit Note",
    u: "Price Difference Credit Note",
    T: "Purchase Price Difference Debit Note",
    t: "Purchase Price Difference Credit Note",
    J: "Journal Voucher",
  };

  const color =
    colorMap[data.header.type] || "dark";

  const title =
    titleMap[data.header.type] || "Voucher";

  return (
    <div className="container-fluid py-4">

      {/* Header */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>

          <h3 className={`text-${color} fw-bold`}>
            {title}
          </h3>

          <small className="text-muted">
            Universal ERP Voucher Viewer
          </small>

        </div>

        <div>
        {/* <Link
            href="/dashboard/customers/"
            className="btn btn-secondary me-2"
          >
            Back
          </Link> */}
          

          <button
            className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 shadow-sm transition-all cursor-pointer"
            onClick={() => window.print()}
          >
            Print
          </button>

        </div>

      </div>

      {/* Voucher */}

      <div className="card shadow border-0 mb-4">

        <div
          className={`card-header bg-${color} text-white`}
        >
          Voucher Information
        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-3">

              <small>Voucher No</small>

              <h5>{data.header.voucherNo}</h5>

            </div>

            <div className="col-md-3">

              <small>Date</small>

              <h5>{data.header.date}</h5>

            </div>

            <div className="col-md-3">

              <small>Voucher Type</small>

              <h5>{title}</h5>

            </div>

            <div className="col-md-3">

              <small>Amount</small>

              <h4 className="text-success">
                ₹
                {Number(
                  data.header.final
                ).toLocaleString()}
              </h4>

            </div>

          </div>

        </div>

      </div>

      {/* Customer */}

      <div className="card shadow border-0 mb-4">

        <div className="card-header">
          Party Information
        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-4">

              <small>Party</small>

              <h5>
                {data.customer?.name}
              </h5>

            </div>

            <div className="col-md-2">

              <small>Code</small>

              <h6>
                {data.customer?.code}
              </h6>

            </div>

            <div className="col-md-2">

              <small>City</small>

              <h6>
                {data.customer?.city}
              </h6>

            </div>

            <div className="col-md-2">

              <small>GST</small>

              <h6>
                {data.customer?.gst}
              </h6>

            </div>

            <div className="col-md-2">

              <small>DL</small>

              <h6>
                {data.customer?.dl}
              </h6>

            </div>

          </div>

        </div>

      </div>

      {/* Items */}

      <div className="card shadow border-0">

        <div className="card-header">

          Items

        </div>

        <div className="table-responsive">

          <table className="table table-hover mb-0">

          <thead className="table-dark">
  <tr>
    <th>#</th>
    <th>Product</th>
    <th>Batch</th>
    <th>Expiry</th>
    <th className="text-end">Qty</th>
    <th className="text-end">Free</th>
    <th className="text-end">Rate</th>
    <th className="text-end">MRP</th>
    <th className="text-end">GST %</th>
    <th className="text-end">Taxable</th>
    <th className="text-end">Tax</th>
    <th className="text-end">Total</th>
  </tr>
</thead>

<tbody>
  {data.items.map((row: any, index: number) => (
    <tr key={index}>
      <td>{index + 1}</td>

      <td>
        <div className="fw-semibold">{row.product}</div>

        <small className="text-muted">
          {row.packing}
        </small>
      </td>

      <td>{row.batch}</td>

      <td>{row.exp}</td>

      <td className="text-end">
        {row.qty}
      </td>

      <td className="text-end">
        {row.free}
      </td>

      <td className="text-end">
        ₹{row.rate.toFixed(2)}
      </td>

      <td className="text-end">
        ₹{row.mrp.toFixed(2)}
      </td>

      <td className="text-end">
        <span className="badge bg-info">
          {row.gstPercent}%
        </span>
      </td>

      <td className="text-end">
        ₹{row.taxableAmount.toFixed(2)}
      </td>

      <td className="text-end">
        ₹{row.taxAmount.toFixed(2)}
      </td>

      <td className="text-end fw-bold">
        ₹{row.amount.toFixed(2)}
      </td>
    </tr>
  ))}
</tbody>

          </table>

        </div>

      </div>

      {/* Totals */}


      <div className="card shadow border-0 mt-4">

<div className="card-header fw-bold">
  GST Summary
</div>

<div className="card-body">

  <div className="row text-center">

    <div className="col-md-3">
      <h6>CGST</h6>
      <h4 className="text-primary">
        ₹{data.totals.cgst.toFixed(2)}
      </h4>
    </div>

    <div className="col-md-3">
      <h6>SGST</h6>
      <h4 className="text-success">
        ₹{data.totals.sgst.toFixed(2)}
      </h4>
    </div>

    <div className="col-md-3">
      <h6>IGST</h6>
      <h4 className="text-danger">
        ₹{data.totals.igst.toFixed(2)}
      </h4>
    </div>

    <div className="col-md-3">
      <h6>Total GST</h6>
      <h4 className="text-warning">
        ₹{data.totals.totalTax.toFixed(2)}
      </h4>
    </div>

  </div>

</div>

</div>




      <div className="row mt-4">

  <div className="col-lg-5 ms-auto">

    <div className="card shadow">

      <div className="card-header fw-bold">
        Invoice Summary
      </div>

      <div className="card-body p-0">

        <table className="table table-bordered mb-0">

          <tbody>

            <tr>
              <td>Total Qty</td>
              <td className="text-end">
                {data.totals.qty}
              </td>
            </tr>

            <tr>
              <td>Total Free</td>
              <td className="text-end">
                {data.totals.free}
              </td>
            </tr>

            <tr>
              <td>Taxable Amount</td>
              <td className="text-end">
                ₹{data.totals.taxableAmount.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </td>
            </tr>

            <tr>
              <td>CGST</td>
              <td className="text-end">
                ₹{data.totals.cgst.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </td>
            </tr>

            <tr>
              <td>SGST</td>
              <td className="text-end">
                ₹{data.totals.sgst.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </td>
            </tr>

            <tr>
              <td>IGST</td>
              <td className="text-end">
                ₹{data.totals.igst.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </td>
            </tr>

            <tr className="table-warning">

              <th>Total Tax</th>

              <th className="text-end">
                ₹{data.totals.totalTax.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </th>

            </tr>

            <tr className="table-success">

              <th>Grand Total</th>

              <th className="text-end fs-5">
                ₹{data.totals.grandTotal.toLocaleString(undefined,{
                  minimumFractionDigits:2
                })}
              </th>

            </tr>

          </tbody>

        </table>

      </div>

    </div>

  </div>

</div>

    </div>
  );
}