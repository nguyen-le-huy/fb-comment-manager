/**
 * Lightweight toast utility — no external dependency required.
 * Uses a simple DOM-injected notification since shadcn-vue toast
 * is not installed in this project.
 */

type ToastVariant = 'default' | 'destructive'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

let container: HTMLElement | null = null

function getContainer(): HTMLElement {
  if (!container || !document.body.contains(container)) {
    container = document.createElement('div')
    container.id = 'toast-container'
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-end',
      pointerEvents: 'none',
    })
    document.body.appendChild(container)
  }
  return container
}

export function toast(options: ToastOptions): void {
  const { title, description, variant = 'default', duration = 3500 } = options

  const isDestructive = variant === 'destructive'

  const el = document.createElement('div')
  Object.assign(el.style, {
    background: isDestructive ? '#ef4444' : '#1e293b',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    minWidth: '240px',
    maxWidth: '360px',
    opacity: '0',
    transform: 'translateY(12px)',
    transition: 'opacity 200ms ease, transform 200ms ease',
    pointerEvents: 'auto',
    fontFamily: 'inherit',
  })

  el.innerHTML = `
    <div style="font-size:13px;font-weight:600;line-height:1.3">${title}</div>
    ${description ? `<div style="font-size:12px;opacity:0.8;margin-top:2px;line-height:1.4">${description}</div>` : ''}
  `

  getContainer().appendChild(el)

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translateY(0)'
  })

  // Animate out and remove
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    setTimeout(() => el.remove(), 220)
  }, duration)
}

/** Drop-in replacement for `useToast()` from shadcn-vue */
export function useToast(): { toast: typeof toast } {
  return { toast }
}
