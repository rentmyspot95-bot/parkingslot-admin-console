import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/shared/api/client'
import type { FeatureFlag, PlatformConfig } from '@/shared/types/domain'

/** Read platform config — §9.12. */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: ({ signal }) => apiRequest<PlatformConfig>('/config', { signal }),
  })
}

export interface UpdateConfigVars {
  config: PlatformConfig
  reason?: string
}

/** Persist edited config (with diff preview + reason) — §9.12. */
export function useUpdateConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UpdateConfigVars) =>
      apiRequest<PlatformConfig>('/config', {
        method: 'PUT',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
    },
  })
}

/** Read feature flags — §9.12. */
export function useFlags() {
  return useQuery({
    queryKey: ['flags'],
    queryFn: ({ signal }) => apiRequest<FeatureFlag[]>('/flags', { signal }),
  })
}

export interface ToggleFlagVars {
  enabled: boolean
}

/** Toggle a single feature flag — §9.12. */
export function useToggleFlag(key: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: ToggleFlagVars) =>
      apiRequest<FeatureFlag>('/flags/' + key, {
        method: 'PATCH',
        body: vars,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flags'] })
    },
  })
}
