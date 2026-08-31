import { Link } from 'react-router-dom'
import { Bell, ListChecks } from 'lucide-react'
import { NOTIFICATION_TEMPLATES } from '@/data/reference'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/patterns/page-header'
import { InferredNotice } from '@/components/patterns/inferred-notice'

/**
 * Question group templates.
 *
 * The legacy sidebar had an expandable "Question Groups" entry, but the source
 * material never shows what it contained. Two things in the evidence do point at
 * reusable question sets — the pre-screening groups attached to a study, and the
 * "Template Questions Group" a notification group is created from — so this
 * screen presents those templates in one place and links to where they are used.
 */
const PRESCREENING_TEMPLATES = [
  {
    name: 'Standard adult eligibility',
    description: 'Age, current trial participation and confirmed diagnosis.',
    questions: [
      'Are you 18 years of age or older?',
      'Have you been diagnosed with the condition under study?',
      'Are you currently enrolled in another clinical trial?',
    ],
  },
  {
    name: 'Respiratory screening',
    description: 'Used for asthma and COPD protocols.',
    questions: [
      'Have you been diagnosed with COPD or asthma by a physician?',
      'Are you a current or former smoker?',
      'Have you been hospitalised for breathing problems in the last 12 months?',
    ],
  },
  {
    name: 'Cardiometabolic screening',
    description: 'Used for diabetes, hypertension and cardiovascular protocols.',
    questions: [
      'Have you been diagnosed with type 2 diabetes?',
      'Are you currently taking medication for blood pressure?',
      'Have you had a heart attack or stroke in the last 12 months?',
    ],
  },
]

export function QuestionGroupsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Question Groups"
        description="Reusable sets of questions your studies draw on, so the same thing is asked the same way every time."
      />

      <InferredNotice>
        The legacy portal listed Question Groups in its navigation without showing the screen. This
        collects the two reusable question sets the rest of the product actually references.
      </InferredNotice>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="size-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Pre-screening templates
          </h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Starting points for the primary questions a participant answers before sign-up. Add them to
          a study from its Pre-screening tab.
        </p>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRESCREENING_TEMPLATES.map((template) => (
            <li key={template.name}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {template.questions.map((question) => (
                      <li key={question} className="flex gap-2 text-sm text-muted-foreground">
                        <span
                          className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
                          aria-hidden="true"
                        />
                        {question}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="pt-2">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="size-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Check-in templates
          </h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Templates a notification question group can be created from. Choose one from a study's
          Notifications tab.
        </p>

        <ul className="flex flex-wrap gap-2">
          {NOTIFICATION_TEMPLATES.map((template) => (
            <li key={template}>
              <Badge tone="neutral" className="px-3 py-1.5 text-sm">
                {template}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-border pt-6">
        <Button variant="outline" asChild>
          <Link to="/studies">Go to studies to use a template</Link>
        </Button>
      </div>
    </div>
  )
}
