import { useEffect, useMemo, useState } from 'react'
import logoTransparent from './assets/Editedimage_1774739544734-removebg-preview.png'
import { useImoveis } from './hooks/useImoveis'
import { useLocalImoveis } from './hooks/useLocalImoveis'
import { Telao } from './components/Telao'
import styles from './App.module.css'

type ThemeMode = 'dark' | 'light'
const THEME_STORAGE_KEY = 'dalpizzol-theme-mode'

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
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
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
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
