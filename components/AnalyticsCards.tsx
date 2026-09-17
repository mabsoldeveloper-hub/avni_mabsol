"use client";

import {
    Receipt,
    CalendarDays,
    Users,
    Boxes,
    AlertTriangle,
    Clock,
    PiggyBank,
    Target,
    LucideIcon,
} from "lucide-react";

function formatCurrency(n: number) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

type AnalyticsCard = {
    title: string;
    value: string;
    icon: LucideIcon;
    color: string;
};

export default function AnalyticsCards({ analytics }: { analytics: any }) {
    const collectionEfficiency = analytics?.collectionEfficiency ?? 0;

    const cards: AnalyticsCard[] = [
        {
            title: "Average Invoice Value",
            value: formatCurrency(analytics?.avgInvoiceValue),
            icon: Receipt,
            color: "#343872",
        },
        {
            title: "Average Daily Sales",
            value: formatCurrency(analytics?.avgDailySales),
            icon: CalendarDays,
            color: "#3498db",
        },
        {
            title: "Average Customer Sale",
            value: formatCurrency(analytics?.avgCustomerSale),
            icon: Users,
            color: "#9b59b6",
        },
        {
            title: "Stock Value",
            value: formatCurrency(analytics?.stockValue),
            icon: Boxes,
            color: "#1abc9c",
        },
        {
            title: "Expired Stock Value",
            value: formatCurrency(analytics?.expiredStockValue),
            icon: AlertTriangle,
            color: "#e74c3c",
        },
        {
            title: "Near Expiry Stock Value",
            value: formatCurrency(analytics?.nearExpiryStockValue),
            icon: Clock,
            color: "#f1c40f",
        },
        {
            title: "Gross Estimated Margin",
            value: formatCurrency(analytics?.grossMargin),
            icon: PiggyBank,
            color: "#2ecc71",
        },
        {
            title: "Collection Efficiency",
            value: `${collectionEfficiency.toFixed(1)}%`,
            icon: Target,
            color: "#fb8c00",
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .liquid-glass-card {
                    background:
                        linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.28) 100%);
                    backdrop-filter: blur(24px) saturate(180%) brightness(1.05);
                    -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.05);
                    box-shadow:
                        inset 0 1px 1px rgba(255,255,255,0.9),
                        inset 0 -8px 16px -8px rgba(255,255,255,0.4),
                        inset 0 -1px 2px rgba(0,0,0,0.05),
                        0 1px 1px rgba(255,255,255,0.6),
                        0 10px 30px -8px rgba(31,38,135,0.14),
                        0 2px 8px rgba(31,38,135,0.06);
                    border: 1px solid rgba(255,255,255,0.5);
                }
                .liquid-glass-card:hover {
                    box-shadow:
                        inset 0 1px 1px rgba(255,255,255,0.95),
                        inset 0 -8px 16px -8px rgba(255,255,255,0.5),
                        inset 0 -1px 2px rgba(0,0,0,0.05),
                        0 1px 1px rgba(255,255,255,0.7),
                        0 20px 45px -10px rgba(31,38,135,0.22),
                        0 4px 14px rgba(31,38,135,0.1);
                }
                .liquid-glass-specular {
                    background: radial-gradient(120% 100% at 18% 0%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 30%, transparent 60%);
                    mix-blend-mode: screen;
                }
            `}</style>
            {cards.map((card, i) => (
                <div
                    key={i}
                    style={{ "--accent": card.color, animationDelay: `${i * 55}ms` } as React.CSSProperties}
                    className="
                        liquid-glass-card group relative isolate flex cursor-default flex-col justify-between overflow-hidden
                        rounded-xl sm:rounded-[1.35rem]
                        animate-[fadeSlideIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]
                        transition-all duration-150
                        active:scale-[0.99]
                        p-3 sm:p-4 md:p-5 min-h-[84px] sm:min-h-[100px]
                    "
                >
                    {/* specular highlight — simulates light refracting off curved glass top-left */}
                    <div className="liquid-glass-specular pointer-events-none absolute inset-0 rounded-xl sm:rounded-[1.35rem] transition-opacity duration-500 opacity-80 group-hover:opacity-100" />

                    {/* soft colored glow blob rising from beneath the glass */}
                    <div
                        className="pointer-events-none absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-40 scale-90 transition-all duration-700 ease-out group-hover:opacity-70 group-hover:scale-125"
                        style={{ background: `radial-gradient(circle, ${card.color}66, transparent 70%)` }}
                    />

                    {/* razor-thin top edge catch-light */}
                    <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

                    <div className="relative flex items-start justify-between gap-2">
                        <div className="min-w-0 pr-1">
                            <p className="truncate text-[10px] sm:text-[11px] font-medium text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
                                {card.title}
                            </p>
                            <p className="mt-0.5 sm:mt-1 truncate text-sm sm:text-base md:text-xl font-bold text-slate-800 transition-colors duration-300 group-hover:text-[color:var(--accent)]">
                                {card.value}
                            </p>
                        </div>
                        <div
                            className="
                                relative flex h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl
                                bg-white/50 backdrop-blur-md
                                shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.06)]
                                border border-white/60
                                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                                group-hover:scale-110 group-hover:-rotate-6
                                group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.1)]
                            "
                        >
                            <card.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" style={{ color: card.color }} strokeWidth={2} />
                        </div>
                    </div>

                    {/* accent line that grows in on hover */}
                    <div
                        className="relative mt-2 sm:mt-3 h-0.5 w-0 rounded-full transition-all duration-300 ease-out group-hover:w-full"
                        style={{ backgroundColor: card.color }}
                    />
                </div>
            ))}
        </div>
    );
}