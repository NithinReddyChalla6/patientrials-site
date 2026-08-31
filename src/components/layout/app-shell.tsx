import * as React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConsoleSidebar } from './console-sidebar'
import { TopBar } from './top-bar'
import { CommandPalette, useCommandPalette } from './command-palette'
import { useAsync } from '@/lib/use-async'
import { siteApi } from '@/data/api'

/**
 * Console layout: persistent sidebar on large screens, a focus-trapped sheet
 * below 1024px, and a main region that receives focus on every route change so
 * keyboard users are not left at the top of the nav after navigating.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = React.useState(false)
  const location = useLocation()
  const mainRef = React.useRef<HTMLElement>(null)
  // The sheet is opened by a plain button rather than a Dialog.Trigger, so focus
  // restoration on close has to be wired explicitly.
  const navTriggerRef = React.useRef<HTMLButtonElement>(null)
  const palette = useCommandPalette()
  const site = useAsync(() => siteApi.get(), [])

  React.useEffect(() => {
    setNavOpen(false)
    mainRef.current?.focus()
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
        <div className="sticky top-0 h-dvh">
          <ConsoleSidebar />
        </div>
      </aside>

      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 lg:hidden data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border lg:hidden data-[state=open]:animate-slide-in-left data-[state=closed]:animate-fade-out"
            aria-label="Navigation"
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              navTriggerRef.current?.focus()
            }}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-3"
                aria-label="Close navigation"
              >
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
            <ConsoleSidebar onNavigate={() => setNavOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenNav={() => setNavOpen(true)}
          navTriggerRef={navTriggerRef}
          siteName={site.data?.name}
          onOpenSearch={() => palette.setOpen(true)}
        />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-4 py-5 outline-none sm:px-6 lg:py-6"
        >
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  )
}
