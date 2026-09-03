import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { PublicShell } from '@/components/layout/public-shell'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { RequirePermission } from '@/features/auth/require-permission'
import { LoginPage } from '@/features/auth/login-page'
import { Spinner } from '@/components/ui/spinner'

/**
 * Route map.
 *
 * Three groups: public participant pages, the unauthenticated staff entry flow,
 * and the console behind `ProtectedRoute`. The onboarding wizard is protected
 * but sits outside the console shell — it is a full-screen task, not a
 * destination you navigate around from.
 *
 * Everything except the shells and the login screen is code-split by route. A
 * participant looking for a trial should not download the form builder, and the
 * console's first paint should not wait on the participant funnel.
 */

const RegisterPage = lazy(() =>
  import('@/features/auth/register-page').then((m) => ({ default: m.RegisterPage })),
)
const RegistrationSubmittedPage = lazy(() =>
  import('@/features/auth/registration-submitted').then((m) => ({
    default: m.RegistrationSubmittedPage,
  })),
)
const WorkspaceHub = lazy(() =>
  import('@/features/auth/workspace-hub').then((m) => ({ default: m.WorkspaceHub })),
)
const ChangePasswordPage = lazy(() =>
  import('@/features/auth/change-password-page').then((m) => ({ default: m.ChangePasswordPage })),
)
const OnboardingWizard = lazy(() =>
  import('@/features/onboarding/wizard').then((m) => ({ default: m.OnboardingWizard })),
)
const DashboardPage = lazy(() =>
  import('@/features/site/dashboard-page').then((m) => ({ default: m.DashboardPage })),
)
const SiteProfilePage = lazy(() =>
  import('@/features/site/site-profile-page').then((m) => ({ default: m.SiteProfilePage })),
)
const TeamPage = lazy(() =>
  import('@/features/site/team-page').then((m) => ({ default: m.TeamPage })),
)
const SiteHierarchyPage = lazy(() =>
  import('@/features/site/site-hierarchy-page').then((m) => ({ default: m.SiteHierarchyPage })),
)
const StudiesPage = lazy(() =>
  import('@/features/studies/studies-page').then((m) => ({ default: m.StudiesPage })),
)
const CreateStudyPage = lazy(() =>
  import('@/features/studies/create-study-page').then((m) => ({ default: m.CreateStudyPage })),
)
const PromoteStudyPage = lazy(() =>
  import('@/features/studies/promote-study-page').then((m) => ({ default: m.PromoteStudyPage })),
)
const RequestsPage = lazy(() =>
  import('@/features/studies/requests-page').then((m) => ({ default: m.RequestsPage })),
)
const RequestDetailPage = lazy(() =>
  import('@/features/studies/request-detail-page').then((m) => ({ default: m.RequestDetailPage })),
)
const StudyLayout = lazy(() =>
  import('@/features/study/study-layout').then((m) => ({ default: m.StudyLayout })),
)
const OverviewTab = lazy(() =>
  import('@/features/study/overview-tab').then((m) => ({ default: m.OverviewTab })),
)
const ParticipantsTab = lazy(() =>
  import('@/features/study/participants-tab').then((m) => ({ default: m.ParticipantsTab })),
)
const PrescreeningTab = lazy(() =>
  import('@/features/study/prescreening-tab').then((m) => ({ default: m.PrescreeningTab })),
)
const AssignmentTab = lazy(() =>
  import('@/features/study/assignment-tab').then((m) => ({ default: m.AssignmentTab })),
)
const StudyAssetsTab = lazy(() =>
  import('@/features/study/study-assets-tab').then((m) => ({ default: m.StudyAssetsTab })),
)
const MedicationsTab = lazy(() =>
  import('@/features/study/medications-tab').then((m) => ({ default: m.MedicationsTab })),
)
const EConsentsTab = lazy(() =>
  import('@/features/study/econsents-tab').then((m) => ({ default: m.EConsentsTab })),
)
const GroupSessionsTab = lazy(() =>
  import('@/features/study/group-sessions-tab').then((m) => ({ default: m.GroupSessionsTab })),
)
const QueriesTab = lazy(() =>
  import('@/features/study/queries-tab').then((m) => ({ default: m.QueriesTab })),
)
const AppointmentsTab = lazy(() =>
  import('@/features/study/appointments-tab').then((m) => ({ default: m.AppointmentsTab })),
)
const NotificationsTab = lazy(() =>
  import('@/features/study/notifications-tab').then((m) => ({ default: m.NotificationsTab })),
)
const LocationsTab = lazy(() =>
  import('@/features/study/locations-tab').then((m) => ({ default: m.LocationsTab })),
)
const TeamTab = lazy(() =>
  import('@/features/study/team-tab').then((m) => ({ default: m.TeamTab })),
)
const FormsLibraryPage = lazy(() =>
  import('@/features/forms/forms-library-page').then((m) => ({ default: m.FormsLibraryPage })),
)
const FormBuilderPage = lazy(() =>
  import('@/features/forms/form-builder-page').then((m) => ({ default: m.FormBuilderPage })),
)
const QuestionGroupsPage = lazy(() =>
  import('@/features/forms/question-groups-page').then((m) => ({ default: m.QuestionGroupsPage })),
)
const FindTrialsPage = lazy(() =>
  import('@/features/enroll/find-trials-page').then((m) => ({ default: m.FindTrialsPage })),
)
const TrialDetailPage = lazy(() =>
  import('@/features/enroll/trial-detail-page').then((m) => ({ default: m.TrialDetailPage })),
)
const EnrollmentPage = lazy(() =>
  import('@/features/enroll/enrollment-page').then((m) => ({ default: m.EnrollmentPage })),
)
const AboutStudiesPage = lazy(() =>
  import('@/features/enroll/about-studies-page').then((m) => ({ default: m.AboutStudiesPage })),
)
const NotFoundPage = lazy(() =>
  import('@/features/misc/not-found-page').then((m) => ({ default: m.NotFoundPage })),
)

/** Shown only while a route chunk is in flight, so it is deliberately quiet. */
function RouteFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center py-16">
      <Spinner label="Loading this page" />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/submitted" element={<RegistrationSubmittedPage />} />

        <Route element={<PublicShell />}>
          <Route path="/find-trials" element={<FindTrialsPage />} />
          <Route path="/trials/:nctId" element={<TrialDetailPage />} />
          <Route path="/trials/:nctId/sign-up" element={<EnrollmentPage />} />
          <Route path="/about" element={<AboutStudiesPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/hub" element={<WorkspaceHub />} />
          <Route path="/onboarding" element={<OnboardingWizard />} />

          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/studies" element={<StudiesPage />} />
            <Route path="/studies/new" element={<CreateStudyPage />} />
            <Route path="/studies/:studyId/promote" element={<PromoteStudyPage />} />
            <Route path="/studies/:studyId" element={<StudyLayout />}>
              <Route index element={<OverviewTab />} />
              <Route path="participants" element={<ParticipantsTab />} />
              <Route path="prescreening" element={<PrescreeningTab />} />
              <Route path="forms" element={<AssignmentTab category="form" />} />
              <Route path="surveys" element={<AssignmentTab category="survey" />} />
              <Route path="assets" element={<StudyAssetsTab />} />
              <Route path="medications" element={<MedicationsTab />} />
              <Route path="queries" element={<QueriesTab />} />
              <Route path="group-sessions" element={<GroupSessionsTab />} />
              <Route path="econsents" element={<EConsentsTab />} />
              <Route path="appointments" element={<AppointmentsTab />} />
              <Route path="notifications" element={<NotificationsTab />} />
              <Route path="locations" element={<LocationsTab />} />
              <Route path="team" element={<TeamTab />} />
            </Route>

            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/:requestId" element={<RequestDetailPage />} />

            <Route path="/forms" element={<FormsLibraryPage category="form" />} />
            <Route path="/forms/new" element={<FormBuilderPage category="form" />} />
            <Route path="/forms/:formId" element={<FormBuilderPage category="form" />} />
            <Route path="/surveys" element={<FormsLibraryPage category="survey" />} />
            <Route path="/surveys/new" element={<FormBuilderPage category="survey" />} />
            <Route path="/surveys/:formId" element={<FormBuilderPage category="survey" />} />
            <Route path="/question-groups" element={<QuestionGroupsPage />} />

            {/* Site setup: only roles that hold `site.view` reach these at all. */}
            <Route element={<RequirePermission permission="site.view" />}>
              <Route path="/site" element={<SiteProfilePage />} />
              <Route path="/site/:siteTab" element={<SiteProfilePage />} />
              <Route path="/site/team" element={<TeamPage />} />
              <Route path="/site/hierarchy" element={<SiteHierarchyPage />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
