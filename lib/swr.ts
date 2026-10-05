"use client";

import useSWR, { SWRConfiguration } from "swr";

export const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error(`API error: ${res.statusText}`);
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch {}
    throw error;
  }
  return res.json();
};

export const defaultSWRConfig: SWRConfiguration = {
  fetcher: defaultFetcher,
  revalidateOnFocus: false, // Don't refetch every time user switches browser tabs
  revalidateOnReconnect: true,
  dedupingInterval: 15000, // Deduplicate identical requests within 15 seconds
  keepPreviousData: true, // Smooth transition between tabs / companies
  errorRetryCount: 2,
};

export interface DashboardQueryParams {
  companyId?: string | null;
  fyId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  enabled?: boolean;
}

export function useDashboardData(params: DashboardQueryParams) {
  const { companyId, fyId, startDate, endDate, enabled = true } = params;

  // Build query string
  const query = new URLSearchParams();
  if (companyId) query.set("companyId", companyId);
  if (fyId) {
    query.set("fyId", fyId);
    if (startDate && endDate) {
      query.set("startDate", startDate);
      query.set("endDate", endDate);
    }
  }

  const queryString = query.toString();
  const endpoint = queryString ? `/api/dashboard?${queryString}` : "/api/dashboard";

  // Only fetch if enabled
  const key = enabled ? endpoint : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    defaultFetcher,
    {
      ...defaultSWRConfig,
      dedupingInterval: 20000, // 20s deduplication for dashboard
    }
  );

  const refresh = async () => {
    // When manual refresh is triggered, pass ?refresh=true to bypass server cache
    const refreshUrl = queryString
      ? `/api/dashboard?${queryString}&refresh=true`
      : "/api/dashboard?refresh=true";

    const freshData = await defaultFetcher(refreshUrl);
    // Mutate local cache with fresh data
    await mutate(freshData, false);
    return freshData;
  };

  return {
    data,
    error,
    isLoading: isLoading && !data,
    isValidating,
    refresh,
    mutate,
  };
}
