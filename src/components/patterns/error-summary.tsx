import { AlertCircle } from 'lucide-react'

interface ErrorSummaryProps {
  /** Field id -> message. Ids must match the controls so the links focus them. */
  errors: Record<string, string | undefined>
  /** Human labels for field ids, so the summary reads like the form. */
  labels: Record<string, string>
  title?: string
}

/**
 * Submit-time summary of everything that failed, with a link to each field.
 *
 * The legacy form printed the same information as a strip of red chips at the
 * bottom of the page: the chips named fields but did nothing when clicked, so on
 * a long form you still had to hunt. These entries move focus to the field.
 */
export function ErrorSummary({ errors, labels, title }: ErrorSummaryProps) {
  const entries = Object.entries(errors).filter(([, message]) => Boolean(message)) as [
    string,
    string,
  ][]
  if (entries.length === 0) return null

  return (
    <div
      role="alert"
      tabIndex={-1}
      className="rounded-lg border border-destructive/30 bg-destructive/[0.07] p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        {title ??
          `${entries.length} ${entries.length === 1 ? 'field needs' : 'fields need'} your attention`}
      </p>
      <ul className="mt-2 space-y-1 pl-6">
        {entries.map(([field, message]) => (
          <li key={field} className="text-sm">
            <a
              href={`#${field}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(field)
                el?.focus()
                el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }}
              className="font-medium text-destructive underline underline-offset-4 hover:no-underline"
            >
              {labels[field] ?? field}
            </a>
            <span className="text-muted-foreground"> — {message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
