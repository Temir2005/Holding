import type { WidgetProps } from '../registry'
import { EntityRefField } from './EntityRefField'
import { MediaRefField } from './MediaRefField'

/** `x-ref`: files go to the media library picker, other objects to the lookup picker. */
export function RefField(props: WidgetProps) {
  return props.node.schema['x-ref']?.kind === 'media' ? (
    <MediaRefField {...props} />
  ) : (
    <EntityRefField {...props} />
  )
}
