import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'

/**
 * "Your filters matched nothing" — deliberately distinct from EmptyState, which
 * means "there is nothing here yet". Conflating them tells a user their data is
 * missing when it is only hidden.
 */
export function NoResults({
  query,
  onClear,
  entity = 'results',
}: {
  query?: string
  onClear: () => void
  entity?: string
}) {
  return (
    <EmptyState
      compact
      icon={SearchX}
      title={query ? `No ${entity} match "${query}"` : `No ${entity} match these filters`}
      description="Try a different search term, or clear the filters to see everything."
      action={
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  )
}
