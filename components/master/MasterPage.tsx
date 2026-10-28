"use client";

import Link from "next/link";
import React from "react";
import {
    FaBoxOpen,
    FaUsers,
    FaBarcode,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaSitemap,
    FaArrowRight,
    FaLayerGroup,
    FaCheckCircle,
    FaBuilding,
    FaNetworkWired,
    FaTag,
    FaBoxes,
    FaUserCheck,
    FaUserTie,
    FaWarehouse,
    FaCalculator,
    FaCubes,
    FaBullseye,
    FaGift,
    // FaBell
} from "react-icons/fa";

/* ─────────────────────────── colour tokens ─────────────────────────── */
const colorMap = {
    indigo: { iconText: "text-indigo-600", glowFrom: "from-indigo-400/40", ring: "ring-indigo-300/40" },
    cyan: { iconText: "text-cyan-600", glowFrom: "from-cyan-400/40", ring: "ring-cyan-300/40" },
    emerald: { iconText: "text-emerald-600", glowFrom: "from-emerald-400/40", ring: "ring-emerald-300/40" },
    amber: { iconText: "text-amber-600", glowFrom: "from-amber-400/40", ring: "ring-amber-300/40" },
    violet: { iconText: "text-violet-600", glowFrom: "from-violet-400/40", ring: "ring-violet-300/40" },
    rose: { iconText: "text-rose-600", glowFrom: "from-rose-400/40", ring: "ring-rose-300/40" },
    teal: { iconText: "text-teal-600", glowFrom: "from-teal-400/40", ring: "ring-teal-300/40" },
    orange: { iconText: "text-orange-600", glowFrom: "from-orange-400/40", ring: "ring-orange-300/40" },
};

type ColorKey = keyof typeof colorMap;

interface MasterItem {
    title: string;
    desc: string;
    icon: React.ReactNode;
    link: string;
    color: ColorKey;
}

/* ─────────────────────── hierarchy roadmap data ───────────────────── */
const hierarchyPhases = [
    { phase: 1, title: "Company", status: "Done", icon: <FaBuilding className="text-emerald-600" />, link: "/dashboard/master/fetch-company-master" },
    { phase: 2, title: "Division", status: "Done", icon: <FaSitemap className="text-emerald-600" />, link: "/dashboard/master/division-master" },
    { phase: 3, title: "Sub Division", status: "Active", icon: <FaNetworkWired className="text-indigo-600" />, link: "/dashboard/master/sub-division-master" },
    { phase: 4, title: "Category", status: "Active", icon: <FaTag className="text-indigo-600" />, link: "/dashboard/master/category-master" },
    { phase: 5, title: "Product", status: "Done", icon: <FaBoxes className="text-emerald-600" />, link: "/dashboard/master/product-master" },
    { phase: 6, title: "Customer", status: "Done", icon: <FaUserCheck className="text-emerald-600" />, link: "/dashboard/master/customer-master" },
    { phase: 7, title: "Salesman (MR)", status: "Done", icon: <FaUserTie className="text-teal-600" />, link: "/dashboard/master/mr-territory" },
];

/* ─────────────────────────── master groups ─────────────────────────── */
const inventoryMasters: MasterItem[] = [
    {
        title: "Product Master",
        desc: "Manage products & inventory catalog",
        icon: <FaBoxOpen size={16} />,
        link: "/dashboard/master/product-master",
        color: "indigo",
    },
    {
        title: "Category Master",
        desc: "Manage product categories & sub-groups",
        icon: <FaTag size={16} />,
        link: "/dashboard/master/category-master",
        color: "teal",
    },
    {
        title: "HSN Master",
        desc: "Manage HSN / SAC codes & tax slabs",
        icon: <FaBarcode size={16} />,
        link: "/dashboard/master/hsn-master",
        color: "orange",
    },
    {
        title: "Division Master",
        desc: "Manage business divisions & business units",
        icon: <FaSitemap size={16} />,
        link: "/dashboard/master/division-master",
        color: "violet",
    },
    {
        title: "Sub Division Master",
        desc: "Manage sub divisions & specialized groups",
        icon: <FaNetworkWired size={16} />,
        link: "/dashboard/master/sub-division-master",
        color: "indigo",
    },
];

const accountMasters: MasterItem[] = [
    {
        title: "Accounting Group",
        desc: "Manage accounting groups & ledger heads",
        icon: <FaLayerGroup size={16} />,
        link: "/dashboard/master/accounting-group-master",
        color: "rose",
    },
    {
        title: "Customer Master",
        desc: "Manage customer ledgers, chemists & stockists",
        icon: <FaUsers size={16} />,
        link: "/dashboard/master/customer-master",
        color: "cyan",
    },
    {
        title: "Sales Person (M.R./S.R.)",
        desc: "Manage sales representatives & users",
        icon: <FaUserTie size={16} />,
        link: "/dashboard/users",
        color: "emerald",
    },
    {
        title: "Area Master",
        desc: "Manage beats, areas & territories",
        icon: <FaMapMarkedAlt size={16} />,
        link: "/dashboard/master/area-master",
        color: "amber",
    },
    {
        title: "MR Territory Master",
        desc: "Assign product & territory scope to MRs",
        icon: <FaMapMarkerAlt size={16} />,
        link: "/dashboard/master/mr-territory",
        color: "teal",
    },
    {
        title: "MR Customer Master",
        desc: "Directly assign specific customers & parties to MRs",
        icon: <FaUserCheck size={16} />,
        link: "/dashboard/master/mr-customer",
        color: "emerald",
    },
    {
        title: "Sales Hierarchy Master",
        desc: "ZSM → RSM → MR reporting chain",
        icon: <FaSitemap size={16} />,
        link: "/dashboard/master/sales-hierarchy",
        color: "violet",
    },
    {
        title: "Target & Gift Master",
        desc: "MR & Customer sales targets, achievements & gift schemes",
        icon: <FaBullseye size={16} />,
        link: "/dashboard/master/targets",
        color: "rose",
    },
    //     {
    //     title: "Alert & Notification Engine",
    //     desc: "Automated payment reminders, WhatsApp & email notifications",
    //     icon: <FaBell size={16} />,
    //     link: "/dashboard/master/alert-settings",
    //     color: "amber",
    // },
// 
    // {
    //     title: "MR Daily Reporting (DCR)",
    //     desc:  "Doctor visits, chemist calls, POB & approvals",
    //     icon:  <FaUserTie size={16} />,
    //     link:  "/dashboard/mr-reporting",
    //     color: "emerald",
    // },
];



/* ──────────────────────── reusable card renderer ───────────────────── */
function MasterCardGrid({ items }: { items: MasterItem[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {items.map((master, index) => {
                const c = colorMap[master.color];
                return (
                    <Link
                        key={index}
                        href={master.link}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={`
                            group relative isolate overflow-hidden rounded-2xl block
                            bg-white/60 backdrop-blur-xl backdrop-saturate-150
                            border border-slate-200/80
                            shadow-[0_4px_20px_rgba(0,0,0,0.04)]
                            ring-1 ${c.ring}
                            animate-[fadeSlideIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]
                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                            hover:-translate-y-1.5
                            hover:scale-[1.02]
                            hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]
                            active:scale-[0.98]
                            cursor-pointer
                            p-4
                        `}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-slate-50/50 pointer-events-none" />
                        <div
                            className={`
                                absolute -top-6 -right-6 w-20 h-20 rounded-full
                                bg-gradient-to-br ${c.glowFrom} to-transparent
                                blur-2xl opacity-40 scale-90
                                transition-all duration-700 ease-out
                                group-hover:opacity-80 group-hover:scale-125
                                pointer-events-none
                            `}
                        />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent pointer-events-none" />

                        <div className="relative flex flex-col items-center text-center gap-3">
                            <div
                                className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center
                                    bg-white border border-slate-200 shadow-sm
                                    ${c.iconText}
                                    transition-all duration-500
                                    group-hover:scale-110 group-hover:rotate-6
                                `}
                            >
                                {master.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">{master.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">{master.desc}</p>
                                <div className={`inline-flex items-center gap-1 mt-3 text-xs font-medium ${c.iconText}`}>
                                    Open Master <FaArrowRight size={8} />
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

/* ──────────────────────── section header helper ────────────────────── */
interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    badge: string;
    badgeCls: string;
    borderCls: string;
    count: number;
}

function SectionHeader({ icon, title, subtitle, badge, badgeCls, borderCls, count }: SectionHeaderProps) {
    return (
        <div className={`flex items-center gap-3 mb-4 pb-3 border-b-2 ${borderCls}`}>
            <span className="text-slate-600 text-base">{icon}</span>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>{badge}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{count} module{count !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
        </div>
    );
}

/* ─────────────────────────── main component ────────────────────────── */
export default function MasterPage() {
    return (
        <div className="p-4 space-y-8">

            {/* ── Hierarchy Roadmap Banner ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 p-6 text-slate-800 shadow-sm border border-indigo-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Architecture Hierarchy
                            </span>
                            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Phase 1 to Phase 7 Configured
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight mt-1.5 text-slate-900">
                            Master Hierarchy Roadmap
                        </h2>
                        <p className="text-sm text-slate-600 mt-0.5">
                            Company → Division → Sub Division → Category → Product → Customer → Salesman (MR)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    {hierarchyPhases.map((item, idx) => {
                        const isDone = item.status === "Done";
                        const isActive = item.status === "Active";

                        const cardContent = (
                            <div
                                className={`
                                    relative p-3 rounded-xl transition-all duration-300 border
                                    text-center flex flex-col items-center justify-between h-full min-h-[110px]
                                    ${isDone
                                        ? "bg-white border-emerald-200 text-slate-800 hover:border-emerald-400 shadow-sm hover:shadow-md hover:scale-[1.02]"
                                        : isActive
                                            ? "bg-white border-indigo-300 text-indigo-900 ring-2 ring-indigo-400/40 shadow-md scale-[1.03]"
                                            : "bg-slate-50/60 border-slate-200 text-slate-500 hover:border-slate-300"
                                    }
                                `}
                            >
                                <div className="flex items-center justify-between w-full text-[10px] uppercase font-bold text-slate-500 mb-1">
                                    <span>P{item.phase}</span>
                                    {isDone && <FaCheckCircle className="text-emerald-500 text-xs" />}
                                    {isActive && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                                        </span>
                                    )}
                                </div>
                                <div className="my-1 text-lg">{item.icon}</div>
                                <div className="font-semibold text-xs leading-tight text-slate-800">{item.title}</div>
                                <div className="mt-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${isDone ? "bg-emerald-100 text-emerald-700"
                                        : isActive ? "bg-indigo-100 text-indigo-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}>
                                        {isDone ? "Active ✅" : "Configured 🚀"}
                                    </span>
                                </div>
                            </div>
                        );

                        return item.link ? (
                            <Link key={idx} href={item.link} className="block">{cardContent}</Link>
                        ) : (
                            <div key={idx}>{cardContent}</div>
                        );
                    })}
                </div>
            </div>

            {/* ══ SECTION 1 · INVENTORY MASTER (INVENTORY RELATED MASTERS) ══ */}
            <div>
                <SectionHeader
                    icon={<FaWarehouse />}
                    title="Inventory Master (Inventory Related Masters)"
                    subtitle="Products, Categories, HSN Codes, GST Slabs, Divisions & Sub Divisions"
                    badge="Inventory"
                    badgeCls="bg-teal-100 text-teal-700 border-teal-200"
                    borderCls="border-teal-200"
                    count={inventoryMasters.length}
                />
                <MasterCardGrid items={inventoryMasters} />
            </div>

            {/* ══ SECTION 2 · ACCOUNT MASTER (ACCOUNT RELATED MASTERS) ══ */}
            <div>
                <SectionHeader
                    icon={<FaCalculator />}
                    title="Account Master (Account Related Masters)"
                    subtitle="Accounting Groups, Customers, Sales Force (MR/SR), Areas, Territory Scope & Hierarchy Chain"
                    badge="Account"
                    badgeCls="bg-indigo-100 text-indigo-700 border-indigo-200"
                    borderCls="border-indigo-200"
                    count={accountMasters.length}
                />
                <MasterCardGrid items={accountMasters} />
            </div>


            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)     scale(1);    }
                }
            `}</style>
        </div>
    );
}
