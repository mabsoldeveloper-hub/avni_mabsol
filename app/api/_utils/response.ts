import { NextResponse } from "next/server";

export function successResponse<T = any>(
  data?: T,
  message?: string,
  status = 200,
  meta?: Record<string, any>
) {
  const payload: Record<string, any> = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  if (meta) Object.assign(payload, meta);

  return NextResponse.json(payload, { status });
}

export function errorResponse(
  message = "An error occurred",
  status = 500,
  errors?: any
) {
  const payload: Record<string, any> = {
    success: false,
    error: message,
    message,
  };
  if (errors) payload.errors = errors;

  return NextResponse.json(payload, { status });
}
