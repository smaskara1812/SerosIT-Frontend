import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { expandTwoDigitYear, setInputValue } from "@/lib/dateYear"

const INPUT_CLASSNAME = "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

// date/time/month/week render as separate browser-native segments (day,
// month, year, ...) with their own internal editing state. A normal
// controlled input re-applies `value` to the DOM on every render — for
// these types that forces the browser to reset the *whole* control back
// to that value, including whatever segment the user is still mid-typing,
// because the round-trip through this component's own onChange re-renders
// it with that same (now current) value on every keystroke. The calendar/
// clock picker never hits this since it always produces one complete
// value in a single atomic change, never an incomplete intermediate one —
// which is exactly why "pick from the calendar" has always worked while
// "type the date" hasn't. Fix: render uncontrolled, and only push `value`
// onto the DOM when it's genuinely different from what's already there
// (a real external change, e.g. a Clear button), never as an echo of the
// input's own just-fired onChange.
const SEGMENTED_TYPES = new Set(["date", "time", "datetime-local", "month", "week"])

function SegmentedInput({ className, value, onChange, onBlur, onKeyDown, ...props }) {
  const ref = React.useRef(null)

  // A two-digit year typed out of habit (12-01-26) is made a four-digit one (2026) when the person leaves the box or presses Enter,
  // never while they are still typing (typing 2026 passes through 0002, 0020 and 0202 on the way).
  const fixYear = () => {
    const el = ref.current
    if (!el || (props.type !== "date" && props.type !== "datetime-local")) return
    const next = expandTwoDigitYear(el.value)
    if (next !== el.value) setInputValue(el, next)
  }

  React.useEffect(() => {
    const el = ref.current
    if (el && el.value !== (value ?? "")) {
      el.value = value ?? ""
    }
  }, [value])

  return (
    <input
      ref={ref}
      defaultValue={value}
      onChange={onChange}
      onBlur={(e) => {
        fixYear()
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") fixYear()
        onKeyDown?.(e)
      }}
      data-slot="input"
      className={cn(INPUT_CLASSNAME, className)}
      {...props}
    />
  )
}

function Input({
  className,
  type,
  ...props
}) {
  if (SEGMENTED_TYPES.has(type)) {
    return <SegmentedInput type={type} className={className} {...props} />
  }
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(INPUT_CLASSNAME, className)}
      {...props} />
  );
}

export { Input }
