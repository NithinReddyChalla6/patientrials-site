import { siteApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/features/auth/auth-context'
import { TeamManager } from './team-manager'

/** Standing view of the site's collaborators — the legacy "Collaborators" screen. */
export function TeamPage() {
  const state = useAsync(() => siteApi.listCollaborators(), [])
  const { can } = useAuth()
  const canManage = can('site.collaborators.manage')

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Collaborators"
        description="Everyone with access to this site. A person's role decides which parts of the console they see and what they can change."
      />

      {!canManage && (
        <Alert tone="info" title="You can view the team but not change it">
          Ask a Site Administrator to add someone or reset a password.
        </Alert>
      )}

      <AsyncBoundary
        state={state}
        loading={<Skeleton className="h-96" />}
        errorTitle="We could not load your team"
      >
        {(members) => (
          <TeamManager members={members} reload={state.reload} canManage={canManage} />
        )}
      </AsyncBoundary>
    </div>
  )
}
