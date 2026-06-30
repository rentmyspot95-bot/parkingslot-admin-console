/** Standard error envelope returned by the admin API. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    requestId?: string
  }
}

/** Paginated list envelope: { data, page, limit, total }. */
export interface Paginated<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

export interface ListParams {
  page?: number
  limit?: number
  sort?: string
  q?: string
  status?: string
  [key: string]: string | number | boolean | undefined
}

export type ISODateString = string

export type Currency = 'INR'

export type VehicleType = 'bike' | 'car'

/** Canonical → human label mapping used across the app (per design doc §1). */
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bike: '2-Wheeler',
  car: 'Car',
}

export type BookingMode = 'instant_book' | 'request_to_book'

export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  instant_book: 'Instant book',
  request_to_book: 'Request to book',
}
