"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";

/* useLayoutEffect throws a warning during SSR, so fall back to useEffect there. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "idle" | "hidden" | "visible";

/**
 * Reveal-on-scroll hook.
 * - Elements already inside the viewport on mount become visible immediately
 *   (no flash of invisible content on first paint).
 * - Elements below the fold start hidden and animate in once they intersect.
 */
function useReveal<T extends HTMLElement = HTMLElement>(
  threshold = 0.15
): [RefObject<T | null>, RevealState] {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("idle");

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("visible");
      return undefined;
    }

    const rect = node.getBoundingClientRect();
    const alreadyInView =
      rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;

    if (alreadyInView) {
      setState("visible");
      return undefined;
    }

    setState("hidden");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, state];
}

/* ============================================================
   NETWORK FIELD — a slowly rotating 3D sphere of connected nodes,
   rendered on a fixed full-viewport canvas so it runs continuously
   behind the whole page (not just the hero) as the user scrolls.
   Nodes are generated once on a sphere (Fibonacci distribution),
   nearest-neighbour edges are computed once, and every frame we
   just rotate + project that fixed structure — cheap, and it reads
   as a genuine 3D object rather than random floating dots.
   ============================================================ */
type Point3 = { x: number; y: number; z: number };

function fibonacciSphere(count: number, radius: number): Point3[] {
  const pts: Point3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1..1
    const r = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    pts.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return pts;
}

function nearestNeighborEdges(pts: Point3[], k: number): [number, number][] {
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pts.length; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dz = pts[i].z - pts[j].z;
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let n = 0; n < k; n++) {
      const j = dists[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  }
  return edges;
}

function NetworkField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const NODE_COUNT = 60;
    const points = fibonacciSphere(NODE_COUNT, 1);
    const edges = nearestNeighborEdges(points, 2);

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let angleY = 0;
    let angleX = 0.4;
    let raf = 0;
    let visible = true;

    function draw(t: number) {
      if (!ctx) return;
      const isMobile = width < 768;
      const cx = isMobile ? width * 0.5 : width * 0.72;
      const cy = isMobile ? height * 0.28 : height * 0.34;
      const radius = Math.min(width, height) * (isMobile ? 0.38 : 0.42);
      const fov = radius * 2.6;

      if (!reduced) {
        angleY = t * 0.00012;
        angleX = 0.4 + Math.sin(t * 0.00007) * 0.12;
      }

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const projected = points.map((p) => {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 * radius);
        return {
          x: cx + x1 * radius * scale,
          y: cy + y2 * radius * scale,
          scale,
        };
      });

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      edges.forEach(([a, b]) => {
        const pa = projected[a];
        const pb = projected[b];
        const avgScale = (pa.scale + pb.scale) / 2;
        const opacity = Math.max(0, Math.min(0.15, (avgScale - 0.7) * 0.35));
        ctx.strokeStyle = `rgba(52, 56, 114, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      projected.forEach((p, i) => {
        const size = Math.max(0.6, (p.scale - 0.6) * 3);
        const isOrange = i % 5 === 0;
        const opacity = Math.max(0.08, Math.min(0.75, (p.scale - 0.55) * 1.5));
        ctx.beginPath();
        ctx.fillStyle = isOrange
          ? `rgba(251, 140, 0, ${opacity})`
          : `rgba(102, 104, 160, ${opacity})`;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!reduced && visible) {
        raf = requestAnimationFrame(draw);
      }
    }

    raf = requestAnimationFrame(draw);

    function handleVisibility() {
      visible = document.visibilityState === "visible";
      if (visible && !reduced) {
        raf = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(raf);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-field" aria-hidden="true" />;
}

interface RevealProps {
  as?: ElementType;
  className?: string;
  delay?: number;
  children?: ReactNode;
  id?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  children,
  ...rest
}: RevealProps) {
  const [ref, state] = useReveal<HTMLElement>();
  const stateClass =
    state === "hidden" ? "reveal-hidden" : state === "visible" ? "reveal-in" : "";

  return (
    <Tag
      ref={ref}
      className={`reveal ${stateClass} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ============================================================
   ALL FEATURES DATA — complete catalog of every built feature
   ============================================================ */
/* ============================================================
   ALL FEATURES DATA — Complete 100% Catalog from Default Menus & System
   ============================================================ */
const ALL_FEATURES = [
  {
    category: "📊 Dashboard & Analytics",
    color: "#6366f1",
    gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    features: [
      { name: "Standard Dashboard", desc: "Live overview with Sales, Inventory, Credit, Purchase tabs syncing real-time ERP data." },
      { name: "Executive AI Dashboard", desc: "AI-powered strategic dashboard with Performance Radar, Credit Risk Quadrant & Detailing Funnel." },
      { name: "Targets & Achievements", desc: "Target tracking vs actual performance radar for sales reps and product divisions." },
      { name: "Purchase & Sale Analytics", desc: "Combined analytical views of purchases vs sales with margin and revenue ratios." },
      { name: "KPI Cards", desc: "Animated cards for Total Sales, Purchases, Outstanding & Stock value with trend sparklines." },
      { name: "Liquid Meters", desc: "Animated liquid gauges showing collection rates, target progress and inventory levels." },
      { name: "Smart Insights Widget", desc: "AI generated operational bullet insights, KPI summaries and critical business alerts." },
      { name: "Financial Simulator", desc: "Interactive scenario sandbox — test price/volume variations for revenue forecasting." },
      { name: "India Map Sales Breakdown", desc: "Interactive geographic heat-map of India with state/area drill-downs." },
      { name: "Banner Theme Customiser", desc: "13+ preset shader themes (Deep Navy, Royal Blue, Cyber Neon, Emerald, etc.) + custom picker." },
      { name: "Auto Time-Based Theme", desc: "Smart banner gradient that automatically adapts to Morning, Afternoon, Evening or Night." },
      { name: "60-Second Auto Sync", desc: "Background auto-refresh every 60 seconds without page reload." },
    ],
  },
  {
    category: "💰 Sales Module",
    color: "#10b981",
    gradient: "linear-gradient(135deg,#10b981,#059669)",
    features: [
      { name: "Sales Dashboard", desc: "Dedicated sales hub with real-time bill feeds, month-to-date figures and KPI trends." },
      { name: "Invoices List", desc: "Paginated register of all ERP-synced sales invoices with status, date, amount and search." },
      { name: "Sales Outstanding", desc: "Customer-wise receivables with ageing brackets (0-30, 31-60, 61-90, 90+ days)." },
      { name: "Bad Debt & Credit Risk", desc: "Credit risk matrix classifying debtors into Safe, Monitor, High Risk and Critical." },
      { name: "Create Sale Invoice", desc: "Direct sales invoice generation with customer ledger, item lookup, tax and discounts." },
      { name: "Sales Return", desc: "Process credit notes and stock return adjustments linked to original invoices." },
      { name: "Receipt Entry", desc: "Log cash/bank collection receipts against customer outstanding with balance adjustments." },
      { name: "Sales Orders", desc: "Track incoming customer orders through pending, processed and dispatched stages." },
      { name: "Sales vs Collection", desc: "Side-by-side comparative gap chart analyzing invoice billing against cash collection." },
      { name: "Customer-Wise Sales Table", desc: "Deep drill-down into individual customer buying history, order volume and loyalty." },
      { name: "Top Products by Sales", desc: "Ranked best-sellers list by units sold, revenue contribution and gross margins." },
      { name: "Total Sales Modal", desc: "Interactive full-screen analytics modal with product-level and date-range filters." },
    ],
  },
  {
    category: "🛒 Purchase Module",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    features: [
      { name: "Purchase Dashboard", desc: "Procurement control center showing total bills, supplier accounts and payment dues." },
      { name: "Purchase Invoices List", desc: "Complete register of inbound vendor bills with batch numbers, rates and tax details." },
      { name: "Purchase Outstanding", desc: "Accounts payable tracker by supplier with payment due dates and credit terms." },
      { name: "Create Purchase Bill", desc: "Manual purchase bill entry with batch tracking, expiry date, PTR/PTS and GST calculation." },
      { name: "AI Bill Entry (Photo/PDF)", desc: "Upload invoice photos or PDFs — AI OCR auto-extracts line items, batches, taxes and vendors." },
      { name: "Purchase Return", desc: "Process debit notes for vendor returns with auto-deduction from stock inventory." },
      { name: "Payment Entry", desc: "Record outgoing supplier payments via bank/cheque with ledger reconciliation." },
      { name: "Purchase Orders", desc: "Issue and track purchase orders (POs) sent to pharmaceutical manufacturers." },
      { name: "Purchase vs Payment", desc: "Comparison analytics showing total goods purchased vs payments disbursed over time." },
      { name: "Supplier History Panel", desc: "Full transaction ledger, past purchase rates and payment history for any vendor." },
    ],
  },
  {
    category: "📦 Inventory & Stock",
    color: "#0ea5e9",
    gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)",
    features: [
      { name: "Inventory Dashboard", desc: "Warehouse overview showing total SKUs, stock valuation, low items and fast movers." },
      { name: "Products Master", desc: "Full catalog with generic names, brand names, pack sizes, MRP, PTR, PTS and HSN codes." },
      { name: "Stock Overview", desc: "Live stock ledger with batch numbers, manufacturing dates, expiry dates and rack locations." },
      { name: "Batch Expiry Liquidator", desc: "Urgent inventory warnings for batches expiring within 30, 60 or 90 days." },
      { name: "Expired Batches Modal", desc: "Dedicated disposal and write-off tracker for expired pharmaceutical stock." },
      { name: "Low Stock Alert Table", desc: "Products falling below minimum reorder points highlighted for replenishment." },
      { name: "Negative Stock Table", desc: "Discrepancy monitor identifying negative stock balances for ERP data correction." },
      { name: "Company-Wise Stock Summary", desc: "Breakdown of warehouse inventory filtered by individual ERP company code." },
    ],
  },
  {
    category: "👥 Customer & Ledger",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    features: [
      { name: "List Customers", desc: "Searchable customer directory with filter by area, route, category and outstanding." },
      { name: "360° Customer Profile", desc: "Complete party view with contact info, GSTIN, credit limit, order history and ledger." },
      { name: "Customer Quick Actions", desc: "Instant click-to-call, WhatsApp message, ledger view or order creation from party card." },
      { name: "Ledger Details Modal", desc: "Comprehensive debit/credit account statement with date filters and running balance." },
      { name: "Add / Edit Customer Modal", desc: "Full registration modal with GSTIN validation, drug license numbers and territory tags." },
      { name: "Credit Risk Matrix", desc: "Customer risk quadrant based on past repayment velocity and current exposure." },
    ],
  },
  {
    category: "🎯 Leads & Pipeline Hub",
    color: "#f43f5e",
    gradient: "linear-gradient(135deg,#f43f5e,#e11d48)",
    features: [
      { name: "Lead Management Hub", desc: "Centralized pipeline dashboard for doctor leads, hospital tenders and institutional queries." },
      { name: "Lead Kanban Board", desc: "Interactive drag-and-drop board: New → Contacted → Qualified → Proposal → Won / Lost." },
      { name: "Lead Table View", desc: "Sortable, filterable table with status badges, priority levels and assigned representatives." },
      { name: "Lead Capture Form", desc: "Detailed lead entry with product interests, estimated value, source and follow-up dates." },
      { name: "Lead Detail Drawer", desc: "Side drawer with complete conversation history, activity timeline and quick notes." },
      { name: "Lead Source Analytics", desc: "Conversion funnel visualization tracking ROI across field visits, referrals and campaigns." },
    ],
  },
  {
    category: "📝 Form Studio (Custom)",
    color: "#a855f7",
    gradient: "linear-gradient(135deg,#a855f7,#9333ea)",
    features: [
      { name: "Saved Forms Hub", desc: "Repository of all created dynamic forms with status, responses count and sharing options." },
      { name: "AI Form Builder", desc: "Prompt-to-form generation — describe your requirement and AI builds the full schema instantly." },
      { name: "Visual Drag & Drop Builder", desc: "15+ fields: text, dropdown, date, file, GPS, signature, repeater table and calculations." },
      { name: "Pharma Pre-built Templates", desc: "Ready templates for Doctor Visits, Chemist Surveys, Adverse Events and Sample Requisitions." },
      { name: "Conditional Logic Engine", desc: "Show, hide or require specific fields based on user answers in other fields." },
      { name: "Repeater Table Fields", desc: "Add repeatable row items (like multiple product prescription entries) inside one form." },
      { name: "GPS Location Capture", desc: "Record verified field coordinates with map preview for on-site visit validation." },
      { name: "Digital Signature Pad", desc: "Touch/mouse signature capture for doctor consent and delivery verification." },
      { name: "File & Photo Uploads", desc: "Attach visit photos, doctor cards or order slips directly into form submissions." },
      { name: "Dynamic Public Forms", desc: "Shareable public link & iframe embed code for submissions without requiring user login." },
      { name: "Form Analytics & Submissions", desc: "Response counts, completion rates, filterable submission table and PDF export." },
      { name: "Guide & Capabilities", desc: "Built-in documentation and capability showcase for custom form studio." },
    ],
  },
  {
    category: "🏢 Master Data Hub",
    color: "#64748b",
    gradient: "linear-gradient(135deg,#64748b,#475569)",
    features: [
      { name: "Master Dashboard", desc: "Central administration hub for managing all underlying CRM core databases." },
      { name: "Accounting Group Master", desc: "Manage chart of accounts and parent-child ledger group classifications." },
      { name: "Customer & Ledger Master", desc: "Create, edit and manage verified customer profiles, credit limits and routes." },
      { name: "Area Master", desc: "Define states, cities, zones and field territories for regional distribution." },
      { name: "Product Master", desc: "Manage SKU catalogue, packing units, tax slabs and batch settings." },
      { name: "HSN Master", desc: "Maintain GST HSN code directory with applicable CGST, SGST and IGST rates." },
      { name: "Division Master", desc: "Configure product marketing divisions (Cardiology, Derma, Ortho, etc.)." },
      { name: "Target & Gift Master", desc: "Set quarterly/monthly sales targets and promotional gift schemes for field staff." },
      { name: "MR Customer Master", desc: "Map medical reps to specific chemist/doctor lists for exclusive field visibility." },
      { name: "Bill Series Master", desc: "Configure invoice numbering formats, prefix/suffix and voucher series." },
      { name: "Company Master (Create & List)", desc: "Register multiple business companies with GSTIN, address, logo and active status." },
      { name: "Financial Year Master", desc: "Create and list accounting financial years with start/end date bounds." },
    ],
  },
  {
    category: "🧑‍⚕️ MR Reporting & Field Force",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg,#06b6d4,#0891b2)",
    features: [
      { name: "Daily Call Report (DCR)", desc: "Field force submits daily logs of doctor visits, chemist meetings and stockist orders." },
      { name: "DCR History Log", desc: "Full searchable history of submitted DCRs with date filters, MR filters and visit shifts." },
      { name: "Call Log Entry", desc: "Log individual doctor calls with speciality, products detailed, samples given and POB." },
      { name: "DCR Approval Workflow", desc: "Manager/Admin review portal to approve or reject DCR entries with comments." },
      { name: "MR Territory Management", desc: "Assign specific company codes and geographic areas to field reps." },
      { name: "MR Customer Assignment", desc: "Link doctors and chemists to specific MRs for targeted daily call plans." },
      { name: "Detailing Funnel", desc: "Visual conversion funnel tracking calls made → samples given → orders received." },
      { name: "Performance Radar Chart", desc: "Multi-axis radar chart showing MR target achievement and visit frequency." },
      { name: "DCR Excel Export", desc: "One-click export of complete DCR reports for payroll and field TA/DA calculation." },
    ],
  },
  {
    category: "⚖️ Comparison & Growth",
    color: "#f97316",
    gradient: "linear-gradient(135deg,#f97316,#ea580c)",
    features: [
      { name: "Comparison Overview", desc: "Holistic view comparing multi-period sales, purchases and cash collections." },
      { name: "Financial Year Wise Compare", desc: "Year-on-year (YoY) revenue growth, gross margins and turnover comparisons." },
      { name: "FY Area Wise Map Compare", desc: "Geographic comparative map showing sales growth and market expansion across territories." },
      { name: "Financial Year Switcher", desc: "Live global switcher to toggle active financial year data across all reports." },
    ],
  },
  {
    category: "🔄 ERP Migration & Sync",
    color: "#22c55e",
    gradient: "linear-gradient(135deg,#22c55e,#16a34a)",
    features: [
      { name: "MabsolCRM Sync", desc: "Direct background sync with MabsolCRM DBF files without changing ERP workflow." },
      { name: "Busy ERP Sync", desc: "Automated synchronization connector for Busy Accounting Software." },
      { name: "Tally ERP Sync", desc: "Direct data integration and live ledger bridge for Tally ERP / TallyPrime." },
      { name: "EasySol Sync", desc: "Seamless migration and real-time data sync for EasySol Pharma Software." },
      { name: "Logic ERP Sync", desc: "Native connector for Logic ERP wholesale and retail installations." },
      { name: "MabsolCRM Direct Sync", desc: "Dedicated sync connector for MabsolCRM pharmaceutical databases." },
      { name: "Sync Settings", desc: "Configure sync interval (default 60s), folder paths and automated background tasks." },
      { name: "Cloud Backup", desc: "Encrypted automated data backup stored safely in MongoDB Atlas." },
    ],
  },
  {
    category: "📋 Reports & GST Suite",
    color: "#84cc16",
    gradient: "linear-gradient(135deg,#84cc16,#65a30d)",
    features: [
      { name: "Dashboard Reports", desc: "Comprehensive report generation for Sales, Purchases, Stock and Outstanding." },
      { name: "GST Reports Suite", desc: "GSTR-1 outward supplies, GSTR-2 inward reconciliation and HSN summaries." },
      { name: "Receivables Ageing", desc: "Age-wise breakdown of overdue payments with customer-level contact details." },
      { name: "Product Movement Reports", desc: "Fast-moving, slow-moving and non-moving item analytics for inventory control." },
      { name: "Area & Division Reports", desc: "Territory-wise sales distribution reports exportable to Excel and PDF." },
    ],
  },
  {
    category: "📧 Communication & Campaigns",
    color: "#ec4899",
    gradient: "linear-gradient(135deg,#ec4899,#db2777)",
    features: [
      { name: "Email Campaign Manager", desc: "Design, segment and dispatch rich HTML email campaigns with delivery analytics." },
      { name: "WhatsApp Campaign", desc: "Send automated WhatsApp notifications, order updates and promotional messages." },
      { name: "Notification Center", desc: "In-app alerts for critical events: low stock, expiring batches and sync status." },
    ],
  },
  {
    category: "🔐 Users, Roles & Permissions",
    color: "#ef4444",
    gradient: "linear-gradient(135deg,#ef4444,#dc2626)",
    features: [
      { name: "User Management", desc: "Create and manage system user accounts, employee codes and login credentials." },
      { name: "Permission Manager", desc: "100+ granular access permissions controlling view, edit and delete for every module." },
      { name: "Roles Management", desc: "Define custom organizational roles (Admin, Manager, Accountant, Field MR)." },
      { name: "Permission Gate", desc: "Dynamic UI protection that automatically hides unauthorized actions from users." },
      { name: "MR Territory Restriction", desc: "Scoped data security restricting field representatives to their assigned territory only." },
      { name: "JWT Auth Security", desc: "Encrypted cookie-based authentication with token refresh and session timeout." },
    ],
  },
  {
    category: "⚙️ Settings & Customization",
    color: "#0891b2",
    gradient: "linear-gradient(135deg,#0891b2,#0e7490)",
    features: [
      { name: "Company Settings", desc: "Configure company details, logo, GSTIN, currency, address and default financial year." },
      { name: "Menu Adjustments", desc: "Dynamic menu customizer — show, hide or reorder sidebar menus per role without code changes." },
      { name: "Voice AI 🎙️", desc: "Configure voice assistant preferences, speech rates and automated voice narrations." },
      { name: "Multi-Company Switcher", desc: "Seamlessly toggle between multiple business company entities from top navigation." },
      { name: "Sidebar Theme Engine", desc: "13 preset shader palettes (Royal Navy, Cobalt Tech, Ice Azure, Sunset, etc.) + custom colors." },
      { name: "Website Animations Toggle", desc: "System-wide toggle to disable/enable smooth UI animations for accessibility." },
      { name: "Profile & Photo Upload", desc: "Manage personal account profile, password change and user avatar photo." },
    ],
  },
  {
    category: "🌐 UI & UX Highlights",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg,#f59e0b,#f97316)",
    features: [
      { name: "Global Search (Cmd+K)", desc: "Spotlight search modal across customers, products, bills, modules and master data." },
      { name: "Celestial Cursor", desc: "Custom interactive particle cursor trail for an engaging desktop experience." },
      { name: "Pharma Canvas Background", desc: "Interactive animated 3D scientific particle and node field background." },
      { name: "Fullscreen Mode", desc: "One-click fullscreen toggle in topbar for immersive analytics and dashboard display." },
      { name: "Searchable Dropdowns", desc: "Keyboard-navigable fuzzy search on all selection inputs for ultra-fast data entry." },
      { name: "Responsive Layout", desc: "100% responsive fluid grid and layout optimized for desktop, tablet and mobile." },
    ],
  },
];

export default function LandingPage() {
  const bars = [30, 48, 40, 72, 54, 64, 46];
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFeatures = ALL_FEATURES.map((cat) => ({
    ...cat,
    features: cat.features.filter(
      (f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.category.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) =>
    searchQuery ? cat.features.length > 0 : activeCategory ? cat.category === activeCategory : true
  );

  const totalFeatures = ALL_FEATURES.reduce((a, c) => a + c.features.length, 0);

  // Category tabs scroll & drag state for desktop PC support
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingTabs, setIsDraggingTabs] = useState(false);
  const [tabsStartX, setTabsStartX] = useState(0);
  const [tabsScrollLeft, setTabsScrollLeft] = useState(0);

  // Direct native mouse wheel listener for category tabs (translates vertical mouse wheel into horizontal scroll on desktop)
  useEffect(() => {
    if (!featuresOpen) return;
    const el = tabsRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      // Scroll horizontally smoothly with mouse wheel
      el.scrollLeft += e.deltaY * 1.2;
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [featuresOpen, searchQuery]);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    if (!tabsRef.current) return;
    setIsDraggingTabs(true);
    setTabsStartX(e.pageX - tabsRef.current.offsetLeft);
    setTabsScrollLeft(tabsRef.current.scrollLeft);
  };

  const handleTabsMouseUpOrLeave = () => {
    setIsDraggingTabs(false);
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabs || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - tabsStartX) * 1.5;
    tabsRef.current.scrollLeft = tabsScrollLeft - walk;
  };

  const steps = [
    {
      n: "01",
      title: "ERP generates data",
      body: "Invoices, stock and accounts get created in ERP exactly like today. Nothing changes there.",
    },
    {
      n: "02",
      title: "Mabsol CRM syncs it",
      body: "Every change flows in on its own. No exports, no CSVs, no retyping numbers.",
    },
    {
      n: "03",
      title: "Your team sees it instantly",
      body: "Live reports and alerts land wherever your team already works.",
    },
  ];

  // Small orbiting data-packet particles around the hero stage — a nod to
  // records flowing from ERP into the CRM in real time.
  const particles = [
    { top: "8%", left: "-6%", size: 8, delay: 0, duration: 7 },
    { top: "72%", left: "-10%", size: 6, delay: 1.4, duration: 8.5 },
    { top: "18%", left: "104%", size: 7, delay: 0.6, duration: 6.5 },
    { top: "55%", left: "108%", size: 5, delay: 2.1, duration: 9 },
    { top: "92%", left: "40%", size: 6, delay: 1, duration: 7.5 },
  ];

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const node = frameRef.current;
    if (reducedMotion || !node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 12 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <main className="landing-page">
      {/* AMBIENT BACKGROUND — fixed to the viewport so it runs continuously
          behind the whole scrolling page: a slowly rotating 3D node network
          plus two soft drifting color fields, reinforcing "always syncing" */}
      <div className="bg-ambient" aria-hidden="true">
        <span className="orb orb-orange" />
        <span className="orb orb-navy" />

        {/* PEEKING & FADING BACKGROUND TELEMETRY STICKERS */}
        <div className="bg-sticker bg-sticker-pie">
          <div className="chart-head">
            <span className="chart-label">Sales Mix</span>
            <span className="chart-tag">+24%</span>
          </div>
          <div className="pie-visual">
            <svg viewBox="0 0 36 36" className="pie-svg">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#EEF0F8" strokeWidth="5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#FB8C00"
                strokeWidth="5"
                strokeDasharray="65 100"
                strokeDashoffset="25"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#343872"
                strokeWidth="5"
                strokeDasharray="35 100"
                strokeDashoffset="90"
              />
            </svg>
            <div className="pie-legend">
              <span className="legend-item"><i className="leg-dot leg-orange" /> Pharma 65%</span>
              <span className="legend-item"><i className="leg-dot leg-navy" /> OTC 35%</span>
            </div>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-stock">
          <span className="notif-dot dot-green" />
          <div>
            <p className="notif-title">Stock Synced</p>
            <p className="notif-sub">2,22,190 Units</p>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-spark">
          <div className="chart-head">
            <span className="chart-label">Live Sales Trend</span>
            <span className="live-dot-pulse" />
          </div>
          <svg viewBox="0 0 120 35" className="sparkline-svg">
            <path
              d="M0,28 Q20,12 40,22 T80,8 T120,18"
              fill="none"
              stroke="#22C55E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="bg-sticker bg-sticker-sync">
          <span className="sync-icon">⚡</span>
          <div>
            <p className="notif-title">Real-Time ERP Sync</p>
            <p className="notif-sub">Auto 60s Refresh</p>
          </div>
        </div>

        <div className="bg-sticker bg-sticker-toast">
          <span className="notif-dot dot-orange" />
          <div>
            <p className="notif-title">Invoice #INV-2291 synced</p>
            <p className="notif-sub">2 seconds ago</p>
          </div>
        </div>

        <NetworkField />
      </div>

      {/* NAVBAR */}
      <header className="nav">
        <div className="nav-inner">
          <a href="#product" className="brand">
            <img
              src="https://mabsolinfotech.com/images/logo.webp"
              alt="Mabsol Infotech"
              className="brand-logo"
            />
          </a>

          <nav className="nav-links">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <button onClick={() => setFeaturesOpen(true)} className="nav-all-features-btn">All Features</button>
          </nav>

          <a
            href="/login"
            className="btn btn-primary nav-btn"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="product">
        <Reveal className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot-sm" /> ERP Integration
          </span>
          <h1>
            Everything from ERP,
            <br />
            in <span className="accent">one screen</span>
          </h1>
          <p className="sub">
            Mabsol CRM pulls straight from ERP to give your team live
            reports and instant alerts, so nothing gets missed and no one
            has to dig for numbers.
          </p>
          <div className="hero-actions">
            <a
              href="/login"
              className="btn btn-primary"
            >
              Get Started
            </a>
            <a href="#how" className="btn btn-outline">
              See how it works
            </a>
            <button
              onClick={() => setFeaturesOpen(true)}
              className="btn btn-features-doc"
            >
              <span className="btn-features-icon">📋</span>
              View All Features
              <span className="btn-features-badge">{totalFeatures}+</span>
            </button>
          </div>

          <div className="hero-trust">
            <div className="trust-avatars" aria-hidden="true">
              <span className="trust-dot dot-orange" />
              <span className="trust-dot dot-navy" />
              <span className="trust-dot dot-green" />
            </div>
            <span>Trusted by teams already running ERP + CRM together</span>
          </div>
        </Reveal>

        {/* PRODUCT SCREENSHOT / BENTO DASHBOARD — 3D TILT STAGE */}
        <Reveal className="hero-stage" delay={120}>
          <div className="stage-3d">
            <span className="stage-glow" aria-hidden="true" />
            <div className="ghost-panel ghost-panel-back" />
            <div className="ghost-panel ghost-panel-mid" />

            {particles.map((p, i) => (
              <span
                key={i}
                className="particle"
                style={
                  {
                    top: p.top,
                    left: p.left,
                    width: p.size,
                    height: p.size,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration}s`,
                  } as CSSProperties
                }
              />
            ))}

            <div
              className="browser-frame"
              ref={frameRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }}
            >
              <div className="browser-top">
                <div className="browser-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span className="browser-url">phcrm.mabsolinfotech.cloud</span>
                <span className="live-pill">
                  <span className="live-dot" />
                  Live
                </span>
              </div>

              <div className="hero-banner-wrapper">
                <img
                  src="/uploads/index-banner.png"
                  alt="MabsolCrm Dashboard"
                  className="hero-banner-image"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS — horizontal timeline */}
      <section className="how" id="how">
        <Reveal as="div" className="section-head">
          <span className="eyebrow eyebrow-dark">The flow</span>
          <h2>From ERP to your team, automatically</h2>
        </Reveal>

        <div className="timeline">
          <span className="timeline-line" aria-hidden="true">
            <span className="timeline-pulse" />
          </span>
          {steps.map((s, i) => (
            <Reveal as="div" className="timeline-step" key={s.n} delay={i * 120}>
              <div className="node-wrapper">
                <span className="timeline-node">{s.n}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="step-hover-badge">
                <span>
                  {i === 0
                    ? "⚡ MabsolCRM DBF Records Generated"
                    : i === 1
                    ? "🔄 Auto Cloud Sync Active"
                    : "📊 Live Team Dashboard Updated"}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURES — asymmetric bento */}
      <section className="feature-bento" id="features">
        <Reveal as="div" className="section-head">
          <span className="eyebrow eyebrow-dark">Inside the CRM</span>
          <h2>Built around one job: never lose track of ERP</h2>
        </Reveal>

        <div className="fb-grid">
          <Reveal as="div" className="fb-card fb-large">
            <div className="fb-card-header">
              <div className="fb-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20V10M12 20V4M20 20v-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="bar-hover-tag">₹2.03 Cr Sales Radar</span>
            </div>
            <h3>Report section</h3>
            <p>
              Sales, stock and account reports from ERP, laid out in one
              clean CRM view that&apos;s always current — no exports, no
              waiting on someone to send a file.
            </p>
            <div className="fb-visual">
              <div className="mini-bars mini-bars-large">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className={`eq-bar eq-bar-${i}`}
                    style={
                      {
                        height: `${h}%`,
                        "--bar-h": `${h}%`,
                        "--bar-delay": `${i * 120}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal as="div" className="fb-card fb-card-notif" delay={120}>
            <div className="fb-icon bell-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M10 18a2 2 0 0 0 4 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Notifications</h3>
            <p>Know the second something changes in ERP, without opening two apps.</p>
            <div className="hover-notif-row">
              <span className="notif-dot dot-orange" />
              <span>Instant Alert: Stock Below Threshold</span>
            </div>
          </Reveal>

          <Reveal as="div" className="fb-card fb-card-sync" delay={220}>
            <div className="fb-icon sync-spin-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.6 15A8 8 0 0 0 19 15.5M19.4 9A8 8 0 0 0 5 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>ERP sync</h3>
            <p>Works with the ERP setup you already have. No migration, no new habits.</p>
            <div className="hover-sync-bar">
              <div className="hover-sync-fill" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA BAND — LIGHT GLASS CARD WITH WATERMARK CHARTS & HOVER TELEMETRY */}
      <Reveal as="section" className="cta-band">
        <span className="cta-glow" aria-hidden="true" />
        <span className="cta-border-glow" aria-hidden="true" />

        {/* HOVER WATERMARK CHARTS IN CARD BACKGROUND */}
        <svg className="cta-bg-donut" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="38" stroke="#EEF0F8" strokeWidth="12" />
          <circle cx="50" cy="50" r="38" stroke="#FB8C00" strokeWidth="12" strokeDasharray="160 240" strokeDashoffset="40" />
          <circle cx="50" cy="50" r="38" stroke="#6366F1" strokeWidth="12" strokeDasharray="80 240" strokeDashoffset="200" />
        </svg>

        <svg className="cta-bg-bars" viewBox="0 0 120 70" fill="none" aria-hidden="true">
          <rect x="5" y="40" width="16" height="30" rx="3" fill="#FB8C00" />
          <rect x="28" y="25" width="16" height="45" rx="3" fill="#6366F1" />
          <rect x="51" y="10" width="16" height="60" rx="3" fill="#22C55E" />
          <rect x="74" y="30" width="16" height="40" rx="3" fill="#FB8C00" />
          <rect x="97" y="18" width="16" height="52" rx="3" fill="#343872" />
        </svg>

        <svg className="cta-bg-spark" viewBox="0 0 300 60" fill="none" aria-hidden="true">
          <path
            d="M0,45 Q50,15 100,35 T200,10 T300,30"
            stroke="#22C55E"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* HOVER TELEMETRY BADGES */}
        <div className="cta-hover-badge badge-tl">
          <span className="live-dot-sm" /> 100% Live ERP Bridge
        </div>
        <div className="cta-hover-badge badge-tr">
          <span>📈 ₹2.03 Cr Tracked</span>
        </div>
        <div className="cta-hover-badge badge-bl">
          <span>🛡️ Encrypted Backup</span>
        </div>
        <div className="cta-hover-badge badge-br">
          <span>⚡ Auto 60s Refresh</span>
        </div>

        <span className="cta-eyebrow">
          <span className="live-dot-sm" /> Instant Setup • Zero Downtime
        </span>
        <h2>Stop switching between ERP and spreadsheets</h2>
        <p>Set up takes minutes. Your team keeps working the same way, just with everything in view.</p>
        
        <div className="cta-action-wrap">
          <a href="/login" className="btn btn-primary cta-btn-light">
            <span>Get Started Free</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="cta-arrow">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Mabsol Infotech. Created by Mabsol Team.</p>
      </footer>

      {/* ================================================================
          ALL FEATURES FULL-SCREEN MODAL OVERLAY
          ================================================================ */}
      {featuresOpen && (
        <div className="features-overlay" role="dialog" aria-modal="true" aria-label="All Features Documentation">
          {/* Backdrop */}
          <div className="features-backdrop" onClick={() => { setFeaturesOpen(false); setSearchQuery(""); setActiveCategory(null); }} />

          {/* Panel */}
          <div className="features-panel">
            {/* Header */}
            <div className="fp-header">
              <div className="fp-header-top-bar">
                <div className="fp-badge-group">
                  <span className="fp-badge">📋 Documentation</span>
                  <span className="fp-count-pill">{totalFeatures} Features</span>
                </div>
                <button
                  className="fp-close"
                  onClick={() => { setFeaturesOpen(false); setSearchQuery(""); setActiveCategory(null); }}
                  aria-label="Close Documentation"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="fp-header-content">
                <div className="fp-header-info">
                  <h2 className="fp-title">MabsolCrm — Complete Feature Catalog</h2>
                  <p className="fp-subtitle">
                    Complete breakdown of <strong>{ALL_FEATURES.length} modules</strong> & <strong>{totalFeatures} features</strong>.
                  </p>
                </div>

                <div className="fp-search-wrap">
                  <span className="fp-search-icon">🔍</span>
                  <input
                    type="text"
                    className="fp-search"
                    placeholder="Search all features, modules…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
                  />
                  {searchQuery && (
                    <button className="fp-search-clear" onClick={() => setSearchQuery("")} title="Clear search">✕</button>
                  )}
                </div>
              </div>
            </div>

            {/* Category pills - clean horizontal strip with mouse wheel scroll */}
            {!searchQuery && (
              <div
                className="fp-cat-pills"
                ref={tabsRef}
              >
                <button
                  className={`fp-cat-pill ${activeCategory === null ? "fp-cat-pill--active" : ""}`}
                  onClick={(e) => {
                    setActiveCategory(null);
                    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                  }}
                >
                  All
                </button>
                {ALL_FEATURES.map((cat) => (
                  <button
                    key={cat.category}
                    className={`fp-cat-pill ${activeCategory === cat.category ? "fp-cat-pill--active" : ""}`}
                    style={activeCategory === cat.category ? { background: cat.color, color: "#fff", borderColor: cat.color } : {}}
                    onClick={(e) => {
                      setActiveCategory(activeCategory === cat.category ? null : cat.category);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="fp-body">
              {filteredFeatures.length === 0 ? (
                <div className="fp-empty">
                  <span className="fp-empty-icon">🔍</span>
                  <p>No features found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredFeatures.map((cat) => (
                  <div key={cat.category} className="fp-section">
                    <div className="fp-section-header" style={{ borderLeftColor: cat.color }}>
                      <span className="fp-section-title">{cat.category}</span>
                      <span className="fp-section-count" style={{ background: cat.color }}>{cat.features.length}</span>
                    </div>
                    <div className="fp-features-grid">
                      {cat.features.map((feat) => (
                        <div key={feat.name} className="fp-feature-card">
                          <div className="fp-feat-dot" style={{ background: cat.gradient }} />
                          <div className="fp-feat-content">
                            <div className="fp-feat-name">{feat.name}</div>
                            <div className="fp-feat-desc">{feat.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="fp-footer">
              <span>MabsolCrm &copy; {new Date().getFullYear()} · Built by Mabsol Team</span>
              <a href="/login" className="btn btn-primary fp-cta">
                Get Started →
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}