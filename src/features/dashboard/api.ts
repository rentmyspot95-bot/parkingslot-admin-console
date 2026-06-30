import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import type { MetricsOverview, MetricsTimeseries } from '@/shared/types/domain'

export function useMetricsOverview(range: string) {
  return useQuery({
    queryKey: ['metrics', 'overview', range],
    queryFn: ({ signal }) =>
      apiRequest<MetricsOverview>('/metrics/overview', { query: { range }, signal }),
  })
}

export function useMetricsTimeseries(metric: string, range: string) {
  return useQuery({
    queryKey: ['metrics', 'timeseries', metric, range],
    queryFn: ({ signal }) =>
      apiRequest<MetricsTimeseries>('/metrics/timeseries', { query: { metric, range }, signal }),
  })
}
