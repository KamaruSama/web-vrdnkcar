// src/types/api-types.ts
import { NextRequest } from 'next/server';

// Common TypeScript interfaces to replace 'any'
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: string;
};

export interface ServerResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
  bookings?: unknown[];
  booking?: unknown;
  cars?: unknown[];
  car?: unknown;
  drivers?: unknown[];
  driver?: unknown;
  users?: unknown[];
  user?: unknown;
  surveys?: unknown[];
  survey?: unknown;
  evaluatedBookings?: number[];
  columnsInfo?: unknown[];
  requesters?: unknown[];
  [key: string]: unknown;
}

// Define proper types for API handlers
export type ApiRequest = NextRequest & {
  body?: unknown;
  params?: Record<string, string>;
};

// Extended error type for API error handling
export interface ExtendedError extends Error {
  code?: string;
  response?: {
    data?: {
      error?: string;
    };
    status?: number;
  };
}

