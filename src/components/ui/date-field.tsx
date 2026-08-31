import * as React from 'react'
import { Input } from './input'

export type DateFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Native date input.
 *
 * The legacy participant form used a text box with a DD/MM/YYYY placeholder,
 * which meant every participant had to guess the separator and order. A native
 * date input gives locale-correct formatting, a platform picker on mobile, and
 * keyboard entry that assistive tech understands.
 */
export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  props,
  ref,
) {
  return <Input ref={ref} type="date" {...props} />
})
