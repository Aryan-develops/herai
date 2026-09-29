import { BookOpen, Database, Globe, Scale } from 'lucide-react'
import type { SourceType } from '../types'
import { Badge } from './ui/primitives'

const ICONS = { Statute: Scale, Treaty: Globe, Registry: Database, 'Foreign law': BookOpen }

export function SourceTypeBadge({ type }: { type: SourceType }) {
  return (
    <Badge tone={type === 'Registry' ? 'accent' : 'neutral'} icon={ICONS[type]}>
      {type}
    </Badge>
  )
}
