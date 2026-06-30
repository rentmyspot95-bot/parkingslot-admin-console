import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { FormField, Textarea } from './Field'

/**
 * Confirmation gate for destructive / money / lifecycle actions (design doc §11).
 * Restates the target + amount and (optionally) requires a typed reason that the
 * caller persists to the audit log.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'primary',
  requireReason = false,
  reasonLabel = 'Reason',
  reasonHint,
  loading = false,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description?: string
  confirmLabel?: string
  variant?: 'primary' | 'danger'
  requireReason?: boolean
  reasonLabel?: string
  reasonHint?: string
  loading?: boolean
  children?: React.ReactNode
}) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const reasonMissing = requireReason && reason.trim().length === 0

  function handleConfirm() {
    setTouched(true)
    if (reasonMissing) return
    onConfirm(reason.trim())
  }

  function handleClose() {
    setReason('')
    setTouched(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={loading} disabled={reasonMissing && touched}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {requireReason && (
        <FormField
          label={reasonLabel}
          required
          hint={reasonHint}
          error={touched && reasonMissing ? 'A reason is required and will be recorded in the audit log.' : undefined}
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why — this is written to the audit log."
            autoFocus
          />
        </FormField>
      )}
    </Modal>
  )
}
