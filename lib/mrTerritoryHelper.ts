import MrTerritory from "@/models/MrTerritory";
import MrCustomerAssignment from "@/models/MrCustomerAssignment";
import Customer from "@/models/Customer";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import { getHierarchyAccess } from "@/lib/hierarchyAccess";

export interface MrTerritoryRestriction {
    isMrRestricted: boolean;
    allowedCompanyCodes: string[] | null;
    allowedOrdnos: string[] | null;
    allowedCompanyCodesSet: Set<string>;
    allowedOrdnosSet: Set<string>;
    companyRegexes: RegExp[];
    ordnoRegexes: RegExp[];
    isPartyAllowed: (party: any) => boolean;
}

const escapeRegex = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Central CRM data restriction.
 * Admin = unrestricted.
 * Everyone else = own user + complete reportsTo downline and the downline's
 * active territory/party assignments.
 */
export async function getMrTerritoryRestriction(): Promise<MrTerritoryRestriction> {
    const emptyUnrestricted: MrTerritoryRestriction = {
        isMrRestricted: false,
        allowedCompanyCodes: null,
        allowedOrdnos: null,
        allowedCompanyCodesSet: new Set(),
        allowedOrdnosSet: new Set(),
        companyRegexes: [],
        ordnoRegexes: [],
        isPartyAllowed: () => true,
    };

    try {
        const access = await getHierarchyAccess();
        if (!access.isAuthenticated) {
            return {
                ...emptyUnrestricted,
                isMrRestricted: true,
                allowedCompanyCodes: [],
                allowedOrdnos: [],
                allowedCompanyCodesSet: new Set(),
                allowedOrdnosSet: new Set(),
                isPartyAllowed: () => false,
            };
        }
        if (access.isAdmin) return emptyUnrestricted;

        const userIds = access.accessibleUserIds;
        if (!userIds.length) {
            return { ...emptyUnrestricted, isMrRestricted: true };
        }

        const [territories, directCustomerAssignments] = await Promise.all([
            MrTerritory.find({ userId: { $in: userIds }, status: "Active" }, { companyCode: 1, userId: 1 }).lean(),
            MrCustomerAssignment.find(
                { userId: { $in: userIds }, status: "Active" },
                { customerCode: 1, customerName: 1, userId: 1 }
            ).lean(),
        ]);

        const allowedCompanyCodes = Array.from(new Set(
            territories.map((t: any) => String(t.companyCode || "").trim()).filter(Boolean)
        ));

        const directCodes = directCustomerAssignments
            .map((a: any) => String(a.customerCode || "").trim())
            .filter(Boolean);

        const companyRegexes = allowedCompanyCodes.map(
            (c) => new RegExp("^" + escapeRegex(c) + "\\s*$", "i")
        );

        const companyMatchQuery = {
            $in: [...allowedCompanyCodes, ...companyRegexes],
        };

        // Only descendant MR/employee names are used for legacy Customer DSM/MR fields.
        const legacyNames = Array.from(new Set(
            [
                ...access.mrUserNames,
                ...access.accessibleUsers
                    .filter((u: any) => u.designation && /sales|manager|mr|medical/i.test(String(u.designation)))
                    .map((u: any) => String(u.name || "").trim()),
            ].filter(Boolean)
        ));

        const legacyEmployeeCodes = Array.from(new Set(
            access.accessibleUsers.map((u: any) => String(u.employeeCode || "").trim()).filter(Boolean)
        ));

        const legacyNameConditions: any[] = [];
        for (const name of legacyNames) {
            legacyNameConditions.push({ MR: name });
            legacyNameConditions.push({ ASM: name });
            legacyNameConditions.push({ RSM: name });
            legacyNameConditions.push({ ZSM: name });
            legacyNameConditions.push({ DSM: name });
            legacyNameConditions.push({ SALESMAN: name });
        }
        for (const code of legacyEmployeeCodes) {
            legacyNameConditions.push({ MR: code });
            legacyNameConditions.push({ DSM: code });
            legacyNameConditions.push({ employeeCode: code });
        }

        let disCodes: any[] = [];
        let mdisCodes: any[] = [];
        let legacyCustomerOrdnos: any[] = [];

        if (allowedCompanyCodes.length > 0) {
            [disCodes, mdisCodes, legacyCustomerOrdnos] = await Promise.all([
                SalesDis.distinct("CODEP", { COMPANY: companyMatchQuery }),
                SalesMdis.distinct("CODEP", { COMPANY: companyMatchQuery }),
                Customer.distinct("ORDNO", {
                    $or: [
                        { COMPANY: companyMatchQuery },
                        { GCODE: companyMatchQuery },
                        { SCODE: companyMatchQuery },
                        ...(legacyNameConditions.length ? legacyNameConditions : []),
                    ],
                }),
            ]);
        } else if (legacyNameConditions.length) {
            legacyCustomerOrdnos = await Customer.distinct("ORDNO", { $or: legacyNameConditions });
        }

        const allowedOrdnos = Array.from(new Set([
            ...directCodes,
            ...disCodes.map((c: any) => String(c).trim()),
            ...mdisCodes.map((c: any) => String(c).trim()),
            ...legacyCustomerOrdnos.map((c: any) => String(c).trim()),
        ].filter(Boolean)));

        const ordnoRegexes = allowedOrdnos.map(
            (code) => new RegExp("^" + escapeRegex(code) + "\\s*$", "i")
        );

        const allowedCompanyCodesSet = new Set(allowedCompanyCodes.map((c) => c.toLowerCase()));
        const allowedOrdnosSet = new Set(allowedOrdnos.map((c) => c.toLowerCase()));

        const legacyNamesLower = new Set(legacyNames.map((x) => x.toLowerCase()));
        const legacyEmployeeCodesLower = new Set(legacyEmployeeCodes.map((x) => x.toLowerCase()));

        const isPartyAllowed = (party: any) => {
            if (!party) return false;

            const ordno = String(
                party.ORDNO || party.ordno || party.CODEP || party.codep ||
                party.ORD || party.ord || party.code || party.CODE || ""
            ).trim().toLowerCase();

            const company = String(
                party.COMPANY || party.GCODE || party.SCODE || party.company || ""
            ).trim().toLowerCase();

            const hierarchyFields = [
                party.MR, party.ASM, party.RSM, party.ZSM, party.DSM,
                party.SALESMAN, party.employeeCode,
            ].map((x: any) => String(x || "").trim().toLowerCase()).filter(Boolean);

            if (ordno && allowedOrdnosSet.has(ordno)) return true;
            if (company && allowedCompanyCodesSet.has(company)) return true;
            if (hierarchyFields.some((value) => legacyNamesLower.has(value) || legacyEmployeeCodesLower.has(value))) return true;
            return false;
        };

        // A non-admin with no assigned scope must see nothing, not everything.
        return {
            isMrRestricted: true,
            allowedCompanyCodes,
            allowedOrdnos,
            allowedCompanyCodesSet,
            allowedOrdnosSet,
            companyRegexes,
            ordnoRegexes,
            isPartyAllowed,
        };
    } catch (error) {
        console.error("getMrTerritoryRestriction error:", error);
        // Fail closed for hierarchy users. This prevents an access-control
        // failure from accidentally exposing the complete dataset.
        return {
            isMrRestricted: true,
            allowedCompanyCodes: [],
            allowedOrdnos: [],
            allowedCompanyCodesSet: new Set(),
            allowedOrdnosSet: new Set(),
            companyRegexes: [],
            ordnoRegexes: [],
            isPartyAllowed: () => false,
        };
    }
}
