import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/empty-state'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <EmptyState
        titleAs="h1"
        icon={Compass}
        title="We could not find that page"
        description="The link may be out of date, or the record may have been removed."
        action={
          <Button variant="brand" asChild>
            <Link to="/dashboard">Go to the dashboard</Link>
          </Button>
        }
        secondaryAction={
          <Button variant="outline" asChild>
            <Link to="/find-trials">Find a trial</Link>
          </Button>
        }
      />
    </div>
  )
}
