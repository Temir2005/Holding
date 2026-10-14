/** Registers every editor. To add one, see the note in ../registry.ts. */
import { registerWidget } from '../registry'
import { ArrayField } from './ArrayField'
import { BooleanField, NumberField, StringField } from './BasicFields'
import { EnumField, EnumListField, OptionsField } from './ChoiceFields'
import { ColorField } from './ColorField'
import { IconField } from './IconField'
import { JsonField } from './JsonField'
import { LinkField } from './LinkField'
import { LocalizedField } from './LocalizedField'
import { ObjectField } from './ObjectField'
import { PageField } from './PageField'
import { RefField } from './RefField'
import { ComboboxField, TagsField } from './TextListFields'

registerWidget('localized', LocalizedField)
registerWidget('string', StringField)
registerWidget('number', NumberField)
registerWidget('boolean', BooleanField)
registerWidget('enum', EnumField)
registerWidget('enum-list', EnumListField)
registerWidget('options', OptionsField)
registerWidget('combobox', ComboboxField)
registerWidget('tags', TagsField)
registerWidget('icon', IconField)
registerWidget('link', LinkField)
registerWidget('page', PageField)
registerWidget('color', ColorField)
registerWidget('object', ObjectField)
registerWidget('array', ArrayField)
registerWidget('ref', RefField)
registerWidget('json', JsonField)
