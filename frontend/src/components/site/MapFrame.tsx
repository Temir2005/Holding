import type { CSSProperties, ReactNode } from 'react'
import type { Media } from '@/api/types'
import { cn } from '@/lib/cn'
import { type Bounds, aspectOf, projector } from '@/lib/geo'

/**
 * A map image from the CMS with an SVG layer on top in the same coordinates. The box keeps the
 * image's aspect, so a point given in degrees lands exactly on the map.
 */
export function MapFrame({
  map,
  bounds,
  attribution,
  className,
  label,
  children,
}: {
  map: Media | null | undefined
  bounds: Bounds
  attribution?: string
  className?: string
  label: string
  children: (at: (lat: number, lon: number) => readonly [number, number]) => ReactNode
}) {
  const p = projector(bounds)
  return (
    <div className={cn('map', className)} style={{ '--ar': aspectOf(bounds) } as CSSProperties}>
      {map && (
        <img
          className="map__img"
          src={map.url}
          alt=""
          width={map.width}
          height={map.height}
          loading="lazy"
          style={{ width: '100%', height: '100%' }}
        />
      )}
      <svg viewBox={`0 0 ${p.width} ${p.height}`} role="img" aria-label={label}>
        {children(p.at)}
      </svg>
      {attribution && <span className="map__attr">{attribution}</span>}
    </div>
  )
}
