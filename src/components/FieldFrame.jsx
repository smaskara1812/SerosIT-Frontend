import { createContext, useContext } from 'react'

const FieldErrorsContext = createContext({})

// Draws the red outline + plain-language note around a form field that the
// server rejected (see buildFieldErrors in lib/errors.js). Wrap just the
// control — the label and any hint stay outside. Pass `error` directly, or
// `name` to read it from the surrounding FieldErrorScope.
export function FieldFrame({ error, name, children }) {
  const scoped = useContext(FieldErrorsContext)[name]
  const message = error ?? scoped
  return (
    <>
      <div data-field-error={message ? '' : undefined} className={message ? 'rounded-lg ring-2 ring-destructive/70' : ''}>
        {children}
      </div>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </>
  )
}

// Page root for forms whose fields are small <Field> wrappers: it is the
// page's outer <div>, and hands the error map to every FieldFrame inside.
export function FieldErrorScope({ errors, className, children }) {
  return (
    <FieldErrorsContext.Provider value={errors}>
      <div className={className}>{children}</div>
    </FieldErrorsContext.Provider>
  )
}
