import { NextRequest, NextResponse } from "next/server";
import Gstr1Report from "@/lib/gstr1Report";
import {
    inspectUploadedTemplate,
    analyzeTemplateWithGemini,
    fillUploadedTemplate,
} from "@/lib/gstr1AiTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const action = (formData.get("action") as string) || "verify"; // verify | fill
        const monthStr = formData.get("month") as string | null;
        const yearStr = formData.get("year") as string | null;
        const companyId = (formData.get("companyId") as string) || undefined;

        if (!file) {
            return NextResponse.json(
                { success: false, message: "Please upload a valid .xlsx template file." },
                { status: 400 }
            );
        }

        const fileName = file.name || "template.xlsx";
        if (!fileName.toLowerCase().endsWith(".xlsx")) {
            return NextResponse.json(
                { success: false, message: "File format must be an Excel workbook (.xlsx)." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const month = monthStr ? Number(monthStr) : undefined;
        const year = yearStr ? Number(yearStr) : undefined;

        // -------------------------------------------------------------------
        // ACTION 1: VERIFY TEMPLATE (Inspect + Smart AI Analysis)
        // -------------------------------------------------------------------
        if (action === "verify") {
            const inspection = await inspectUploadedTemplate(buffer, fileName);
            const aiValidation = await analyzeTemplateWithGemini(inspection);

            let dataSummary: any = null;
            if (month && year && month >= 1 && month <= 12) {
                try {
                    const { meta } = await Gstr1Report.build({ month, year, companyId });
                    dataSummary = {
                        month,
                        year,
                        period: meta.period,
                        companyGstin: meta.companyGstin,
                        invoiceCount: meta.invoiceCount,
                        b2bCount: meta.b2bCount,
                        b2csGroupCount: meta.b2csGroupCount,
                        hsnLineCount: meta.hsnLineCount,
                    };
                } catch (dataErr: any) {
                    console.warn("Could not load period preview data:", dataErr?.message);
                }
            }

            return NextResponse.json({
                success: true,
                inspection: {
                    fileName: inspection.fileName,
                    sheetCount: inspection.sheetCount,
                    sheetNames: inspection.sheetNames,
                    hasMasterSheet: inspection.hasMasterSheet,
                    hasHelpSheet: inspection.hasHelpSheet,
                    detectedVersionEstimate: inspection.detectedVersionEstimate,
                },
                aiValidation,
                dataSummary,
            });
        }

        // -------------------------------------------------------------------
        // ACTION 2: FILL TEMPLATE WITH CRM SALES DATA & DOWNLOAD
        // -------------------------------------------------------------------
        if (action === "fill") {
            if (!month || month < 1 || month > 12 || !year) {
                return NextResponse.json(
                    { success: false, message: "Valid month (1-12) and year are required to populate data." },
                    { status: 400 }
                );
            }

            const { gstJson, meta, invoiceDetail } = await Gstr1Report.build({
                month,
                year,
                companyId,
            });

            const populatedBuffer = await fillUploadedTemplate(
                buffer,
                gstJson,
                meta,
                invoiceDetail
            );

            const safeGstin = meta.companyGstin || "COMPANY";
            const safePeriod = meta.period || `${month}_${year}`;
            const outFilename = `GSTR1_${safeGstin}_${safePeriod}_OfficialTemplate.xlsx`;

            return new NextResponse(new Uint8Array(populatedBuffer), {
                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="${outFilename}"`,
                },
            });
        }

        return NextResponse.json(
            { success: false, message: `Unknown action: ${action}` },
            { status: 400 }
        );
    } catch (err: any) {
        console.error("GSTR-1 AI Template error:", err);
        return NextResponse.json(
            {
                success: false,
                message: err?.message || "Failed to process GSTR-1 template.",
            },
            { status: 500 }
        );
    }
}
