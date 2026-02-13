import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 40,
  once = true,
  className = '',
  ...props
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-50px' })
  const dirMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }
  const offset = dirMap[direction] || dirMap.up
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  delay = 0,
  className = '',
  ...props
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay, delayChildren: delay } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  direction = 'up',
  distance = 30,
  duration = 0.5,
  className = '',
  ...props
}) {
  const dirMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }
  const offset = dirMap[direction] || dirMap.up
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, ...offset },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration, ease: [0.25, 0.1, 0.25, 1] } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function HoverLift({ children, className = '', ...props }) {
  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeOut' } }}
      whileTap={{ y: -2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function MagneticButton({ children, className = '', intensity = 0.3, ...props }) {
  const ref = useRef(null)
  function handleMouseMove(e) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * intensity
    const y = (e.clientY - rect.top - rect.height / 2) * intensity
    ref.current.style.transform = 'translate(' + x + 'px, ' + y + 'px)'
  }
  function handleMouseLeave() {
    if (!ref.current) return
    ref.current.style.transform = 'translate(0px, 0px)'
    ref.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)'
  }
  function handleMouseEnter() {
    if (!ref.current) return
    ref.current.style.transition = 'none'
  }
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </div>
  )
}

export function Float({ children, duration = 3, distance = 10, className = '', ...props }) {
  return (
    <motion.div
      animate={{ y: [-distance, distance, -distance] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function GlowPulse({ children, className = '', ...props }) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          '0 0 0 0 hsla(25, 60%, 30%, 0)',
          '0 0 20px 4px hsla(25, 60%, 30%, 0.15)',
          '0 0 0 0 hsla(25, 60%, 30%, 0)',
        ],
      }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function TextReveal({ text, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const words = text.split(' ')
  return (
    <motion.span ref={ref} className={className}>
      {words.map(function(word, i) {
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: delay + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ display: 'inline-block', marginRight: '0.3em' }}
          >
            {word}
          </motion.span>
        )
      })}
    </motion.span>
  )
}

export function PageTransition({ children, className = '' }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}