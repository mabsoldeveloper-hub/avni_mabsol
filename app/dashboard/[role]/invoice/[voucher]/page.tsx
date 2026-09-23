"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function InvoicePage() {
  const { voucher } = useParams();

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invoice/${voucher}`)
      .then((r) => r.json())
      .then(setData);
  }, [voucher]);

  if (!data) return <div className="p-4">Loading...</div>;

  return (
    <div className="container-fluid py-3">

      {/* Header */}

      <div className="card shadow-sm mb-3">
        <div className="card-body">

          <div className="d-flex justify-content-between">

            <div>

              <h4>Invoice #{data.header.CHALLAN || data.header.VCN}</h4>

              <p>
                Voucher : {data.header.VOUCHER}
              </p>

              <p>
                Date : {data.header.CHDATE || data.header.DATE}
              </p>

            </div>

            <div className="text-end">

              <h3>
                ₹ {data.summary.total.toLocaleString()}
              </h3>

            </div>

          </div>

        </div>
      </div>

      {/* Customer */}

      <div className="card shadow-sm mb-3">

        <div className="card-body">

          <h5>{data.customer?.NAME}</h5>

          <div>{data.customer?.CITY}</div>

          <div>{data.customer?.GST}</div>

        </div>

      </div>

      {/* Items */}

      <div className="card shadow-sm">

        <div className="card-header">
          Items
        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-sm">

            <thead>

              <tr>

                <th>#</th>

                <th>Product</th>

                <th>Batch</th>

                <th>Expiry</th>

                <th>Qty</th>

                <th>Rate</th>

                <th>GST</th>

                <th>Amount</th>

              </tr>

            </thead>

            <tbody>

              {data.items.map((item: any, i: number) => (

                <tr key={i}>

                  <td>{i + 1}</td>

                  <td>{item.product?.NAME}</td>

                  <td>{item.BATCH}</td>

                  <td>{item.EXP}</td>

                  <td>{item.QTY}</td>

                  <td>{item.RATE}</td>

                  <td>{item.SSTA}%</td>

                  <td>{item.AMMMOUNT}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}