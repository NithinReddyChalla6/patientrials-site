import type { Facility, IrbDetail, Lab, PastTrial, Site, User } from '@/data/types'

/** Everything the wizard reads in one go, shared by all six steps. */
export interface OnboardingSnapshot {
  site: Site
  pastTrials: PastTrial[]
  irbDetails: IrbDetail[]
  labs: Lab[]
  facilities: Facility[]
  collaborators: User[]
}

export interface StepProps {
  data: OnboardingSnapshot
  /** Re-reads the snapshot after a write so the stepper stays in sync. */
  reload: () => void
}
