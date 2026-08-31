import { NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { studiesApi } from '@/data/api'
import type { Study } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { RecruitmentBadge, StudyStatusBadge } from '@/components/patterns/status-badge'
import { Breadcrumbs } from '@/components/patterns/breadcrumbs'
import { STUDY_TABS } from '@/components/layout/nav-config'
import { useAuth } from '@/features/auth/auth-context'

export interface StudyContext {
  study: Study
  reload: () => void
}

/** Read the study the workspace is scoped to, from any tab. */
export function useStudy() {
  return useOutletContext<StudyContext>()
}

/**
 * The study workspace.
 *
 * Everything the legacy portal put behind an `#iframe` full of platform tabs —
 * subjects, pre-screening questions, forms, surveys, appointment templates,
 * notification groups, approved locations and the investigator assignment — is
 * a routed panel here. The study's identity stays on screen at all times, which
 * it did not when the iframe scrolled independently of the page around it.
 */
export function StudyLayout() {
  const { studyId = '' } = useParams()
  const state = useAsync(() => studiesApi.get(studyId), [studyId])
  const { can } = useAuth()
  const { pathname } = useLocation()

  const tabs = STUDY_TABS.filter((tab) => !tab.permission || can(tab.permission))
  const segment = pathname.split('/')[3] ?? ''
  const currentTab = tabs.find((t) => t.segment === segment)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AsyncBoundary
        state={state}
        loading={
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-12" />
            <Skeleton className="h-96" />
          </div>
        }
        errorTitle="We could not load this study"
      >
        {(study) => (
          <>
            <Breadcrumbs
              items={[
                { label: 'Studies', to: '/studies' },
                { label: study.id, to: `/studies/${study.id}` },
                ...(currentTab && currentTab.segment ? [{ label: currentTab.label }] : []),
              ]}
            />
            <PageHeader
              eyebrow={
                <span className="id">
                  {study.id} · {study.nctId}
                </span>
              }
              title={study.title}
              description={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{study.condition}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.phase}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.sponsor}</span>
                </span>
              }
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <StudyStatusBadge status={study.status} />
                  <RecruitmentBadge status={study.recruitmentStatus} />
                </div>
              }
            />

            <nav aria-label="Study sections" className="border-b border-border">
              <ul className="-mb-px flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <li key={tab.segment || 'overview'}>
                    <NavLink
                      to={tab.segment ? `/studies/${study.id}/${tab.segment}` : `/studies/${study.id}`}
                      end={tab.segment === ''}
                      className={({ isActive }) =>
                        cn(
                          'inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-brand text-foreground'
                            : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                        )
                      }
                    >
                      <tab.icon className="size-4" aria-hidden="true" />
                      {tab.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <Outlet context={{ study, reload: state.reload } satisfies StudyContext} />
          </>
        )}
      </AsyncBoundary>
    </div>
  )
}
