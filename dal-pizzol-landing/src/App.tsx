import { useEffect, useMemo, useState } from 'react'
import logoTransparent from './assets/Editedimage_1774739544734-removebg-preview.png'
import { useImoveis } from './hooks/useImoveis'
import { useLocalImoveis } from './hooks/useLocalImoveis'
import { Telao } from './components/Telao'
import styles from './App.module.css'

type ThemeMode = 'dark' | 'light'
const THEME_STORAGE_KEY = 'dalpizzol-theme-mode'
const THEME_COOKIE_KEY = 'dalpizzol-theme-mode'
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'light' || normalized === 'white' || normalized === 'branco') return 'light'
  if (normalized === 'dark' || normalized === 'escuro') return 'dark'
  return null
}

function getThemeModeFromUrl(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const fromTheme = parseThemeMode(params.get('theme'))
  if (fromTheme) return fromTheme
  return parseThemeMode(params.get('modo'))
}

function getThemeModeFromCookie(): ThemeMode | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${THEME_COOKIE_KEY}=`))
  if (!match) return null
  const value = decodeURIComponent(match.split('=').slice(1).join('='))
  return parseThemeMode(value)
}

function persistThemeMode(mode: ThemeMode) {
  if (typeof document !== 'undefined') {
    document.cookie = `${THEME_COOKIE_KEY}=${encodeURIComponent(mode)}; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
  }
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Alguns navegadores de TV bloqueiam localStorage; cookie já cobre fallback.
  }
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const fromUrl = getThemeModeFromUrl()
  if (fromUrl) return fromUrl
  try {
    const fromStorage = parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
    if (fromStorage) return fromStorage
  } catch {
    // Ignora e segue para cookie/fallback.
  }
  const fromCookie = getThemeModeFromCookie()
  if (fromCookie) return fromCookie
  return 'dark'
}

/**
 * Telão: `public/imoveis.json` + imóveis criados no aparelho (IndexedDB).
 */
function App() {
  const { imoveis, loadStatus } = useImoveis()
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)
  const { localImoveis, localSummaries, addLocalImovel, updateLocalImovel, getLocalImovelForEdit, deleteLocalImovel } =
    useLocalImoveis()

  const mergedImoveis = useMemo(() => [...imoveis, ...localImoveis], [imoveis, localImoveis])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    persistThemeMode(themeMode)
  }, [themeMode])

  return (
    <div className={`${styles.viewport} ${themeMode === 'light' ? styles.viewportLight : ''}`}>
      <div className={`${styles.portraitStage} ${themeMode === 'light' ? styles.portraitStageLight : ''}`}>
        <Telao
          imoveis={mergedImoveis}
          loadStatus={loadStatus}
          logoSrc={logoTransparent}
          topbarLogoSrc={logoTransparent}
          logoSemSrc={logoTransparent}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onAddLocalImovel={addLocalImovel}
          onUpdateLocalImovel={updateLocalImovel}
          onGetLocalImovelForEdit={getLocalImovelForEdit}
          onDeleteLocalImovel={deleteLocalImovel}
          localSummaries={localSummaries}
        />
      </div>
    </div>
  )
}

export default App
