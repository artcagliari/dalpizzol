import { useId, useState } from 'react'
import { TELAO_DESCRIPTION_MAX_CHARS } from '../constants/telaoDisplay'
import type { AddLocalImovelInput } from '../hooks/useLocalImoveis'
import type { LocalImovelFormData } from '../hooks/useLocalImoveis'
import styles from './AddImovelModal.module.css'

type Props = {
  onClose: () => void
  onSave: (data: AddLocalImovelInput) => Promise<void>
  initialData?: LocalImovelFormData
  mode?: 'create' | 'edit'
}

export function AddImovelModal({ onClose, onSave, initialData, mode = 'create' }: Props) {
  const isEdit = mode === 'edit'
  const formId = useId()
  const fileInputId = `${formId}-file-photos`
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [price, setPrice] = useState(initialData?.price ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [propertyType, setPropertyType] = useState(initialData?.propertyType ?? 'Apartamento')
  const [listingKind, setListingKind] = useState<'aluguel' | 'venda'>(initialData?.listingKind ?? 'venda')
  const [area, setArea] = useState(initialData?.area ?? '')
  const [bedrooms, setBedrooms] = useState(initialData?.bedrooms ?? '')
  const [bathrooms, setBathrooms] = useState(initialData?.bathrooms ?? '')
  const [parking, setParking] = useState(initialData?.parking ?? '')
  const [suites, setSuites] = useState(initialData?.suites ?? '')
  const [featuresText, setFeaturesText] = useState(initialData?.featuresText ?? '')
  const [pageLink, setPageLink] = useState(initialData?.pageLink ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list?.length) return
    const incoming = Array.from(list)
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`))
      const next = [...prev]
      for (const file of incoming) {
        const key = `${file.name}-${file.size}-${file.lastModified}`
        if (seen.has(key)) continue
        seen.add(key)
        next.push(file)
      }
      return next
    })
    e.target.value = ''
  }

  const removeFileAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !price.trim() || !location.trim()) {
      setError('Preencha título, preço e local.')
      return
    }
    if (!isEdit && files.length === 0) {
      setError('Adicione pelo menos uma foto (upload).')
      return
    }
    setSaving(true)
    try {
      await onSave({
        title,
        price,
        location,
        description,
        propertyType,
        listingKind,
        area,
        bedrooms,
        bathrooms,
        parking,
        suites,
        featuresText,
        pageLink,
        files,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} data-stop-tap>
        <h2 id={`${formId}-title`} className={styles.title}>
          {isEdit ? 'Editar imóvel (neste dispositivo)' : 'Novo imóvel (neste dispositivo)'}
        </h2>
        <p className={styles.lead}>
          As fotos e os dados ficam no <strong>IndexedDB</strong> deste navegador — não são enviados ao site nem entram no
          arquivo <code>public/imoveis.json</code>. Útil para incluir anúncios na hora no telão ou notebook do escritório.
        </p>

        <form className={styles.form} onSubmit={submit}>
          <div className={`${styles.field} ${styles.fileField}`}>
            <span className={styles.label}>Fotos *</span>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              multiple
              className={styles.fileInput}
              onChange={onFilesChange}
            />
            <label htmlFor={fileInputId} className={styles.fileBtn}>
              {isEdit ? 'Trocar imagens…' : 'Escolher imagens…'}
            </label>
            <p className={styles.hint}>
              {isEdit
                ? 'Se não selecionar novas imagens, o cadastro mantém as fotos atuais.'
                : 'Dica: selecione varias imagens de uma vez no explorador.'}
            </p>
            {files.length > 0 ? (
              <ul className={styles.fileList}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className={styles.fileRow}>
                    <span className={styles.fileName}>{f.name}</span>
                    <button type="button" className={styles.fileRemove} onClick={() => removeFileAt(i)}>
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>Nenhuma imagem selecionada.</p>
            )}
          </div>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Título *</span>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Apartamento Centro"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Preço *</span>
              <input
                className={styles.input}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="R$ 450.000"
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Local *</span>
            <input
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bento Gonçalves · RS"
              required
            />
          </label>

          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Tipo</span>
              <select
                className={styles.select}
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="Casa">Casa</option>
                <option value="Apartamento">Apartamento</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Finalidade</span>
              <select
                className={styles.select}
                value={listingKind}
                onChange={(e) => setListingKind(e.target.value as 'aluguel' | 'venda')}
              >
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </label>
          </div>

          <div className={styles.grid4}>
            <label className={styles.field}>
              <span className={styles.label}>Área</span>
              <input className={styles.input} value={area} onChange={(e) => setArea(e.target.value)} placeholder="120 m²" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Quartos</span>
              <input className={styles.input} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} inputMode="numeric" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Banheiros</span>
              <input className={styles.input} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} inputMode="numeric" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Vagas</span>
              <input className={styles.input} value={parking} onChange={(e) => setParking(e.target.value)} inputMode="numeric" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Suítes</span>
              <input className={styles.input} value={suites} onChange={(e) => setSuites(e.target.value)} inputMode="numeric" />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Descrição</span>
            <span className={styles.charHint}>Máx. {TELAO_DESCRIPTION_MAX_CHARS} caracteres no telão (texto completo visível de uma vez).</span>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={TELAO_DESCRIPTION_MAX_CHARS}
              placeholder="Texto exibido no painel do telão"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Destaques (tags)</span>
            <textarea
              className={styles.textarea}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={2}
              placeholder="Separar por vírgula ou linha: varanda, lareira, …"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Link da página (opcional)</span>
            <input
              className={styles.input}
              value={pageLink}
              onChange={(e) => setPageLink(e.target.value)}
              placeholder="https://www.dalpizzolimoveis.com.br/…"
              type="text"
              inputMode="url"
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Salvar no dispositivo'}
            </button>
            <button type="button" className={styles.ghost} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
