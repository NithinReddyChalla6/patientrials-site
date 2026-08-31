import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import type { PublicTrial } from '@/data/types'
import { Button } from '@/components/ui/button'

/**
 * Sign-up confirmation.
 *
 * The legacy app ended at a heading containing the participant id and nothing
 * else — no explanation of what the number was for, what happens next, or how to
 * reach anyone. The id still leads, because participants are asked for it, but
 * it now comes with the rest of the answer.
 */
export function EnrollmentSuccess({
  trial,
  participantId,
}: {
  trial: PublicTrial
  participantId: string
}) {
  return (
    <div className="mt-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="size-6 text-success" aria-hidden="true" />
      </span>

      <h1 className="mt-5 text-2xl font-semibold text-foreground">
        Your Participant ID : {participantId}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Thank you for signing up for {trial.title}. Keep this ID — the study team will ask for it.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">What happens next</h2>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">The study team reviews your answers.</span>{' '}
            This usually takes a few working days.
          </li>
          <li>
            <span className="font-medium text-foreground">They contact you.</span> Someone from{' '}
            {trial.locations[0]} will call or email to talk through the study and answer your
            questions.
          </li>
          <li>
            <span className="font-medium text-foreground">You decide.</span> Nothing begins until you
            have given informed consent in person, and you can change your mind at any time.
          </li>
        </ol>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        If you have not heard anything within two weeks, contact the site running the study and quote
        your participant ID.
      </p>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
        <Button variant="brand" size="lg" asChild>
          <Link to="/find-trials">Browse other trials</Link>
        </Button>
      </div>
    </div>
  )
}
