import styles from './AddImovelModal.module.css'
import type { LocalImovelSummary } from '../hooks/useLocalImoveis'

type Props = {
  summaries: LocalImovelSummary[]
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onEdit: (id: string) => Promise<void>
  themeMode?: 'dark' | 'light'
}

export function ManageLocalImoveisModal({ summaries, onClose, onDelete, onEdit, themeMode = 'dark' }: Props) {
  const isLightTheme = themeMode === 'light'

  return (
    <div
      className={`${styles.backdrop} ${isLightTheme ? styles.backdropLight : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-local-title"
      onClick={onClose}
    >
      <div className={`${styles.panel} ${isLightTheme ? styles.panelLight : ''}`} onClick={(e) => e.stopPropagation()} data-stop-tap>
        <h2 id="manage-local-title" className={styles.title}>
          Imóveis salvos neste dispositivo
        </h2>
        <p className={styles.lead}>
          Registros no IndexedDB do navegador. Apagar aqui remove fotos e dados só neste computador ou celular.
        </p>
        {summaries.length === 0 ? (
          <p className={styles.hint}>Nenhum imóvel local cadastrado.</p>
        ) : (
          <ul className={styles.manageList}>
            {summaries.map((s) => (
              <li key={s.id} className={styles.manageRow}>
                <span className={styles.manageTitle}>{s.title}</span>
                <div className={styles.manageActions}>
                  <button type="button" className={styles.ghost} onClick={() => void onEdit(s.id)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.manageDelete}
                    onClick={async () => {
                      if (!window.confirm(`Apagar “${s.title}” deste dispositivo?`)) return
                      await onDelete(s.id)
                    }}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
