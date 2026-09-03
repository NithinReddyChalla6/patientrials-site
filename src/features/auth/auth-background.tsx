import * as React from 'react'

/**
 * Ambient clinical backdrop for the sign-in page.
 *
 * A calm, slow-scrolling ECG trace, like a resting heart monitor, drawn on a
 * canvas over a faint brand wash and ECG-paper grid. It is purely decorative,
 * sits behind the content, and holds still for anyone who prefers reduced
 * motion. Only the sign-in page uses it; the console stays flat and quiet.
 */
export function AuthBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const context = el.getContext('2d')
    if (!context) return
    const canvas: HTMLCanvasElement = el
    const ctx: CanvasRenderingContext2D = context

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0

    function resize() {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // One heartbeat, sampled on t in [0,1). Small P and T bumps, a sharp QRS.
    function ecg(t: number) {
      const gauss = (c: number, w: number, a: number) =>
        a * Math.exp(-((t - c) ** 2) / (2 * w * w))
      const spike = (c: number, hw: number, a: number) =>
        t > c - hw && t < c + hw ? a * (1 - Math.abs((t - c) / hw)) : 0
      return (
        gauss(0.17, 0.02, 0.14) + // P wave
        gauss(0.56, 0.04, 0.26) + // T wave
        spike(0.28, 0.012, -0.12) + // Q
        spike(0.3, 0.012, 1.0) + // R
        spike(0.325, 0.014, -0.3) // S
      )
    }

    // Placed in the open bands above the content and near the foot of the
    // viewport, so the trace always reads without sitting under a card.
    const traces = [
      { y: () => 116, beat: 240, amp: 32, speed: 26, alpha: 0.2, glow: 12 },
      { y: (h: number) => h - 118, beat: 300, amp: 26, speed: 17, alpha: 0.12, glow: 8 },
    ]

    let raf = 0
    const start = performance.now()

    function draw(now: number) {
      const elapsed = (now - start) / 1000
      ctx.clearRect(0, 0, width, height)
      for (const tr of traces) {
        const baseY = tr.y(height)
        const offset = reduce ? tr.beat * 0.3 : elapsed * tr.speed
        ctx.beginPath()
        for (let x = 0; x <= width; x += 2) {
          const t = ((((x + offset) / tr.beat) % 1) + 1) % 1
          const y = baseY - ecg(t) * tr.amp
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(3, 105, 161, ${tr.alpha})`
        ctx.lineWidth = 1.6
        ctx.lineJoin = 'round'
        ctx.shadowColor = 'rgba(3, 105, 161, 0.35)'
        ctx.shadowBlur = tr.glow
        ctx.stroke()
        ctx.shadowBlur = 0
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }

    if (reduce) draw(performance.now())
    else raf = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="auth-bg" aria-hidden="true">
      <div className="auth-bg__grid" />
      <canvas ref={canvasRef} className="auth-bg__canvas" />
      <div className="auth-bg__glow auth-bg__glow--azure" />
      <div className="auth-bg__glow auth-bg__glow--orange" />
    </div>
  )
}
