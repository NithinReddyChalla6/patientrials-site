import { Paperclip } from 'lucide-react'
import type { StudyForm } from '@/data/types'
import { RichText } from '@/components/ui/rich-text'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/patterns/empty-state'
import { FileText } from 'lucide-react'

/**
 * Live preview of the participant's view of a form.
 *
 * The legacy builder had no preview at all — you published and then opened the
 * participant app to find out what you had made. Seeing the result while writing
 * is the difference between a form that reads well and one that merely validates.
 */
export function FormPreview({ form }: { form: StudyForm }) {
  const questionCount = form.sections.reduce((n, s) => n + s.questions.length, 0)

  return (
    <div className="rounded-lg border border-border bg-sunken p-4">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          {form.title || 'Untitled form'}
        </h3>
        {form.description && (
          <RichText value={form.description} className="mt-2 text-sm leading-6 text-muted-foreground" />
        )}

        {questionCount === 0 ? (
          <EmptyState
            compact
            icon={FileText}
            title="No questions yet"
            description="Add a section and a question to see how this will read."
          />
        ) : (
          <div className="mt-6 space-y-8">
            {form.sections.map((section) => (
              <section key={section.id}>
                {section.title && (
                  <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                )}
                {section.description && (
                  <RichText
                    value={section.description}
                    className="mt-1 text-sm leading-6 text-muted-foreground"
                  />
                )}

                <ol className="mt-4 space-y-5">
                  {section.questions.map((question, index) => {
                    const id = `preview-${question.id}`
                    return (
                      <li key={question.id}>
                        <label
                          htmlFor={id}
                          className="block text-sm font-medium text-foreground"
                        >
                          {question.prompt || `Question ${index + 1}`}
                          {question.required && (
                            <span className="text-destructive" aria-hidden="true">
                              {' '}
                              *
                            </span>
                          )}
                        </label>

                        <div className="mt-2">
                          {question.type === 'Text' && (
                            <Textarea id={id} rows={3} disabled placeholder="Their answer" />
                          )}
                          {question.type === 'Number' && (
                            <Input id={id} disabled inputMode="numeric" placeholder="0" />
                          )}
                          {question.type === 'URL' && (
                            <Input id={id} disabled placeholder="https://" />
                          )}
                          {question.type === 'Date and/or Time' && (
                            <Input id={id} type="date" disabled />
                          )}
                          {question.type === 'Attachment' && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-3 text-sm text-muted-foreground">
                              <Paperclip className="size-4" aria-hidden="true" />
                              Upload a file
                            </div>
                          )}
                          {question.type === 'Choice' && (
                            <ul className="space-y-2">
                              {(question.options.length > 0
                                ? question.options
                                : ['Option 1', 'Option 2']
                              ).map((option) => (
                                <li
                                  key={option}
                                  className="flex items-center gap-2.5 text-sm text-muted-foreground"
                                >
                                  <span
                                    className="size-4 rounded-full border border-input"
                                    aria-hidden="true"
                                  />
                                  {option}
                                </li>
                              ))}
                            </ul>
                          )}
                          {question.type === 'Rating' && question.rating && (
                            <div>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: question.rating.scale }).map((_, i) => (
                                  <span
                                    key={i}
                                    className="flex size-8 items-center justify-center rounded-md border border-input text-xs text-muted-foreground"
                                    aria-hidden="true"
                                  >
                                    {i + 1}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                                <span>{question.rating.lowLabel || 'Lowest'}</span>
                                <span>{question.rating.highLabel || 'Highest'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
