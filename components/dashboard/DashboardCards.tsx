"use client";

import { FaUsers, FaUserTie, FaRupeeSign, FaChartLine } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function DashboardCards() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    setSummary(data);
  };

  const cards = [
    {
      title: "Employees",
      value: summary?.employees ?? 0,
      icon: <FaUsers size={26} />,
    },
    {
      title: "Customers",
      value: summary?.customers ?? 0,
      icon: <FaUserTie size={26} />,
    },
    {
      title: "Products",
      value: summary?.products ?? 0,
      icon: <FaChartLine size={26} />,
    },
    {
      title: "Companies",
      value: summary?.companies ?? 0,
      icon: <FaUsers size={26} />,
    },
    {
      title: "Outstanding",
      value: "₹" + Number(summary?.outstanding || 0).toLocaleString(),
      icon: <FaRupeeSign size={26} />,
    },
    {
      title: "Credit",
      value: "₹" + Number(summary?.credit || 0).toLocaleString(),
      icon: <FaRupeeSign size={26} />,
    },
    {
      title: "Debit",
      value: "₹" + Number(summary?.debit || 0).toLocaleString(),
      icon: <FaRupeeSign size={26} />,
    },
    {
      title: "Active Customers",
      value: summary?.activeCustomers ?? 0,
      icon: <FaUserTie size={26} />,
    },
  ];

  return (
    <>
      <style jsx>{`
        .dashboard-card {
          background: #343872;
          border-radius: 18px;
          color: #fff;
          min-height: 120px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .dashboard-card:hover {
          background: #fb8c00;
          transform: translateY(-6px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .icon-box {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
        }

        .card-title {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }
      `}</style>

      <div className="row g-4">
        {cards.map((card, index) => (
          <div className="col-xl-3 col-lg-4 col-md-6 col-12" key={index}>
            <div className="card border-0 shadow dashboard-card">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="card-title">{card.title}</div>
                    <h3 className="card-value">{card.value}</h3>
                  </div>

                  <div className="icon-box">{card.icon}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}