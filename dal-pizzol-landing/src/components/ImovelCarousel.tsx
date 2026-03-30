import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Imovel } from '../types/imovel'
import { ImovelSlide } from './ImovelSlide'
import styles from './ImovelCarousel.module.css'

export interface ImovelCarouselProps {
  imoveis: Imovel[]
  onActiveImovelChange?: (imovel: Imovel) => void
}

/**
 * Troca automática entre imóveis (10s, pausa no hover).
 */
export function ImovelCarousel({ imoveis, onActiveImovelChange }: ImovelCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const len = imoveis.length
  const activeIndex = len > 0 ? ((currentIndex % len) + len) % len : 0
  const active = len > 0 ? imoveis[activeIndex] : undefined

  useEffect(() => {
    if (active) onActiveImovelChange?.(active)
  }, [active, onActiveImovelChange])

  const nextSlide = useCallback(() => {
    if (len === 0) return
    setCurrentIndex((i) => (i + 1) % len)
  }, [len])

  const goToSlide = useCallback(
    (index: number) => {
      if (index >= 0 && index < len) setCurrentIndex(index)
    },
    [len],
  )

  useEffect(() => {
    if (len === 0 || isPaused) return
    const id = window.setInterval(nextSlide, 10_000)
    return () => clearInterval(id)
  }, [len, isPaused, nextSlide])

  if (len === 0) {
    return <p className={styles.empty}>Nenhum imóvel para exibir.</p>
  }

  const current = imoveis[activeIndex]

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Imóveis em destaque"
    >
      <div className={styles.viewport} aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.link}
            className={styles.motionLayer}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImovelSlide imovel={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.dots} role="tablist" aria-label="Selecionar imóvel">
        {imoveis.map((imovel, index) => (
          <button
            key={`${imovel.link}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Imóvel ${index + 1}: ${imovel.title}`}
            className={index === activeIndex ? styles.dotActive : styles.dot}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  )
}
