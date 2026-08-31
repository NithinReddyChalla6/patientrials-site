import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { ApiError, REGISTRY_SAMPLE_IDS, requestsApi } from '@/data/api'
import type { StudyRequest } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { all, nctNumber, required } from '@/lib/validators'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { SearchInput } from '@/components/ui/search-input'
import { SkeletonRows } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { NoResults } from '@/components/patterns/no-results'
import { DataGrid, type GridColumn } from '@/components/patterns/data-grid'
import { FormField } from '@/components/patterns/form-field'
import { RequestStatusBadge } from '@/components/patterns/status-badge'
import { useAuth } from '@/features/auth/auth-context'

/**
 * Study requests — the legacy "New Study Request" screen.
 *
 * That screen was a raw platform list embedded in an iframe: creating a request
 * meant pressing "New", typing an NCT number into a form of thirty fields, then
 * pressing "Insert" and reading the outcome from a message strip that said
 * either "record has been inserted" or "duplicate". The same two operations —
 * find a request, raise a request — are the whole screen here, and a duplicate
 * is reported against the field that caused it.
 */
export function RequestsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 250)
    return () => window.clearTimeout(id)
  }, [query])

  const state = useAsync(() => requestsApi.list(debounced), [debounced])

  const columns: GridColumn<StudyRequest>[] = [
    {
      key: 'id',
      header: 'Request',
      width: '10rem',
      sortable: true,
      value: (r) => r.id,
      cell: (r) => <span className="id font-medium text-foreground">{r.id}</span>,
    },
    {
      key: 'title',
      header: 'Study',
      width: 'minmax(0,2fr)',
      primary: true,
      sortable: true,
      value: (r) => r.title,
      cell: (r) => <span className="font-medium text-foreground">{r.title}</span>,
    },
    {
      key: 'nctId',
      header: 'NCT number',
      width: '9rem',
      sortable: true,
      value: (r) => r.nctId,
      cell: (r) => <span className="id text-muted-foreground">{r.nctId}</span>,
    },
    {
      key: 'sponsor',
      header: 'Sponsor',
      width: 'minmax(0,1fr)',
      sortable: true,
      value: (r) => r.sponsor,
      cell: (r) => r.sponsor,
    },
    {
      key: 'submitted',
      header: 'Received',
      width: '9rem',
      sortable: true,
      value: (r) => r.submittedAt,
      cell: (r) => <span className="whitespace-nowrap">{formatDate(r.submittedAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '11rem',
      sortable: true,
      value: (r) => r.status,
      cell: (r) => <RequestStatusBadge status={r.status} />,
    },
    {
      key: 'response',
      header: 'Your response',
      width: '10rem',
      sortable: true,
      value: (r) => (r.response ? r.response.submittedAt : ''),
      cell: (r) =>
        r.response ? (
          <span className="text-muted-foreground">Sent {formatDate(r.response.submittedAt)}</span>
        ) : (
          <span className="font-medium text-warning">Not sent</span>
        ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="New Study Request"
        description="Studies offered to your site by sponsors, and the requests you have raised yourself."
        actions={
          can('study.request.respond') && (
            <Button variant="brand" onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden="true" />
              Raise a request
            </Button>
          )
        }
      />

      <AsyncBoundary
        state={state}
        loading={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={4} cols={5} />
          </div>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          debounced ? (
            <div className="rounded-lg border border-border bg-card">
              <NoResults query={debounced} entity="requests" onClear={() => setQuery('')} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={Inbox}
                title="No study requests"
                description="When a sponsor offers your site a study it appears here. You can also raise a request yourself for a study you want to run."
                action={
                  can('study.request.respond') && (
                    <Button variant="brand" onClick={() => setDialogOpen(true)}>
                      <Plus aria-hidden="true" />
                      Raise a request
                    </Button>
                  )
                }
              />
            </div>
          )
        }
        errorTitle="We could not load your study requests"
      >
        {(items) => (
          <DataGrid
            storageKey="requests"
            caption="Study requests"
            columns={columns}
            rows={items}
            rowKey={(r) => r.id}
            onRowActivate={(r) => navigate(`/requests/${r.id}`)}
            exportName="study-requests"
            toolbar={
              <SearchInput
                className="sm:w-80"
                label="Search study requests"
                placeholder="Search request ID, NCT, title or sponsor"
                value={query}
                onValueChange={setQuery}
              />
            }
          />
        )}
      </AsyncBoundary>

      <NewRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(request) => {
          setDialogOpen(false)
          navigate(`/requests/${request.id}`)
        }}
      />
    </div>
  )
}

function NewRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (request: StudyRequest) => void
}) {
  const toast = useToast()
  const [serverError, setServerError] = React.useState<{ message: string; code?: string }>()

  const form = useForm({
    initialValues: { nctId: '' },
    rules: { nctId: all(required('NCT number'), nctNumber) },
    onSubmit: async (values) => {
      setServerError(undefined)
      try {
        const request = await requestsApi.create(values.nctId)
        toast.success('Request raised', `${request.id} has been sent to the sponsor.`)
        form.reset()
        onCreated(request)
      } catch (error) {
        setServerError({
          message: error instanceof Error ? error.message : 'We could not raise this request.',
          code: error instanceof ApiError ? error.code : undefined,
        })
      }
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset()
      setServerError(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={form.submit} noValidate>
          <DialogHeader>
            <DialogTitle>Raise a study request</DialogTitle>
            <DialogDescription>
              Tell the sponsor your site would like to be considered for a study.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {serverError && (
              <Alert
                live
                tone={serverError.code === 'duplicate' ? 'warning' : 'error'}
                title={
                  serverError.code === 'duplicate'
                    ? 'You have already requested this study'
                    : 'We could not raise this request'
                }
              >
                {serverError.message}
              </Alert>
            )}

            <FormField
              id="request-nct"
              label="NCT number"
              hint="The registry number of the study you want to run."
              error={form.errors.nctId}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('nctId')}
                  placeholder="NCT01234567"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </FormField>

            <p className="text-xs text-muted-foreground">
              Registry numbers available in this build:{' '}
              <span className="id">{REGISTRY_SAMPLE_IDS.join(', ')}</span>
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={form.submitting}>
              Raise request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
