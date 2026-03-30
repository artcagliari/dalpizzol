import type { Imovel } from '../types/imovel'

export function getGalleryImages(imovel: Imovel): string[] {
  if (imovel.images && imovel.images.length > 0) return imovel.images
  return [imovel.img]
}

/** Todas as fotos do imóvel: capa `img` primeiro, depois `images` (sem duplicar URLs). */
export function getUniquePhotoUrls(imovel: Imovel): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (u: string | undefined) => {
    const t = u?.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  push(imovel.img)
  for (const u of imovel.images ?? []) push(u)
  return out
}

/** Três URLs para o mosaico (esquerda alta + duas à direita). */
export function getMosaicImages(imovel: Imovel): [string, string, string] {
  const all = getGalleryImages(imovel)
  const base = imovel.img

  if (all.length >= 4) {
    return [all[1], all[2], all[3]]
  }
  if (all.length === 3) {
    return [all[1], all[2], all[0]]
  }
  if (all.length === 2) {
    return [all[1], all[0], all[1]]
  }
  return [base, base, base]
}

export function defaultOverlayCaption(imovel: Imovel): string {
  if (imovel.overlayCaption) return imovel.overlayCaption
  return imovel.title
}
