import { ApiError } from '../api/client'
import { toast } from '../ui/toast'

/** Standard error → toast translation, surfacing the requestId for support traces. */
export function toastApiError(error: unknown, fallback = 'Action failed') {
  if (error instanceof ApiError) {
    toast.error(error.message || fallback, error.code, error.requestId)
  } else if (error instanceof Error) {
    toast.error(error.message || fallback)
  } else {
    toast.error(fallback)
  }
}
