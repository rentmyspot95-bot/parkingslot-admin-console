import { apiRequestRaw } from './client'
import type { ListParams, Paginated } from '../types/common'

/** Fetch a paginated list endpoint, returning the full { data, page, limit, total } envelope. */
export function fetchList<T>(
  path: string,
  params: ListParams,
  signal?: AbortSignal,
): Promise<Paginated<T>> {
  return apiRequestRaw<Paginated<T>>(path, { query: params, signal })
}
