import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import type { PublicTrial } from '@/data/types'
import { Button } from '@/components/ui/button'

/**
 * The outcome when pre-screening answers do not match what a study needs.
 *
 * The legacy app had no such screen: a participant either continued or was
 * stopped later without explanation. Being told plainly, and pointed somewhere
 * useful, respects the time of someone who volunteered.
 */
export function NotAMatch({ trial }: { trial: PublicTrial }) {
  return (
    <div className="mt-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-info/10">
        <Info className="size-6 text-info" aria-hidden="true" />
      </span>

      <h1 className="mt-5 text-2xl font-semibold text-foreground">
        This study is not a match right now
      </h1>
      <p className="mt-2 text-muted-foreground">
        Based on your answers, you do not meet the criteria for {trial.title}. Studies set these
        criteria in advance so results stay reliable and participants stay safe — it is not a
        judgement about you.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">What you can do</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>Look at other studies — criteria vary widely between them.</li>
          <li>
            Check back later. Studies update their criteria, and new ones open regularly.
          </li>
          <li>Talk to your own doctor about research that might suit you.</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
        <Button variant="brand" size="lg" asChild>
          <Link to="/find-trials">Find other trials</Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to={`/trials/${trial.nctId}`}>Read about this study again</Link>
        </Button>
      </div>
    </div>
  )
}
