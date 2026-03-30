import { useId } from 'react'
import type { Imovel } from '../types/imovel'
import { defaultOverlayCaption, getMosaicImages } from '../utils/gallery'
import styles from './ImovelSlide.module.css'

export interface ImovelSlideProps {
  imovel: Imovel
}

/**
 * Card mobile Dal Pizzol: hero com degradê + legenda, bloco branco com título,
 * local, especificações, preço e mosaico 2 colunas (1 grande | 2 empilhadas).
 */
export function ImovelSlide({ imovel }: ImovelSlideProps) {
  const headingId = useId()
  const [leftSrc, rightTopSrc, rightBottomSrc] = getMosaicImages(imovel)
  const caption = defaultOverlayCaption(imovel)
  const priceLabel = imovel.priceLabel ?? 'Venda'

  return (
    <article className={styles.root} aria-labelledby={headingId}>
      <div className={styles.card}>
        <div className={styles.hero}>
          <img
            className={styles.heroImg}
            src={imovel.img}
            alt={imovel.title}
            loading="eager"
            decoding="async"
          />
          <div className={styles.heroGradient} aria-hidden />
          <p className={styles.heroCaption}>{caption}</p>
        </div>

        <div className={styles.body}>
          <h2 id={headingId} className={styles.title}>
            {imovel.title}
          </h2>
          <p className={styles.location}>{imovel.location}</p>

          {imovel.specsLine1 ? <p className={styles.specs}>{imovel.specsLine1}</p> : null}
          {imovel.specsLine2 ? <p className={styles.specs}>{imovel.specsLine2}</p> : null}

          <p className={styles.priceLabel}>{priceLabel}</p>
          <p className={styles.price}>{imovel.price}</p>

          <a className={styles.detailLink} href={imovel.link} target="_blank" rel="noopener noreferrer">
            Ver ficha completa
          </a>
        </div>
      </div>

      <div className={styles.mosaic} aria-label="Mais fotos do imóvel">
        <div className={styles.mosaicLeft}>
          <img src={leftSrc} alt="" loading="lazy" decoding="async" />
        </div>
        <div className={styles.mosaicRightTop}>
          <img src={rightTopSrc} alt="" loading="lazy" decoding="async" />
        </div>
        <div className={styles.mosaicRightBottom}>
          <img src={rightBottomSrc} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    </article>
  )
}
