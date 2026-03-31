import { formatDate, formatTime, toEpochMs } from './date-utils';
import type { Booking, Car, Driver, User } from '@/generated/prisma/client';

type BookingWithRelations = Booking & {
  requester: User;
  car: Car | null;
  driver: Driver | null;
};

/**
 * Map a Prisma Booking (with includes) to the API response shape
 * matching the existing Booking TypeScript interface in src/types/index.ts.
 */
export function toBookingResponse(b: BookingWithRelations) {
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    submissionDate: formatDate(b.submissionDate),
    requesterId: b.requesterId,
    requesterName: b.requester.name,
    requesterPosition: b.requester.position ?? '',
    requesterPhotoUrl: b.requester.profilePicture ?? undefined,
    destination: b.destination,
    purpose: b.purpose,
    travelers: b.travelers,
    departureDate: formatDate(b.departureDate),
    departureTime: formatTime(b.departureTime),
    returnDate: formatDate(b.returnDate),
    returnTime: formatTime(b.returnTime),
    carId: b.carId ?? undefined,
    carLicensePlate: b.car?.licensePlate ?? undefined,
    carPhotoUrl: b.car?.photoUrl ?? undefined,
    driverId: b.driverId ?? undefined,
    driverName: b.driver?.name ?? undefined,
    driverPhotoUrl: b.driver?.photoUrl ?? undefined,
    notes: b.notes ?? undefined,
    approvalStatus: b.approvalStatus,
    approvalNotes: b.approvalNotes ?? undefined,
    hasEvaluated: b.evaluatedAt !== null,
    evaluatedTimestamp: toEpochMs(b.evaluatedAt),
  };
}

/** Standard include object for booking queries with all relations */
export const bookingInclude = {
  requester: true,
  car: true,
  driver: true,
} as const;
