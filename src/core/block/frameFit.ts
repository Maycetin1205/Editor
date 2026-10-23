export const SE_FRAME_WIDTH = 1861
export const SE_FRAME_HEIGHT = 886

export const FIT_LEAST = 0.85

export const MASK_ROOT_CLASS = 'ff-root'

export function fitZoom(frame: number, own: number): number {
  if (own <= frame || frame <= 0) return 1
  return Math.max(FIT_LEAST, frame / own)
}
