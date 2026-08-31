import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

/**
 * Location trail.
 *
 * The console runs three levels deep — Studies, then a study, then one of nine
 * tabs — and the legacy portal gave no indication of where you were beyond the
 * record you happened to be looking at. Shown only where there is real depth;
 * a flat screen does not get a decorative one-item trail.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? 'font-medium text-foreground' : 'text-muted-foreground'}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
