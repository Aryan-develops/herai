import { CheckCircle2, Clock, Headset, Inbox, Lock, Mail, MapPin, Phone, Send, UserCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/primitives'
import { FACILITATOR_TOPICS } from '../data/permissions'
import { useAsync } from '../hooks/useAsync'
import { cn, formatDate } from '../lib/utils'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'
import type { FacilitatorRequest, RequestStatus } from '../types'

interface FormState {
  name: string
  contact: string
  topic: string
  message: string
  consent: boolean
}

type Errors = Partial<Record<keyof FormState, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^(\+91[\s-]?)?[6-9]\d{9}$/

function validate(f: FormState): Errors {
  const e: Errors = {}
  if (f.name.trim().length < 2) e.name = 'Enter your name.'
  const c = f.contact.replace(/\s/g, '')
  if (!c) e.contact = 'Enter an email address or a 10-digit mobile number.'
  else if (!EMAIL.test(c) && !PHONE.test(c)) e.contact = 'This does not look like an email or a valid Indian mobile number.'
  if (!f.topic) e.topic = 'Choose a topic.'
  if (f.message.trim().length < 15) e.message = 'Tell us a little more (at least 15 characters).'
  if (!f.consent) e.consent = 'We need your consent to share your request with a facilitator.'
  return e
}

export default function HelpPage() {
  const [params] = useSearchParams()
  const initialTopic = FACILITATOR_TOPICS.find((t) => t === params.get('topic')) ?? matchTopic(params.get('topic'))
  const [form, setForm] = useState<FormState>({ name: '', contact: '', topic: initialTopic ?? '', message: '', consent: false })
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const submit = useAsync(api.submitRequest)
  const { requests, addRequest, log } = useAppStore()
  const list = useAsync(api.listRequests)

  useEffect(() => {
    void list.run(requests)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (touched[k]) setErrors(validate(next))
  }
  const blur = (k: keyof FormState) => {
    setTouched((t) => ({ ...t, [k]: true }))
    setErrors(validate(form))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setTouched({ name: true, contact: true, topic: true, message: true, consent: true })
    const first = Object.keys(errs)[0]
    if (first) {
      document.getElementById(`help-${first}`)?.focus()
      return
    }
    const r = await submit.run({ name: form.name.trim(), contact: form.contact.trim(), topic: form.topic, message: form.message.trim() })
    if (r) {
      addRequest(r)
      log('request', `Requested an IP facilitator (${r.topic}), reference ${r.id}`)
    }
  }

  const reset = () => {
    submit.reset()
    setForm({ name: form.name, contact: form.contact, topic: '', message: '', consent: false })
    setTouched({})
    setErrors({})
  }

  return (
    <>
      <PageHeader
        eyebrow="Help and escalation"
        title="Talk to a person"
        description="An IP facilitator from an IP Facilitation Centre can look at your situation. For disputes, they can refer you to an advocate or to free legal aid."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5 sm:p-7">
          {submit.status === 'success' ? (
            <div className="animate-rise py-6 text-center" role="status">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">Request received</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                A facilitator will contact you at <strong className="text-ink">{submit.data.contact}</strong> within two working days.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface-2 px-4 py-2 font-mono text-sm text-ink">
                Reference {submit.data.id}
              </p>
              <div className="mt-6">
                <Button onClick={reset}>Make another request</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <h2 className="text-lg font-semibold text-ink">Request an IP facilitator</h2>
              {submit.status === 'error' && <ErrorState compact message={submit.error.message} onRetry={submit.retry} />}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Your name" error={touched.name ? errors.name : undefined}>
                  <input
                    id="help-name"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    onBlur={() => blur('name')}
                    aria-invalid={!!(touched.name && errors.name)}
                    aria-describedby={touched.name && errors.name ? 'help-name-error' : undefined}
                    className={inputCls(!!(touched.name && errors.name))}
                  />
                </Field>
                <Field id="contact" label="Email or mobile number" hint="We use this only to reply to you." error={touched.contact ? errors.contact : undefined}>
                  <input
                    id="help-contact"
                    autoComplete="email"
                    inputMode="email"
                    value={form.contact}
                    onChange={(e) => set('contact', e.target.value)}
                    onBlur={() => blur('contact')}
                    aria-invalid={!!(touched.contact && errors.contact)}
                    aria-describedby={touched.contact && errors.contact ? 'help-contact-error' : 'help-contact-hint'}
                    className={inputCls(!!(touched.contact && errors.contact))}
                  />
                </Field>
              </div>

              <Field id="topic" label="Topic" error={touched.topic ? errors.topic : undefined}>
                <select
                  id="help-topic"
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value)}
                  onBlur={() => blur('topic')}
                  aria-invalid={!!(touched.topic && errors.topic)}
                  aria-describedby={touched.topic && errors.topic ? 'help-topic-error' : undefined}
                  className={cn(inputCls(!!(touched.topic && errors.topic)), 'cursor-pointer')}
                >
                  <option value="">Choose a topic</option>
                  {FACILITATOR_TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field id="message" label="What do you need help with?" hint="Don't include confidential formulation details. A facilitator will ask if needed." error={touched.message ? errors.message : undefined}>
                <textarea
                  id="help-message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  onBlur={() => blur('message')}
                  aria-invalid={!!(touched.message && errors.message)}
                  aria-describedby={touched.message && errors.message ? 'help-message-error' : 'help-message-hint'}
                  className={cn(inputCls(!!(touched.message && errors.message)), 'h-auto resize-y py-3')}
                />
              </Field>

              <div className={cn('rounded-xl border p-4', touched.consent && errors.consent ? 'border-danger/50 bg-danger-soft/40' : 'border-line bg-surface-2')}>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                  <input
                    id="help-consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => set('consent', e.target.checked)}
                    aria-invalid={!!(touched.consent && errors.consent)}
                    aria-describedby="help-consent-detail"
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
                  />
                  <span>
                    <span className="font-medium">I consent to IP-SAKTI Sahayak sharing my name, contact details and message with an IP Facilitation Centre so they can respond to this request.</span>
                    <span id="help-consent-detail" className="mt-1.5 block text-muted">
                      Under the Digital Personal Data Protection Act, 2023, your data is used only for this purpose, kept for 180 days after your request is closed, and then deleted. You can withdraw consent or ask for deletion at any time by quoting your reference number.
                    </span>
                  </span>
                </label>
                {touched.consent && errors.consent && (
                  <p id="help-consent-error" className="mt-2 pl-8 text-sm text-danger">
                    {errors.consent}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Sent over an encrypted connection
                </p>
                <Button type="submit" variant="primary" size="lg" icon={Send} loading={submit.status === 'loading'}>
                  Send request
                </Button>
              </div>
            </form>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Headset className="h-5 w-5 text-primary" aria-hidden />
              Other ways to get help
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="text-muted">
                  <span className="font-medium text-ink">IP Facilitation Centres</span> in many states, often at universities and industry bodies.
                </span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="text-muted">
                  <span className="font-medium text-ink">Legal aid:</span> call NALSA on 15100 for free legal services if you qualify.
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                <span className="text-muted">
                  <span className="font-medium text-ink">IP India</span> helpdesk for filing questions.
                </span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      <section className="mt-8" aria-labelledby="past-requests">
        <h2 id="past-requests" className="mb-3 text-lg font-semibold text-ink">
          Your requests
        </h2>
        {list.status === 'error' ? (
          <ErrorState message={list.error.message} onRetry={list.retry} />
        ) : !list.data ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : list.data.length === 0 ? (
          <Card>
            <EmptyState icon={Inbox} title="No requests yet" body="Requests you send appear here with their status." />
          </Card>
        ) : (
          <ul className={cn('space-y-3 transition-opacity', list.status === 'loading' && 'opacity-60')}>
            {list.data.map((r) => (
              <RequestRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function matchTopic(t: string | null): string | undefined {
  if (!t) return undefined
  const l = t.toLowerCase()
  if (l.includes('patent')) return 'Patents'
  if (l.includes('geographical')) return 'Geographical indications'
  if (l.includes('trade')) return 'Trade marks'
  if (l.includes('access') || l.includes('benefit')) return 'Access and benefit sharing'
  if (l.includes('advert') || l.includes('label')) return 'Advertising and labelling'
  if (l.includes('budapest')) return 'Budapest Treaty deposits'
  return 'Something else'
}

function inputCls(error: boolean) {
  return cn(
    'h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] text-ink outline-none transition-colors placeholder:text-subtle',
    error ? 'border-danger' : 'border-line focus:border-primary',
  )
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`help-${id}`} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`help-${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`help-${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const STATUS_META: Record<RequestStatus, { tone: 'accent' | 'intl' | 'primary'; icon: typeof Clock }> = {
  Received: { tone: 'accent', icon: Clock },
  Assigned: { tone: 'intl', icon: UserCheck },
  Resolved: { tone: 'primary', icon: CheckCircle2 },
}

function RequestRow({ r }: { r: FacilitatorRequest }) {
  const meta = STATUS_META[r.status]
  return (
    <li>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">{r.topic}</p>
            <p className="font-mono text-xs text-subtle">
              {r.id} · {formatDate(r.createdAt)}
            </p>
          </div>
          <Badge tone={meta.tone} icon={meta.icon}>
            {r.status}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{r.message}</p>
        {r.facilitator && <p className="mt-2 text-xs text-muted">Facilitator: <span className="font-medium text-ink">{r.facilitator}</span></p>}
      </Card>
    </li>
  )
}
