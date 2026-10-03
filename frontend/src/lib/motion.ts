/** Stagger step for items in a row or grid (80 ms per item, capped). */
export const stagger = (index: number) => Math.min(index, 6) * 0.08
