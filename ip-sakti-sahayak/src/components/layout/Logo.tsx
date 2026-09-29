export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0F5132" />
      <path d="M16 5.5c4.8 3.4 7.2 7.2 7.2 11.2A7.2 7.2 0 0 1 16 23.9a7.2 7.2 0 0 1-7.2-7.2c0-4 2.4-7.8 7.2-11.2Z" fill="#E6F2EB" />
      <path d="M16 10.5v15.5M16 16l3-2.6M16 19.5l-3-2.6" stroke="#0F5132" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="16" cy="26.5" r="2.1" fill="#E8A317" />
    </svg>
  )
}
