"use client"

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"

const SYMBOLS = [
  // Math symbols
  "\u03C0", "x\u00B2", "\u222B", "\u221A", "\u03A3",
  "\u03B1", "\u03B2", "\u03B8", "\u0394", "\u03C6",
  "\u221E", "\u2248", "\u2260", "\u00B1", "\u00F7",
  "\u00D7", "\u2202", "\u03BB", "\u03BC", "\u03C9",
  // Greek letters
  "\u03B3", "\u03B5", "\u03B4", "\u03B6", "\u03B7",
  "\u03BA", "\u03BD", "\u03BE", "\u03C1", "\u03C3",
  "\u03C4", "\u03C8",
  // Latin letters
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  // German special
  "\u00DF", "\u00C4", "\u00D6", "\u00DC",
]

interface FloatingSymbol {
  id: number
  symbol: string
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
  driftX: number
  driftY: number
}

function generateSymbols(count: number): FloatingSymbol[] {
  const symbols: FloatingSymbol[] = []
  for (let i = 0; i < count; i++) {
    symbols.push({
      id: i,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 32 + Math.random() * 48,
      opacity: 0.06 + Math.random() * 0.035,
      duration: 18 + Math.random() * 30,
      delay: -(Math.random() * 20),
      driftX: (Math.random() - 0.5) * 60,
      driftY: (Math.random() - 0.5) * 40,
    })
  }
  return symbols
}

const subscribeToHydration = () => () => undefined

export function MathBackground() {
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const symbols = useMemo(() => (mounted ? generateSymbols(18) : []), [mounted])
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const symbolRefs = useRef<(HTMLSpanElement | null)[]>([])
  const offsetsRef = useRef<{ x: number; y: number }[]>([])
  const rafRef = useRef<number>(0)

  const REPEL_RADIUS = 120
  const REPEL_STRENGTH = 12

  useEffect(() => {
    function animate() {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (let i = 0; i < symbols.length; i++) {
        const el = symbolRefs.current[i]
        if (!el) continue

        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2

        const dx = cx - mx
        const dy = cy - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const offsets = offsetsRef.current[i] ?? (offsetsRef.current[i] = { x: 0, y: 0 })

        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH
          const targetX = (dx / dist) * force
          const targetY = (dy / dist) * force
          offsets.x += (targetX - offsets.x) * 0.06
          offsets.y += (targetY - offsets.y) * 0.06
        } else {
          offsets.x *= 0.96
          offsets.y *= 0.96
        }

        if (Math.abs(offsets.x) > 0.1 || Math.abs(offsets.y) > 0.1) {
          el.style.transform = `translate(${offsets.x}px, ${offsets.y}px)`
        } else {
          el.style.transform = ""
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [symbols, mounted])

  // Don't render anything on server to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      />
    )
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {symbols.map((s, i) => (
        <span
          key={s.id}
          ref={(el) => { symbolRefs.current[i] = el }}
          className="absolute select-none font-sans text-foreground will-change-transform"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: `${s.size}px`,
            opacity: s.opacity,
            animation: `floatSymbol${i % 4} ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        >
          {s.symbol}
        </span>
      ))}

      <style jsx>{`
        @keyframes floatSymbol0 {
          0%, 100% { translate: 0 0; }
          25% { translate: 15px -20px; }
          50% { translate: -10px -35px; }
          75% { translate: -20px -10px; }
        }
        @keyframes floatSymbol1 {
          0%, 100% { translate: 0 0; }
          25% { translate: -20px 15px; }
          50% { translate: 10px 30px; }
          75% { translate: 25px 10px; }
        }
        @keyframes floatSymbol2 {
          0%, 100% { translate: 0 0; }
          33% { translate: 25px -15px; }
          66% { translate: -15px 20px; }
        }
        @keyframes floatSymbol3 {
          0%, 100% { translate: 0 0; }
          20% { translate: -12px -25px; }
          40% { translate: 18px -10px; }
          60% { translate: 8px 20px; }
          80% { translate: -18px 8px; }
        }
      `}</style>
    </div>
  )
}
