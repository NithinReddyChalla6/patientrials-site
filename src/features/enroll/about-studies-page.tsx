import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/**
 * Plain-language background for participants, and the terms the sign-up form
 * links to. The legacy app linked "I have read and accept the…" to nothing a
 * participant could actually read.
 */
export function AboutStudiesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold leading-tight text-foreground">
        About taking part in research
      </h1>

      <div className="mt-6 space-y-8 text-base leading-7 text-foreground">
        <section>
          <h2 className="text-xl font-semibold">What a clinical trial is</h2>
          <p className="mt-2 text-muted-foreground">
            A clinical trial is a carefully planned study that tests whether a treatment, device or
            approach to care works and is safe. Trials follow a written protocol reviewed by an
            independent ethics board before anyone takes part.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Taking part is your choice</h2>
          <p className="mt-2 text-muted-foreground">
            You decide whether to join, and you can leave at any point without giving a reason. Your
            usual care carries on either way, and your relationship with your own doctor is not
            affected.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">What signing up means</h2>
          <p className="mt-2 text-muted-foreground">
            Signing up on this site tells a study team you are interested. It does not enrol you.
            They will contact you, explain the study in full, and answer your questions. You only
            join after giving informed consent in person.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">How your information is used</h2>
          <p className="mt-2 text-muted-foreground">
            The answers you give are shared with the study team at the site running the trial, so
            they can check whether the study suits you and get in touch. They are not sold or used
            for advertising. If you are not eligible, or you decide not to continue, you can ask the
            site to delete your details.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Placeholder wording. This reference build reproduces the reading experience of the terms
            step; the operative privacy notice comes from the legal team.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Questions to ask</h2>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li>What is this study trying to find out?</li>
            <li>What would I have to do, and how often?</li>
            <li>What are the possible risks and benefits?</li>
            <li>What happens if I change my mind?</li>
            <li>Who do I contact if I have a problem?</li>
          </ul>
        </section>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <Button variant="brand" size="lg" asChild>
          <Link to="/find-trials">Find a trial</Link>
        </Button>
      </div>
    </div>
  )
}
