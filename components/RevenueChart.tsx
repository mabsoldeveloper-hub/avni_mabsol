"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const data = [
  { month: "Jan", sales: 12000 },
  { month: "Feb", sales: 18000 },
  { month: "Mar", sales: 15000 },
  { month: "Apr", sales: 28000 },
  { month: "May", sales: 35000 },
  { month: "Jun", sales: 42000 },
];

export default function RevenueChart() {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h5>Revenue Overview</h5>

        <ResponsiveContainer
          width="100%"
          height={300}
          minWidth={0}
        >
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="sales"
              stroke="#0d6efd"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>

      </div>
    </div>
  );
}