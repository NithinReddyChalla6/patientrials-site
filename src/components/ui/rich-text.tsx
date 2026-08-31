import * as React from 'react'
import { Textarea, type TextareaProps } from './textarea'

/**
 * Lightweight structured text.
 *
 * The legacy builder embedded TinyMCE for form and section descriptions, which
 * brought a full HTML editor — and its own iframe, toolbar and sanitising
 * problem — to a field that is used for a paragraph and the occasional list.
 * This keeps the capability that mattered (paragraphs, bulleted and numbered
 * lists) using line prefixes, with no editor dependency and no HTML to sanitise.
 */
export const RICH_TEXT_HINT =
  'Plain text. Start a line with “- ” for a bullet or “1. ” for a numbered list.'

export const RichTextField = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function RichTextField(props, ref) {
    return <Textarea ref={ref} rows={4} {...props} />
  },
)

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }

function parse(value: string): Block[] {
  const blocks: Block[] = []
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) continue

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const last = blocks[blocks.length - 1]

    if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1])
      else blocks.push({ kind: 'ul', items: [bullet[1]] })
    } else if (numbered) {
      if (last?.kind === 'ol') last.items.push(numbered[1])
      else blocks.push({ kind: 'ol', items: [numbered[1]] })
    } else if (last?.kind === 'p') {
      last.lines.push(line)
    } else {
      blocks.push({ kind: 'p', lines: [line] })
    }
  }
  return blocks
}

/** Renders the structured text written with `RichTextField`. */
export function RichText({ value, className }: { value: string; className?: string }) {
  const blocks = React.useMemo(() => parse(value), [value])
  if (blocks.length === 0) return null

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.kind === 'p') {
          return (
            <p key={i} className="mt-2 first:mt-0">
              {block.lines.join(' ')}
            </p>
          )
        }
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="mt-2 list-disc space-y-1 pl-5 first:mt-0">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <ol key={i} className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ol>
        )
      })}
    </div>
  )
}
