import ExcelJS from "exceljs";
import schemaData from "./gstr1_v2_2_schema.json";
import helpRowsData from "./gstr1_help_rows.json";
import styleDeep from "./gstr1_style_deep.json";
import r1StylesData from "./gstr1_r1_styles.json";

// ---------------------------------------------------------------------------
// POS mapping — exactly matching the GSTR1_Excel_Workbook_Template_V2.2 master sheet
// ---------------------------------------------------------------------------
const POS_MASTER_MAP: Record<string, string> = {
    "01": "01-Jammu & Kashmir",
    "02": "02-Himachal Pradesh",
    "03": "03-Punjab",
    "04": "04-Chandigarh",
    "05": "05-Uttarakhand",
    "06": "06-Haryana",
    "07": "07-Delhi",
    "08": "08-Rajasthan",
    "09": "09-Uttar Pradesh",
    "10": "10-Bihar",
    "11": "11-Sikkim",
    "12": "12-Arunachal Pradesh",
    "13": "13-Nagaland",
    "14": "14-Manipur",
    "15": "15-Mizoram",
    "16": "16-Tripura",
    "17": "17-Meghalaya",
    "18": "18-Assam",
    "19": "19-West Bengal",
    "20": "20-Jharkhand",
    "21": "21-Odisha",
    "22": "22-Chhattisgarh",
    "23": "23-Madhya Pradesh",
    "24": "24-Gujarat",
    "25": "25-Daman & Diu",
    "26": "26-Dadra & Nagar Haveli & Daman & Diu",
    "27": "27-Maharashtra",
    "28": "28-Andhra Pradesh(Old)",
    "29": "29-Karnataka",
    "30": "30-Goa",
    "31": "31-Lakshdweep",
    "32": "32-Kerala",
    "33": "33-Tamil Nadu",
    "34": "34-Puducherry",
    "35": "35-Andaman & Nicobar Islands",
    "36": "36-Telangana",
    "37": "37-Andhra Pradesh",
    "38": "38-Ladakh",
    "96": "96-Foreign Territory",
    "97": "97-Other Territory",
};

// Month abbreviations for DD-MMM-YYYY format
const MONTH_ABB = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Format date to DD-MMM-YYYY (official GST format, e.g. 01-Aug-2026)
export function formatGstDate(rawDate?: string | null): string {
    if (!rawDate) return "";
    const clean = String(rawDate).trim();
    // Already DD-MMM-YYYY?
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(clean)) return clean;
    // DD-MM-YYYY
    const m1 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(clean);
    if (m1) {
        const idx = parseInt(m1[2], 10) - 1;
        if (idx >= 0 && idx < 12) return `${m1[1].padStart(2, "0")}-${MONTH_ABB[idx]}-${m1[3]}`;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, "0")}-${MONTH_ABB[d.getMonth()]}-${d.getFullYear()}`;
    }
    return clean;
}

// Format Place of Supply to official code string (e.g. "09" → "09-Uttar Pradesh")
export function formatPos(pos?: string | null): string {
    if (!pos) return "";
    const clean = String(pos).trim();
    if (POS_MASTER_MAP[clean]) return POS_MASTER_MAP[clean];
    const prefix = /^(\d{2})/.exec(clean);
    if (prefix && POS_MASTER_MAP[prefix[1]]) return POS_MASTER_MAP[prefix[1]];
    return clean;
}

// Map UQC to official GSTR-1 master codes
export function formatUqc(uqc?: string | null): string {
    if (!uqc) return "OTH-OTHERS";
    const u = String(uqc).trim().toUpperCase();
    if (u.includes("-")) return u; // already formatted
    const UQC_MAP: Record<string, string> = {
        "BOX": "BOX-BOX", "BOXES": "BOX-BOX",
        "BTL": "BTL-BOTTLES", "BOTTLE": "BTL-BOTTLES", "BOTTLES": "BTL-BOTTLES",
        "BAG": "BAG-BAGS", "BAGS": "BAG-BAGS",
        "KGS": "KGS-KILOGRAMS", "KG": "KGS-KILOGRAMS",
        "NOS": "NOS-NUMBERS", "NO": "NOS-NUMBERS", "PCS": "NOS-NUMBERS", "PIECES": "NOS-NUMBERS",
        "PAC": "PAC-PACKETS", "PACKS": "PAC-PACKETS", "PACK": "PAC-PACKETS",
        "LTR": "LTR-LITRES", "LITRE": "LTR-LITRES", "LITRES": "LTR-LITRES",
        "MTR": "MTR-METERS", "MTS": "MTS-METRIC TON",
        "TAB": "OTH-OTHERS", "STRIP": "OTH-OTHERS", "STRIPS": "OTH-OTHERS",
        "CAP": "OTH-OTHERS", "CAPS": "OTH-OTHERS",
        "TBS": "OTH-OTHERS", "SYP": "OTH-OTHERS",
    };
    return UQC_MAP[u] || "OTH-OTHERS";
}

// ---------------------------------------------------------------------------
// STYLE CONSTANTS — exactly matching desktop template analysis
// ---------------------------------------------------------------------------

// Royal Blue fill — used in Row 1 (only cols that had this in desktop)
const BLUE_FILL: ExcelJS.Fill = {
    type: "pattern", pattern: "solid",
    fgColor: { argb: "FF0070C0" },
};

// Theme fill for Row 4 column headers — Theme 5 tint 0.5999... (Accent2 40% in Office default theme)
// This renders as light blue/lavender (#D9E1F2 equivalent)
const THEME_HEADER_FILL: ExcelJS.Fill = {
    type: "pattern", pattern: "solid",
    fgColor: { theme: 5, tint: 0.5999938962981048 } as any,
};

// White font for blue rows
const WHITE_FONT_BOLD_11: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
const WHITE_FONT_BOLD_11_RIGHT = WHITE_FONT_BOLD_11;

// Standard data font (no bold, size 11)
const DATA_FONT: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11 };

// Row 4 header font (bold=false as per desktop, size=11)
const HDR_FONT: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11, bold: false };

// Row 3 formula font (not bold, size 11)
const FORMULA_FONT: Partial<ExcelJS.Font> = { name: "Times New Roman", size: 11, bold: false };

// ---------------------------------------------------------------------------
// Helper: apply Row 1 styling — uses exact per-cell styles from desktop template
// ---------------------------------------------------------------------------
function applyRow1(row: ExcelJS.Row, sName: string, totalCols: number) {
    row.height = 24;
    const r1Styles = (r1StylesData as Record<string, Record<string, any>>)[sName] || {};
    for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        const cs = r1Styles[String(c)];
        if (!cs) continue;
        const isBlue = cs.rgb === "FF0070C0";
        if (isBlue) {
            cell.fill = BLUE_FILL;
            cell.font = { name: "Times New Roman", size: 11, bold: cs.bold, color: { argb: "FFFFFFFF" } };
        } else {
            // No fill for non-blue cells (matching desktop 00000000 = transparent)
            cell.font = { name: "Times New Roman", size: 11, bold: cs.bold };
        }
        if (cs.h || cs.v) {
            cell.alignment = {
                horizontal: (cs.h || undefined) as any,
                vertical: (cs.v || undefined) as any,
            };
        }
    }
}

// ---------------------------------------------------------------------------
// Helper: apply Row 2 (summary labels) — blue fill ALL cols, size=11
// ---------------------------------------------------------------------------
function applyRow2(row: ExcelJS.Row, r2Alignments: Record<string, string>, totalCols: number) {
    row.height = 20;
    for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.fill = BLUE_FILL;
        const align = r2Alignments[String(c)] || (cell.value ? "center" : undefined);
        cell.font = { name: "Times New Roman", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        if (align) cell.alignment = { horizontal: align as any, vertical: "bottom" };
    }
}

// ---------------------------------------------------------------------------
// Helper: apply Row 3 (formulas/totals) — no bold, size=11, Excel formulas
// ---------------------------------------------------------------------------
function applyRow3(
    row: ExcelJS.Row,
    r3Formulas: Record<string, string>,
    r3NumFmt: Record<string, string>,
    r3Alignments: Record<string, string | null>,
    totalCols: number
) {
    row.height = 18;
    for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        const formula = r3Formulas[String(c)];
        const numFmt = r3NumFmt[String(c)];
        const align = r3Alignments[String(c)];

        if (formula && !formula.includes("openpyxl")) {
            cell.value = { formula: formula } as any;
        }
        cell.font = { ...FORMULA_FONT };
        if (numFmt && numFmt !== "General") cell.numFmt = numFmt;
        if (align) cell.alignment = { horizontal: align as any };
    }
}

// ---------------------------------------------------------------------------
// Helper: apply Row 4 (column headers) — theme fill, bold=false, size=11
// ---------------------------------------------------------------------------
function applyRow4(row: ExcelJS.Row, totalCols: number) {
    row.height = 28;
    for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c);
        cell.fill = THEME_HEADER_FILL;
        cell.font = { ...HDR_FONT };
        cell.alignment = { horizontal: "center", vertical: "bottom", wrapText: true };
    }
}

// ---------------------------------------------------------------------------
// Helper: apply data row — size=11, per-column numFmt
// ---------------------------------------------------------------------------
function applyDataRow(row: ExcelJS.Row, dataNumFmt: Record<string, string>) {
    row.height = 15;
    row.font = { ...DATA_FONT };
    for (const [colStr, fmt] of Object.entries(dataNumFmt)) {
        if (fmt && fmt !== "General") {
            row.getCell(parseInt(colStr)).numFmt = fmt;
        }
    }
}

// ---------------------------------------------------------------------------
// MAIN EXPORT FUNCTION
// ---------------------------------------------------------------------------
export async function buildGstr1Excel(gstJson: any, meta: any, _invoiceDetail: any[] = []): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Goods and Services Tax Network";
    wb.lastModifiedBy = meta.companyName || "GSTN";
    wb.created = new Date();
    wb.modified = new Date();

    const schema = schemaData as Record<string, any>;
    const styleData = styleDeep as Record<string, any>;

    // -------------------------------------------------------------------------
    // 1. Help Instruction Sheet
    // -------------------------------------------------------------------------
    const helpSheet = wb.addWorksheet("Help Instruction");
    for (const [i, rowVals] of (helpRowsData as string[][]).entries()) {
        const row = helpSheet.addRow(rowVals);
        const rn = i + 1;
        if (rn === 1) {
            row.font = { name: "Times New Roman", size: 14, bold: true, color: { argb: "FF0070C0" } };
        } else if (rn === 2 || rn === 5) {
            row.font = { name: "Times New Roman", size: 12, bold: true };
        } else {
            row.font = { name: "Times New Roman", size: 10 };
        }
    }
    helpSheet.getColumn("B").width = 110;

    // -------------------------------------------------------------------------
    // 2. All 30 Data Sheets (exact order from V2.2)
    // -------------------------------------------------------------------------
    const SHEET_ORDER = [
        "b2b,sez,de", "b2ba", "b2cl", "b2cla", "b2cs", "b2csa",
        "cdnr", "cdnra", "cdnur", "cdnura",
        "exp", "expa",
        "at", "ata", "atadj", "atadja",
        "exemp",
        "hsn(b2b)", "hsn(b2c)",
        "docs",
        "eco", "ecoa", "ecob2b", "ecourp2b", "ecob2c", "ecourp2c",
        "ecoab2b", "ecoab2c", "ecoaurp2b", "ecoaurp2c",
        "master",
    ];

    for (const sName of SHEET_ORDER) {
        const sDef = schema[sName];
        if (!sDef) continue;

        const ws = wb.addWorksheet(sName);
        ws.views = [{ showGridLines: true }];

        // ---- master sheet ----
        if (sName === "master") {
            for (const [i, rVals] of (sDef.rows as any[][]).entries()) {
                const row = ws.addRow(rVals);
                row.font = { name: "Times New Roman", size: 10, bold: i === 0 };
            }
            for (let c = 1; c <= 16; c++) ws.getColumn(c).width = 24;
            continue;
        }

        // Set column widths (exact from desktop)
        if (sDef.widths) {
            for (const [colLtr, w] of Object.entries(sDef.widths as Record<string, number>)) {
                ws.getColumn(colLtr).width = w;
            }
        }

        const sStyle = styleData[sName] || {};
        const r2Alignments: Record<string, string> = sStyle.r2_alignments || {};
        const r3Formulas: Record<string, string> = sStyle.r3_formulas || {};
        const r3NumFmt: Record<string, string> = sStyle.r3_numfmt || {};
        const r3Alignments: Record<string, string | null> = sStyle.r3_alignments || {};
        const dataNf: Record<string, string> = sStyle.data_numfmt || {};

        const row1Vals: string[] = sDef.row1 || [];
        const row2Vals: string[] = sDef.row2 || [];
        const row3Vals: string[] = sDef.row3 || [];
        const row4Vals: string[] = sDef.row4 || [];
        const totalCols = Math.max(row1Vals.length, row4Vals.length);

        // Row 1 — Sheet title (exact per-cell styles from desktop template)
        const r1 = ws.addRow(row1Vals);
        applyRow1(r1, sName, totalCols);

        // Row 2 — Summary label row
        const r2 = ws.addRow(row2Vals);
        applyRow2(r2, r2Alignments, totalCols);

        // Row 3 — Summary formula/totals row (empty by default, will be populated by formulas)
        const r3 = ws.addRow(row3Vals.map(() => null)); // start blank; formulas applied below
        applyRow3(r3, r3Formulas, r3NumFmt, r3Alignments, totalCols);

        // Row 4 — Column headers
        const r4 = ws.addRow(row4Vals);
        applyRow4(r4, totalCols);

        // -----------------------------------------------------------------------
        // Data population — Row 5 onwards (exact per-column numFmt)
        // -----------------------------------------------------------------------

        if (sName === "b2b,sez,de") {
            for (const party of gstJson.b2b || []) {
                const ctin = String(party.ctin || "");
                for (const inv of party.inv || []) {
                    const inum = String(inv.inum || "");
                    const invDt = formatGstDate(inv.idt);
                    const invVal = Number(inv.val || 0);
                    const pos = formatPos(inv.pos);
                    const rchrg = inv.rchrg || "N";
                    const invTyp = inv.inv_typ === "SEZWP" ? "SEZ supplies with payment"
                        : inv.inv_typ === "SEZWOP" ? "SEZ supplies without payment"
                            : inv.inv_typ === "DE" ? "Deemed Exp"
                                : "Regular B2B";
                    const rcvrName = (inv.receiver_name && inv.receiver_name !== "-") ? inv.receiver_name : "";
                    const etin = (inv.etin && inv.etin !== "-") ? inv.etin : "";

                    for (const item of inv.itms || []) {
                        const rt = Number(item.itm_det?.rt || 0);
                        const txval = Number(item.itm_det?.txval || 0);
                        const csamt = Number(item.itm_det?.csamt || 0);
                        const dr = ws.addRow([ctin, rcvrName, inum, invDt, invVal, pos, rchrg, "", invTyp, etin, rt, txval, csamt]);
                        applyDataRow(dr, dataNf);
                    }
                }
            }
        }

        else if (sName === "b2cl") {
            for (const group of gstJson.b2cl || []) {
                for (const inv of group.inv || []) {
                    const etin = (inv.etin && inv.etin !== "-") ? inv.etin : "";
                    for (const item of inv.itms || []) {
                        const dr = ws.addRow([
                            String(inv.inum || ""),
                            formatGstDate(inv.idt),
                            Number(inv.val || 0),
                            formatPos(inv.pos),
                            "",
                            Number(item.itm_det?.rt || 0),
                            Number(item.itm_det?.txval || 0),
                            Number(item.itm_det?.csamt || 0),
                            etin,
                        ]);
                        applyDataRow(dr, dataNf);
                    }
                }
            }
        }

        else if (sName === "b2cs") {
            for (const row of gstJson.b2cs || []) {
                const splyTy = row.sply_ty === "E" ? "E" : "OE";
                const etin = (row.etin && row.etin !== "-") ? row.etin : "";
                const dr = ws.addRow([
                    splyTy,
                    formatPos(row.pos),
                    "",
                    Number(row.rt || 0),
                    Number(row.txval || 0),
                    Number(row.csamt || 0),
                    etin,
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "cdnr") {
            for (const party of gstJson.cdnr || []) {
                const ctin = String(party.ctin || "");
                const rcvrName = "";
                for (const nt of party.nt || []) {
                    const ntNum = String(nt.nt_num || "");
                    const ntDt = formatGstDate(nt.nt_dt);
                    const ntTyp = nt.ntty === "C" ? "C" : "D";
                    const pos = formatPos(nt.pos);
                    const rchrg = nt.rchrg || "N";
                    const ntVal = Number(nt.val || 0);
                    for (const item of nt.itms || []) {
                        const dr = ws.addRow([
                            ctin, rcvrName, ntNum, ntDt, ntTyp, pos, rchrg,
                            "Regular B2B",
                            ntVal, "",
                            Number(item.itm_det?.rt || 0),
                            Number(item.itm_det?.txval || 0),
                            Number(item.itm_det?.csamt || 0),
                        ]);
                        applyDataRow(dr, dataNf);
                    }
                }
            }
        }

        else if (sName === "cdnur") {
            for (const nt of gstJson.cdnur || []) {
                const ntNum = String(nt.nt_num || "");
                const ntDt = formatGstDate(nt.nt_dt);
                const ntTyp = nt.ntty === "C" ? "C" : "D";
                const pos = formatPos(nt.pos);
                const ntVal = Number(nt.val || 0);
                const urTyp = nt.typ || "B2CL";
                for (const item of nt.itms || []) {
                    const dr = ws.addRow([
                        urTyp, ntNum, ntDt, ntTyp, pos, ntVal, "",
                        Number(item.itm_det?.rt || 0),
                        Number(item.itm_det?.txval || 0),
                        Number(item.itm_det?.csamt || 0),
                    ]);
                    applyDataRow(dr, dataNf);
                }
            }
        }

        else if (sName === "hsn(b2b)") {
            const hsnList = gstJson.hsn_b2b?.data || gstJson.hsn?.data || [];
            for (const row of hsnList) {
                const dr = ws.addRow([
                    String(row.hsn_sc || ""),
                    row.desc || "",
                    formatUqc(row.uqc),
                    Number(row.qty || 0),
                    Number(row.val || 0),
                    Number(row.rt || 0),
                    Number(row.txval || 0),
                    Number(row.iamt || 0),
                    Number(row.camt || 0),
                    Number(row.samt || 0),
                    Number(row.csamt || 0),
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "hsn(b2c)") {
            const hsnList = gstJson.hsn_b2c?.data || [];
            for (const row of hsnList) {
                const dr = ws.addRow([
                    String(row.hsn_sc || ""),
                    row.desc || "",
                    formatUqc(row.uqc),
                    Number(row.qty || 0),
                    Number(row.val || 0),
                    Number(row.rt || 0),
                    Number(row.txval || 0),
                    Number(row.iamt || 0),
                    Number(row.camt || 0),
                    Number(row.samt || 0),
                    Number(row.csamt || 0),
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "docs") {
            const docTypes = [
                "Invoices for outward supply",
                "Debit Note",
                "Credit Note",
                "Revised Invoice",
                "Delivery Challan for supply of goods",
                "Receipt Voucher",
                "Payment Voucher",
                "Refund Voucher",
            ];
            const docDet: any[] = gstJson.doc_issue?.doc_det || [];
            for (let i = 0; i < docTypes.length; i++) {
                const det = docDet[i]?.docs?.[0];
                if (det && (Number(det.totnum || 0) > 0 || det.from)) {
                    const dr = ws.addRow([
                        docTypes[i],
                        det.from || "",
                        det.to || "",
                        Number(det.totnum || 0),
                        Number(det.cancel || 0),
                    ]);
                    applyDataRow(dr, dataNf);
                }
            }
        }

        else if (sName === "exemp") {
            for (const row of gstJson.exemp || []) {
                const dr = ws.addRow([
                    row.desc || "",
                    Number(row.nil_amt || 0),
                    Number(row.expt_amt || 0),
                    Number(row.ngsup_amt || 0),
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "at") {
            for (const row of gstJson.at || []) {
                const dr = ws.addRow([
                    formatPos(row.pos),
                    "",
                    Number(row.rt || 0),
                    Number(row.txval || 0),
                    Number(row.csamt || 0),
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "atadj") {
            for (const row of gstJson.atadj || []) {
                const dr = ws.addRow([
                    formatPos(row.pos),
                    "",
                    Number(row.rt || 0),
                    Number(row.txval || 0),
                    Number(row.csamt || 0),
                ]);
                applyDataRow(dr, dataNf);
            }
        }

        else if (sName === "exp") {
            for (const group of gstJson.exp || []) {
                for (const inv of group.inv || []) {
                    for (const item of inv.itms || []) {
                        const dr = ws.addRow([
                            group.exp_typ || "",
                            String(inv.inum || ""),
                            formatGstDate(inv.idt),
                            Number(inv.val || 0),
                            inv.sbpcode || "",
                            inv.sbnum ? String(inv.sbnum) : "",
                            formatGstDate(inv.sbdt),
                            Number(item.itm_det?.rt || 0),
                            Number(item.itm_det?.txval || 0),
                            Number(item.itm_det?.csamt || 0),
                        ]);
                        applyDataRow(dr, dataNf);
                    }
                }
            }
        }
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}