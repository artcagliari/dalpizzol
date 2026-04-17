import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Imovel } from '../types/imovel'
import type { ImoveisLoadStatus } from '../hooks/useImoveis'
import type { TelaoSlideModel } from '../types/telao'
import type { AddLocalImovelInput, LocalImovelFormData, LocalImovelSummary } from '../hooks/useLocalImoveis'
import { AddImovelModal } from './AddImovelModal'
import { ManageLocalImoveisModal } from './ManageLocalImoveisModal'
import { getTelaoGradient, mapImoveisToTelao } from '../utils/telaoMap'
import { formatPriceBRL } from '../utils/price'
import { SITE_URL } from '../constants/site'
import styles from './Telao.module.css'

/** Tempo em cada foto antes de ir à próxima (ou ao próximo imóvel na última foto). */
const PHOTO_DWELL_MS = 4_000
const PROG_STEP_MS = 150
type ThemeMode = 'dark' | 'light'

export interface TelaoProps {
  imoveis: Imovel[]
  loadStatus: ImoveisLoadStatus
  logoSrc?: string
  topbarLogoSrc?: string
  logoSemSrc?: string
  themeMode?: ThemeMode
  onThemeModeChange?: (mode: ThemeMode) => void
  onAddLocalImovel?: (data: AddLocalImovelInput) => Promise<void>
  onUpdateLocalImovel?: (id: string, data: AddLocalImovelInput) => Promise<void>
  onGetLocalImovelForEdit?: (id: string) => Promise<LocalImovelFormData>
  onDeleteLocalImovel?: (localId: string) => Promise<void>
  localSummaries?: LocalImovelSummary[]
}

export function Telao({
  imoveis,
  loadStatus,
  logoSrc,
  topbarLogoSrc,
  logoSemSrc,
  themeMode = 'dark',
  onThemeModeChange,
  onAddLocalImovel,
  onUpdateLocalImovel,
  onGetLocalImovelForEdit,
  onDeleteLocalImovel,
  localSummaries = [],
}: TelaoProps) {
  const topRightLogo = topbarLogoSrc ?? logoSrc
  const loadingLogo = logoSrc ?? topbarLogoSrc
  const slides = useMemo(() => mapImoveisToTelao(imoveis), [imoveis])
  const len = slides.length
  const [currentIdx, setCurrentIdx] = useState(0)
  const activeIndex = len > 0 ? ((currentIdx % len) + len) % len : 0

  const [photoIdx, setPhotoIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progVal, setProgVal] = useState(0)
  const [showLoading, setShowLoading] = useState(true)
  const [hideUi, setHideUi] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(document.fullscreenElement))
  const [showAddImovelModal, setShowAddImovelModal] = useState(false)
  const [showManageLocalModal, setShowManageLocalModal] = useState(false)
  const [addImovelModalKey, setAddImovelModalKey] = useState(0)
  const [showEditImovelModal, setShowEditImovelModal] = useState(false)
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null)
  const [editingInitialData, setEditingInitialData] = useState<LocalImovelFormData | null>(null)
  const [editImovelModalKey, setEditImovelModalKey] = useState(0)
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false)
  const progRef = useRef(0)

  const activeSlide = slides[activeIndex]
  const isLightTheme = themeMode === 'light'

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Ignora rejeições de fullscreen em navegadores/dispositivos sem suporte.
    }
  }, [])

  const toggleThemeMode = useCallback(() => {
    if (!onThemeModeChange) return
    onThemeModeChange(isLightTheme ? 'dark' : 'light')
  }, [isLightTheme, onThemeModeChange])

  useEffect(() => {
    if (loadStatus !== 'ready') return
    const t = window.setTimeout(() => setShowLoading(false), 400)
    return () => clearTimeout(t)
  }, [loadStatus])

  const navTo = useCallback(
    (idx: number) => {
      if (len === 0) return
      const n = ((idx % len) + len) % len
      setCurrentIdx(n)
      setPhotoIdx(0)
    },
    [len],
  )

  const navSlide = useCallback((dir: number) => {
    setCurrentIdx((i) => i + dir)
    setPhotoIdx(0)
  }, [])

  /** Avanço automático: preenche a barra em PHOTO_DWELL_MS; depois próxima foto ou próximo imóvel. */
  useEffect(() => {
    if (len === 0 || paused || showLoading) return
    const slide = slides[activeIndex]
    const nPhotos = Math.max(1, slide?.photoUrls.length ?? 1)

    let raf = 0
    raf = window.requestAnimationFrame(() => {
      progRef.current = 0
      setProgVal(0)
    })

    const inc = 100 / (PHOTO_DWELL_MS / PROG_STEP_MS)
    const progTimer = window.setInterval(() => {
      progRef.current = Math.min(progRef.current + inc, 100)
      setProgVal(progRef.current)
    }, PROG_STEP_MS)

    const photoTimer = window.setTimeout(() => {
      const safeP = Math.min(photoIdx, nPhotos - 1)
      const isLastPhoto = safeP >= nPhotos - 1
      if (isLastPhoto) {
        setCurrentIdx((i) => i + 1)
        setPhotoIdx(0)
        return
      }
      setPhotoIdx(safeP + 1)
    }, PHOTO_DWELL_MS)

    return () => {
      window.cancelAnimationFrame(raf)
      window.clearInterval(progTimer)
      window.clearTimeout(photoTimer)
    }
  }, [activeIndex, photoIdx, len, paused, showLoading, slides])

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showAddImovelModal || showManageLocalModal || showEditImovelModal) {
        if (e.key === 'Escape') {
          setShowAddImovelModal(false)
          setShowManageLocalModal(false)
          setShowEditImovelModal(false)
        }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navSlide(1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navSlide(-1)
      if (e.key === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      }
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setHideUi((v) => !v)
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        void toggleFullscreen()
      }
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        toggleThemeMode()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navSlide, showAddImovelModal, showManageLocalModal, showEditImovelModal, toggleFullscreen, toggleThemeMode])

  const nPhotosActive = len > 0 ? Math.max(1, activeSlide?.photoUrls.length ?? 1) : 0
  const counterLine =
    len === 0
      ? 'Nenhum imóvel na lista'
      : nPhotosActive > 1
        ? `Foto ${photoIdx + 1}/${nPhotosActive} · Imóvel ${activeIndex + 1}/${slides.length}`
        : `Imóvel ${activeIndex + 1} / ${slides.length}`

  return (
    <div className={`${styles.app} ${isFullscreen ? styles.fullscreenMode : ''} ${isLightTheme ? styles.themeLight : ''}`}>
      {showAddImovelModal && onAddLocalImovel ? (
        <AddImovelModal
          key={addImovelModalKey}
          onClose={() => setShowAddImovelModal(false)}
          onSave={onAddLocalImovel}
          themeMode={themeMode}
        />
      ) : null}

      {showManageLocalModal && onDeleteLocalImovel ? (
        <ManageLocalImoveisModal
          themeMode={themeMode}
          summaries={localSummaries}
          onClose={() => setShowManageLocalModal(false)}
          onDelete={onDeleteLocalImovel}
          onEdit={async (id) => {
            if (!onGetLocalImovelForEdit) return
            const data = await onGetLocalImovelForEdit(id)
            setEditingLocalId(id)
            setEditingInitialData(data)
            setEditImovelModalKey((k) => k + 1)
            setShowManageLocalModal(false)
            setShowEditImovelModal(true)
          }}
        />
      ) : null}

      {showEditImovelModal && onUpdateLocalImovel && editingLocalId && editingInitialData ? (
        <AddImovelModal
          key={editImovelModalKey}
          mode="edit"
          initialData={editingInitialData}
          themeMode={themeMode}
          onClose={() => {
            setShowEditImovelModal(false)
            setEditingLocalId(null)
            setEditingInitialData(null)
          }}
          onSave={async (data) => {
            await onUpdateLocalImovel(editingLocalId, data)
            setShowEditImovelModal(false)
            setEditingLocalId(null)
            setEditingInitialData(null)
          }}
        />
      ) : null}

      <div
        className={`${styles.loading} ${!showLoading ? styles.loadingHidden : ''}`}
        aria-busy={showLoading}
        aria-hidden={!showLoading}
      >
        {loadingLogo ? (
          <img className={styles.loadLogoImg} src={loadingLogo} alt="" />
        ) : (
          <div className={styles.loadLogo}>Dalpizzol</div>
        )}
        <div className={styles.loadSub}>Negócios Imobiliários</div>
        <div className={styles.loadDivider} />
        <div className={styles.loadSpinner} />
        <div className={styles.loadMsg}>
          {loadStatus === 'loading' ? 'Buscando imóveis disponíveis…' : 'Preparando apresentação…'}
        </div>
      </div>

      {!showLoading && loadStatus === 'ready' && (
        <>
          {!hideUi ? (
            <div className={styles.topbar}>
              <div className={styles.brandRow}>
                <div>
                  <div className={styles.logoMark}>Dalpizzol</div>
                  <div className={styles.logoSub}>
                    Negócios Imobiliários · Bento Gonçalves · Garibaldi
                    <br />
                    Carlos Barbosa · Farroupilha
                  </div>
                </div>
              </div>
              <div className={styles.topRight}>
                {topRightLogo ? (
                  <a
                    className={styles.topbarLogoLink}
                    href={SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Dal Pizzol — abrir site"
                  >
                    <img
                      className={styles.topbarLogoFull}
                      src={topRightLogo}
                      alt="Dal Pizzol Negócios Imobiliários"
                    />
                  </a>
                ) : null}
                <div className={styles.counter}>{counterLine}</div>
              </div>
            </div>
          ) : null}

          <div className={styles.slidesWrapper} role="presentation">
            {len > 0 ? (
              <>
                {!hideUi ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.navBtn} ${styles.navPrev}`}
                      onClick={() => navSlide(-1)}
                      aria-label="Anterior"
                    >
                      ‹
                    </button>
                    <button type="button" className={`${styles.navBtn} ${styles.navNext}`} onClick={() => navSlide(1)} aria-label="Próximo">
                      ›
                    </button>
                  </>
                ) : null}

                {slides.map((prop, i) => (
                  <TelaoSlide
                    key={prop.id}
                    prop={prop}
                    active={i === activeIndex}
                    logoSemSrc={logoSemSrc}
                    photoIndex={i === activeIndex ? photoIdx : 0}
                    onPhotoSelect={i === activeIndex ? setPhotoIdx : undefined}
                    hideUi={hideUi}
                  />
                ))}
              </>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Lista vazia</p>
                <p className={styles.emptyMsg}>
                  Use <strong>Novo imóvel</strong> para enviar fotos e dados (guardados neste aparelho) ou edite{' '}
                  <code>public/imoveis.json</code> com URLs de imagem.
                </p>
              </div>
            )}
          </div>

          {!hideUi ? (
            <div className={styles.bottomDock}>
              <div
                id="telao-bottom-menu"
                className={`${styles.bottombarCollapsible} ${bottomMenuOpen ? styles.bottombarCollapsibleOpen : ''}`}
                aria-hidden={!bottomMenuOpen}
              >
                <div className={styles.bottombar}>
                  {onAddLocalImovel ? (
                    <button
                      type="button"
                      className={styles.newImovelBtn}
                      onClick={() => {
                        setAddImovelModalKey((k) => k + 1)
                        setShowAddImovelModal(true)
                      }}
                      data-stop-tap
                    >
                      Novo imóvel
                    </button>
                  ) : null}
                  {onDeleteLocalImovel ? (
                    <button
                      type="button"
                      className={styles.manageLocalBtn}
                      onClick={() => setShowManageLocalModal(true)}
                      data-stop-tap
                    >
                      Imóveis locais
                    </button>
                  ) : null}
                  {activeSlide?.localDbId && onDeleteLocalImovel ? (
                    <button
                      type="button"
                      className={styles.deleteLocalBtn}
                      onClick={async () => {
                        if (!activeSlide.localDbId) return
                        if (!window.confirm(`Apagar “${activeSlide.title}” deste dispositivo?`)) return
                        await onDeleteLocalImovel(activeSlide.localDbId)
                      }}
                      data-stop-tap
                    >
                      Apagar atual
                    </button>
                  ) : null}
                  <button type="button" className={styles.manageLocalBtn} onClick={() => void toggleFullscreen()} data-stop-tap>
                    {isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}
                  </button>
                  {onThemeModeChange ? (
                    <button type="button" className={styles.manageLocalBtn} onClick={toggleThemeMode} data-stop-tap>
                      {isLightTheme ? 'Modo escuro' : 'Modo branco'}
                    </button>
                  ) : null}
                  <button type="button" className={styles.manageLocalBtn} onClick={() => setHideUi(true)} data-stop-tap>
                    Ocultar UI
                  </button>
                  <div className={styles.dots}>
                    {slides.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                        aria-label={`Imóvel ${i + 1}`}
                        aria-current={i === activeIndex}
                        onClick={() => navTo(i)}
                      />
                    ))}
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${progVal}%` }} />
                  </div>
                  <div className={styles.siteUrl}>
                    <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
                      www.dalpizzolimoveis.com.br
                    </a>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.bottomMenuToggle}
                onClick={() => setBottomMenuOpen((v) => !v)}
                aria-expanded={bottomMenuOpen}
                aria-controls="telao-bottom-menu"
                data-stop-tap
              >
                {bottomMenuOpen ? 'Ocultar menu' : 'Menu'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function TelaoSlide({
  prop,
  active,
  logoSemSrc,
  photoIndex,
  onPhotoSelect,
  hideUi,
}: {
  prop: TelaoSlideModel
  active: boolean
  logoSemSrc?: string
  photoIndex: number
  onPhotoSelect?: (index: number) => void
  hideUi: boolean
}) {
  const n = Math.max(1, prop.photoUrls.length)
  const safeIdx = ((photoIndex % n) + n) % n
  const url = prop.photoUrls[safeIdx] ?? prop.photoUrls[0]
  const bgStyle = url
    ? { backgroundImage: `url('${url}')` }
    : { background: getTelaoGradient(prop.type) }

  const multiPhotos = prop.photoUrls.length > 1
  return (
    <div className={`${styles.slide} ${active ? styles.slideActive : ''}`} aria-hidden={!active}>
      <div className={styles.imgPanel}>
        <div className={styles.imgBg} style={bgStyle} />
        <div className={styles.imgOverlayR} />
        <div className={styles.imgOverlayB} />
        {multiPhotos && !hideUi ? (
          <div className={styles.imgFilmstrip} data-stop-tap onClick={(e) => e.stopPropagation()}>
            {prop.photoUrls.map((u, i) => (
              <button
                key={`${u}-${i}`}
                type="button"
                className={`${styles.filmThumb} ${i === safeIdx ? styles.filmThumbActive : ''}`}
                onClick={() => onPhotoSelect?.(i)}
                aria-label={`Foto ${i + 1} de ${prop.photoUrls.length}`}
                aria-current={i === safeIdx}
              >
                <img src={u} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.detailPanel}>
        <div className={styles.detailInner}>
          <div className={styles.propCity}>
            <span className={styles.pin} aria-hidden>
              ●
            </span>{' '}
            {prop.location || 'Bento Gonçalves · RS'}
          </div>
          <h2 className={styles.propTitle}>{prop.title || 'Imóvel disponível'}</h2>
          <div className={styles.propPrice}>
            {formatPriceBRL(prop.price)}
            {prop.purpose === 'Aluguel' ? <small> /mês</small> : null}
          </div>
          <div className={styles.statsRow}>
            {prop.area ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Área</span>
                <span className={styles.statValue}>{prop.area}</span>
              </div>
            ) : null}
            {prop.bedrooms > 0 ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Quartos</span>
                <span className={styles.statValue}>{prop.bedrooms}</span>
              </div>
            ) : null}
            {prop.bathrooms > 0 ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Banheiros</span>
                <span className={styles.statValue}>{prop.bathrooms}</span>
              </div>
            ) : null}
            {prop.parking > 0 ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Vagas</span>
                <span className={styles.statValue}>{prop.parking}</span>
              </div>
            ) : null}
            {prop.suites > 0 ? (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Suítes</span>
                <span className={styles.statValue}>{prop.suites}</span>
              </div>
            ) : null}
          </div>
          {prop.description ? <p className={styles.propDesc}>{prop.description}</p> : null}
          {multiPhotos && !hideUi ? (
            <p className={styles.photoHint} data-stop-tap>
              {prop.photoUrls.length} fotos — ~{PHOTO_DWELL_MS / 1000}s em cada; em seguida passa ao próximo imóvel. Clique nas
              miniaturas para pular.
            </p>
          ) : null}
          {prop.features.length > 0 ? (
            <div className={styles.features}>
              {prop.features.slice(0, 8).map((f) => (
                <span key={f} className={styles.featureTag}>
                  {f}
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.badgesRowRight}>
            {prop.purpose ? <span className={styles.purposeBadge}>{prop.purpose.toUpperCase()}</span> : null}
            <span className={styles.typeBadge}>{prop.type.toUpperCase()}</span>
          </div>
          {prop.link.startsWith('local://') ? (
            <span className={styles.propLinkLocal}>Cadastro só neste dispositivo — sem página web</span>
          ) : (
            <a className={styles.propLink} href={prop.link} target="_blank" rel="noopener noreferrer" data-stop-tap>
              Ver página do imóvel →
            </a>
          )}
        </div>
        {logoSemSrc ? (
          <div className={styles.panelLogo} aria-hidden>
            <img src={logoSemSrc} alt="" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
