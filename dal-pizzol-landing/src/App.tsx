import { useMemo } from 'react'
import logoTransparent from './assets/Editedimage_1774739544734-removebg-preview.png'
import { useImoveis } from './hooks/useImoveis'
import { useLocalImoveis } from './hooks/useLocalImoveis'
import { Telao } from './components/Telao'
import styles from './App.module.css'

/**
 * Telão: `public/imoveis.json` + imóveis criados no aparelho (IndexedDB).
 */
function App() {
  const { imoveis, loadStatus } = useImoveis()
  const { localImoveis, localSummaries, addLocalImovel, updateLocalImovel, getLocalImovelForEdit, deleteLocalImovel } =
    useLocalImoveis()

  const mergedImoveis = useMemo(() => [...imoveis, ...localImoveis], [imoveis, localImoveis])

  return (
    <div className={styles.viewport}>
      <div className={styles.portraitStage}>
        <Telao
          imoveis={mergedImoveis}
          loadStatus={loadStatus}
          logoSrc={logoTransparent}
          topbarLogoSrc={logoTransparent}
          logoSemSrc={logoTransparent}
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
