import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ListParams } from '../types/common'

export interface ListState {
  page: number
  limit: number
  sort: string
  q: string
  filters: Record<string, string>
}

/**
 * Syncs table pagination/sort/search/filters to the URL query string so list
 * views are shareable and survive refresh. Returns the parsed state plus setters.
 */
export function useListParams(
  defaults: { limit?: number; sort?: string; filterKeys?: string[] } = {},
) {
  const { limit = 25, sort: defaultSort = '-createdAt', filterKeys = [] } = defaults
  const [params, setParams] = useSearchParams()

  const state: ListState = useMemo(() => {
    const filters: Record<string, string> = {}
    for (const key of filterKeys) {
      const v = params.get(key)
      if (v) filters[key] = v
    }
    return {
      page: Number(params.get('page') ?? '1') || 1,
      limit: Number(params.get('limit') ?? String(limit)) || limit,
      sort: params.get('sort') ?? defaultSort,
      q: params.get('q') ?? '',
      filters,
    }
  }, [params, limit, defaultSort, filterKeys])

  const patch = useCallback(
    (next: Record<string, string | number | undefined>, resetPage = true) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(next)) {
            if (v === '' || v == null) p.delete(k)
            else p.set(k, String(v))
          }
          if (resetPage && !('page' in next)) p.set('page', '1')
          return p
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setPage = useCallback((page: number) => patch({ page }, false), [patch])
  const setSort = useCallback((sort: string) => patch({ sort }), [patch])
  const setQuery = useCallback((q: string) => patch({ q }), [patch])
  const setFilter = useCallback((key: string, value: string) => patch({ [key]: value }), [patch])

  /** Flatten into query params for the API client. */
  const apiParams = useMemo<ListParams>(
    () => ({
      page: state.page,
      limit: state.limit,
      sort: state.sort || undefined,
      q: state.q || undefined,
      ...state.filters,
    }),
    [state],
  )

  return { state, apiParams, setPage, setSort, setQuery, setFilter, patch }
}
