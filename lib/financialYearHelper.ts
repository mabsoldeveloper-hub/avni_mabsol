import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export interface FYRangeResult {
  isAll: boolean;
  fyId: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
}

/**
 * Resolves the dashboard FY from the selected FY id first.
 *
 * Important:
 * - If fyId is supplied, the dates stored in FinancialYear are authoritative.
 * - This prevents stale startDate/endDate query parameters from overriding
 *   the currently selected Financial Year.
 * - If no fyId is supplied, explicit startDate/endDate are still supported.
 * - If neither is supplied, the database current FY is used.
 */
export async function getFYDateRange(
  searchParams: URLSearchParams
): Promise<FYRangeResult> {
  const fyId = searchParams.get("fyId");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  if (fyId === "ALL") {
    return {
      isAll: true,
      fyId: "ALL",
      startDate: null,
      endDate: null,
    };
  }

  await connectDB();

  // When the UI sends an FY id, always resolve the dates from that FY record.
  if (fyId) {
    const fyDoc = await FinancialYear.findById(fyId).lean();

    if (fyDoc && fyDoc.startDate && fyDoc.endDate) {
      const s = new Date(fyDoc.startDate).toISOString().slice(0, 10);
      const e = new Date(fyDoc.endDate).toISOString().slice(0, 10);

      return {
        isAll: false,
        fyId: String(fyDoc._id),
        startDate: s,
        endDate: e,
      };
    }
  }

  // Backward-compatible support for callers that provide only a date range.
  if (startDateParam && endDateParam) {
    return {
      isAll: false,
      fyId: fyId || null,
      startDate: startDateParam.slice(0, 10),
      endDate: endDateParam.slice(0, 10),
    };
  }

  // No explicit FY supplied: use the database's current FY.
  const currentFY = await FinancialYear.findOne({ isCurrent: true }).lean();

  if (currentFY && currentFY.startDate && currentFY.endDate) {
    const s = new Date(currentFY.startDate).toISOString().slice(0, 10);
    const e = new Date(currentFY.endDate).toISOString().slice(0, 10);

    return {
      isAll: false,
      fyId: String(currentFY._id),
      startDate: s,
      endDate: e,
    };
  }

  return {
    isAll: false,
    fyId: null,
    startDate: null,
    endDate: null,
  };
}

/**
 * Builds a date-range query that correctly handles:
 *
 * 1. YYYY-MM-DD strings
 * 2. ISO timestamp strings such as YYYY-MM-DDTHH:mm:ss.sssZ
 * 3. Native MongoDB BSON Date values
 * 4. DD/MM/YYYY strings
 * 5. DD-MM-YYYY strings
 *
 * The previous implementation used /[-/]YYYY$/ for DMY dates. That matched
 * the whole calendar year and could pull records from outside an Indian FY
 * such as 01/01/2025 into FY 2025-26. DMY values are now parsed into actual
 * dates and compared against the exact FY boundaries.
 */
export function buildFYDateQuery(
  fieldName: string,
  startDate?: string | null,
  endDate?: string | null
): Record<string, any> {
  if (!startDate || !endDate) return {};

  const sStr = startDate.slice(0, 10);
  const eStr = endDate.slice(0, 10);

  const sDate = new Date(`${sStr}T00:00:00.000Z`);
  const eDate = new Date(`${eStr}T23:59:59.999Z`);

  if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
    return {};
  }

  // Fast/index-friendly checks for the two most common representations.
  const isoStringRange = {
    [fieldName]: {
      $gte: sStr,
      $lte: `${eStr}\xFF`,
    },
  };

  const nativeDateRange = {
    [fieldName]: {
      $gte: sDate,
      $lte: eDate,
    },
  };

  // Parse DMY string values only when they actually match DMY syntax.
  // $convert handles ISO strings and native Date values; $dateFromString
  // handles DMY strings with either slash or dash separators.
  const rawValue = {
    $convert: {
      input: `$${fieldName}`,
      to: "string",
      onError: "",
      onNull: "",
    },
  };

  const parsedDate = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: rawValue,
              regex: "^\\d{4}-\\d{2}-\\d{2}(?:T.*)?$",
            },
          },
          then: {
            $convert: {
              input: `$${fieldName}`,
              to: "date",
              onError: null,
              onNull: null,
            },
          },
        },
        {
          case: {
            $regexMatch: {
              input: rawValue,
              regex: "^\\d{2}/\\d{2}/\\d{4}$",
            },
          },
          then: {
            $dateFromString: {
              dateString: rawValue,
              format: "%d/%m/%Y",
              onError: null,
              onNull: null,
            },
          },
        },
        {
          case: {
            $regexMatch: {
              input: rawValue,
              regex: "^\\d{2}-\\d{2}-\\d{4}$",
            },
          },
          then: {
            $dateFromString: {
              dateString: rawValue,
              format: "%d-%m-%Y",
              onError: null,
              onNull: null,
            },
          },
        },
      ],
      default: null,
    },
  };

  return {
    $or: [
      isoStringRange,
      nativeDateRange,
      {
        $expr: {
          $and: [
            { $ne: [parsedDate, null] },
            { $gte: [parsedDate, sDate] },
            { $lte: [parsedDate, eDate] },
          ],
        },
      },
    ],
  };
}
