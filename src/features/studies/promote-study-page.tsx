import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { studiesApi } from '@/data/api'
import type { StudyPromotion } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EMPTY_PROMOTION, PromotionBuilder, isPromotionValid } from './promotion-builder'

/**
 * Promote a study that was created without promotion.
 *
 * The legacy flow only offered promotion at creation; a study answered "No" to
 * could not be listed later without recreating it. Reusing the same builder here
 * means the copy standard is identical whenever the decision is made.
 */
export function PromoteStudyPage() {
  const { studyId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const state = useAsync(() => studiesApi.get(studyId), [studyId])

  const [promotion, setPromotion] = React.useState<StudyPromotion>(EMPTY_PROMOTION)
  const [attempted, setAttempted] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string>()

  // Seed from any promotion copy already stored on the study.
  React.useEffect(() => {
    if (state.data?.promotion) setPromotion(state.data.promotion)
  }, [state.data])

  async function submit() {
    setAttempted(true)
    if (!isPromotionValid(promotion) || !state.data) return
    setSaving(true)
    setError(undefined)
    try {
      await studiesApi.promote(state.data.id, promotion)
      toast.success('Study promoted', 'Participants can now find it and sign up.')
      navigate(`/studies/${state.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not promote this study.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/studies/${studyId}`}>
          <ArrowLeft aria-hidden="true" />
          Back to the study
        </Link>
      </Button>

      <AsyncBoundary
        state={state}
        loading={<Skeleton className="h-96" />}
        errorTitle="We could not load this study"
      >
        {(study) => (
          <>
            <PageHeader
              eyebrow={
                <span className="id">
                  {study.id} · {study.nctId}
                </span>
              }
              title="Promote this study"
              description="Write the plain-language summary participants will read before they sign up."
            />

            {error && (
              <Alert tone="error" title="We could not promote this study">
                {error}
              </Alert>
            )}

            <PromotionBuilder
              study={study}
              promotion={promotion}
              onChange={setPromotion}
              showErrors={attempted}
            />

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link to={`/studies/${study.id}`}>Cancel</Link>
              </Button>
              <Button variant="brand" size="lg" onClick={submit} loading={saving}>
                <Megaphone aria-hidden="true" />
                Proceed with promote
              </Button>
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  )
}
