'use client'

import { useState, useRef, useEffect, ReactNode, useLayoutEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import { Button } from './button'

// Hook to check if component is mounted (SSR-safe)
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

// Safe useLayoutEffect for SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

interface DropdownMenuProps {
  children: ReactNode
  trigger?: ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({ children, trigger, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ position: 'fixed', zIndex: 9999, opacity: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMounted = useIsMounted()

  // Calculate position after render
  useIsomorphicLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      
      const menuHeight = 220
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow
      
      const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        opacity: 1,
      }
      
      if (openUp) {
        style.bottom = viewportHeight - triggerRect.top + 4
      } else {
        style.top = triggerRect.bottom + 4
      }
      
      if (align === 'right') {
        style.right = viewportWidth - triggerRect.right
      } else {
        style.left = triggerRect.left
      }
      
      setMenuStyle(style)
    }
  }, [isOpen, align])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const menuContent = isOpen && (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        style={{ zIndex: 9998 }}
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className="w-48 rounded-xl border border-border bg-card shadow-xl py-1"
        style={menuStyle}
        onClick={() => setIsOpen(false)}
      >
        {children}
      </div>
    </>
  )

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger || <MoreVertical className="w-4 h-4" />}
      </Button>
      
      {isMounted && menuContent && createPortal(menuContent, document.body)}
    </>
  )
}

// Komplexes Dropdown für Custom-Inhalte (ohne automatisches Schliessen beim Klick)
interface DropdownMenuComplexProps {
  children: ReactNode
  trigger?: ReactNode
  triggerClassName?: string
  disabled?: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  width?: string
}

export function DropdownMenuComplex({ 
  children, 
  trigger, 
  triggerClassName,
  disabled = false,
  isOpen,
  onOpenChange,
  width = 'w-48'
}: DropdownMenuComplexProps) {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ position: 'fixed', zIndex: 9999, opacity: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMounted = useIsMounted()

  // Calculate position after render
  useIsomorphicLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      
      const menuHeight = 280
      const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow
      
      const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        opacity: 1,
        right: viewportWidth - triggerRect.right,
      }
      
      if (openUp) {
        style.bottom = viewportHeight - triggerRect.top + 4
      } else {
        style.top = triggerRect.bottom + 4
      }
      
      setMenuStyle(style)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onOpenChange])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onOpenChange])

  const menuContent = isOpen && (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0" 
        style={{ zIndex: 9998 }}
        onClick={() => onOpenChange(false)} 
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className={`${width} rounded-xl border border-border bg-card shadow-xl`}
        style={menuStyle}
      >
        {children}
      </div>
    </>
  )

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className={triggerClassName || "h-8 w-8 p-0"}
        onClick={() => onOpenChange(!isOpen)}
        disabled={disabled}
      >
        {trigger || <MoreVertical className="w-4 h-4" />}
      </Button>
      
      {isMounted && menuContent && createPortal(menuContent, document.body)}
    </>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'default' | 'destructive'
  disabled?: boolean
  icon?: ReactNode
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  href, 
  variant = 'default',
  disabled = false,
  icon
}: DropdownMenuItemProps) {
  const baseClasses = "flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors"
  const variantClasses = variant === 'destructive' 
    ? 'text-destructive hover:bg-destructive/10' 
    : 'text-foreground hover:bg-accent'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  
  const className = `${baseClasses} ${variantClasses} ${disabledClasses}`

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {icon}
        {children}
      </Link>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-border" />
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  )
}
