function tagKey(tag) {
  return typeof tag === 'object' ? tag.id : tag
}

function tagName(tag) {
  return typeof tag === 'object' ? tag.name : tag
}

function tagColor(tag) {
  return typeof tag === 'object' ? (tag.color || 'var(--primary)') : 'var(--primary)'
}

/** Colored tag badges for a host. Renders nothing when empty. */
export default function HostTags({ tags, compact = false, className = '' }) {
  if (!tags?.length) return null

  return (
    <div className={`tags-inline ${compact ? 'tags-inline-compact' : ''} ${className}`.trim()}>
      {tags.map((tag) => (
        <span
          key={tagKey(tag)}
          className={`tag-badge ${compact ? 'tag-badge-compact' : ''}`}
          style={{ backgroundColor: tagColor(tag) }}
        >
          {tagName(tag)}
        </span>
      ))}
    </div>
  )
}
