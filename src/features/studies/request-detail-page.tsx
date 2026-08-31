import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react'
import { requestsApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { required, requiredList } from '@/lib/validators'
import { formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckboxField } from '@/components/ui/checkbox'
import { RadioGroup, RadioCard } from '@/components/ui/radio-group'
import { FileDrop } from '@/components/ui/file-drop'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { FieldSet, FormField } from '@/components/patterns/form-field'
import { ErrorSummary } from '@/components/patterns/error-summary'
import { RequestStatusBadge } from '@/components/patterns/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'

/** The roles a site can offer for a study, from the legacy site-selection form. */
const STAFF_OPTIONS = [
  'Principal investigator',
  'Study coordinator',
  'Clinical staff',
  'Research nurse',
  'Pharmacist',
]

const LABELS = {
  interested: 'Interest in this study',
  availableStaff: 'Staff available',
  comments: 'Comments',
}

/**
 * Site initiation response — the legacy "Site selection Questions" form.
 *
 * In the legacy portal this lived three layers deep: an iframe containing a
 * record list, containing a record, containing a second iframe rendered from an
 * inline script, in which the actual questions appeared. The questions are the
 * screen here.
 */
export function RequestDetailPage() {
  const { requestId = '' } = useParams()
  const state = useAsync(() => requestsApi.get(requestId), [requestId])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/requests">
          <ArrowLeft aria-hidden="true" />
          Back to study requests
        </Link>
      </Button>

      <AsyncBoundary
        state={state}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-96" />
          </div>
        }
        errorTitle="We could not load this request"
      >
        {(request) => (
          <>
            <PageHeader
              eyebrow={
                <span className="id">
                  {request.id} · {request.nctId}
                </span>
              }
              title={request.title}
              description={
                <>
                  {request.sponsor} · Received {formatDate(request.submittedAt)}
                </>
              }
              actions={<RequestStatusBadge status={request.status} />}
            />

            {request.response ? (
              <SubmittedResponse response={request.response} />
            ) : (
              <ResponseForm requestId={request.id} onSubmitted={state.reload} />
            )}
          </>
        )}
      </AsyncBoundary>
    </div>
  )
}

function SubmittedResponse({
  response,
}: {
  response: NonNullable<Awaited<ReturnType<typeof requestsApi.get>>['response']>
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
        <CardTitle>Your response was sent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Submitted {formatDateTime(response.submittedAt)}. The sponsor will be in touch about next
          steps.
        </p>
        <dl className="space-y-4 border-t border-border pt-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
              {LABELS.interested}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {response.interested === 'yes'
                ? 'Interested in taking part'
                : 'Not able to take this study'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
              {LABELS.availableStaff}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {response.availableStaff.length > 0 ? response.availableStaff.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
              {LABELS.comments}
            </dt>
            <dd className="mt-0.5 whitespace-pre-line text-foreground">
              {response.comments || '—'}
            </dd>
          </div>
          {response.attachmentName && (
            <div>
              <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                Attachment
              </dt>
              <dd className="mt-0.5 flex items-center gap-2 text-foreground">
                <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                {response.attachmentName}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

function ResponseForm({
  requestId,
  onSubmitted,
}: {
  requestId: string
  onSubmitted: () => void
}) {
  const toast = useToast()
  const { can } = useAuth()
  const canRespond = can('study.request.respond')
  const [file, setFile] = React.useState<File | null>(null)
  const [serverError, setServerError] = React.useState<string>()

  const form = useForm({
    initialValues: {
      interested: '' as 'yes' | 'no' | '',
      availableStaff: [] as string[],
      comments: '',
    },
    rules: {
      interested: required('An answer'),
      availableStaff: requiredList('At least one staff role'),
      comments: required('Comments'),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      try {
        await requestsApi.respond(requestId, {
          interested: values.interested as 'yes' | 'no',
          availableStaff: values.availableStaff,
          comments: values.comments,
          attachmentName: file?.name,
        })
        toast.success('Response sent', 'The sponsor has your answers.')
        onSubmitted()
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : 'We could not send your response.',
        )
      }
    },
  })

  // Staff availability is only meaningful if the site wants the study.
  const wantsStudy = form.values.interested === 'yes'
  const staffError = wantsStudy ? form.errors.availableStaff : undefined

  if (!canRespond) {
    return (
      <Alert tone="info" title="You cannot respond to study requests">
        Your role does not include responding to sponsors. Ask a Site or Study Administrator to
        complete this questionnaire.
      </Alert>
    )
  }

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!wantsStudy) {
          // Declining does not require the staffing answer.
          form.setValue('availableStaff', ['Not applicable'])
        }
        await form.submit()
      }}
      noValidate
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Site selection questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The sponsor uses your answers to decide whether to open this study at your site.
        </p>
      </div>

      {serverError && (
        <Alert tone="error" title="We could not send your response">
          {serverError}
        </Alert>
      )}

      {form.submitAttempted && (
        <ErrorSummary
          errors={{
            interested: form.errors.interested,
            'staff-0': staffError,
            comments: form.errors.comments,
          }}
          labels={{ interested: LABELS.interested, 'staff-0': LABELS.availableStaff, comments: LABELS.comments }}
        />
      )}

      <FieldSet
        legend="Is your site interested in taking part?"
        required
        error={form.errors.interested}
      >
        <RadioGroup
          value={form.values.interested}
          onValueChange={(value) => {
            form.setValue('interested', value as 'yes' | 'no')
            form.blur('interested')
          }}
          aria-label="Is your site interested in taking part?"
        >
          <RadioCard
            id="interested"
            value="yes"
            label="Yes"
            description="We have the capacity, staff and facilities to run this protocol."
          />
          <RadioCard
            id="interested-no"
            value="no"
            label="No"
            description="We cannot take this study on at the moment."
          />
        </RadioGroup>
      </FieldSet>

      {wantsStudy && (
        <FieldSet
          legend="Which staff are available for this study?"
          hint="Select everyone your site can commit."
          required
          error={staffError}
        >
          <div className="grid gap-1 sm:grid-cols-2">
            {STAFF_OPTIONS.map((option, index) => (
              <CheckboxField
                key={option}
                id={`staff-${index}`}
                label={option}
                checked={form.values.availableStaff.includes(option)}
                onCheckedChange={(checked) => {
                  form.setValue(
                    'availableStaff',
                    checked
                      ? [...form.values.availableStaff, option]
                      : form.values.availableStaff.filter((s) => s !== option),
                  )
                  form.blur('availableStaff')
                }}
              />
            ))}
          </div>
        </FieldSet>
      )}

      <FormField
        id="comments"
        label="Comments for the sponsor"
        hint="Relevant experience, capacity, or anything that would affect a start date."
        error={form.errors.comments}
        required
      >
        {(aria) => <Textarea {...aria} {...form.field('comments')} rows={4} />}
      </FormField>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Supporting document</p>
        <FileDrop
          id="request-attachment"
          label="Attach a capability statement"
          value={file}
          onChange={setFile}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" variant="brand" size="lg" loading={form.submitting}>
          Submit response
        </Button>
      </div>
    </form>
  )
}
