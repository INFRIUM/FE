import type { AlertItem } from '../services/alertPresentation'
import { alertDate } from '../services/alertPresentation'
import { formatTime } from '../data/rules'
import { Empty, Icon } from './UI'

export default function AlertFeed({
  items,
  unreadIds = new Set(),
  onOpen,
  compact = false,
}: {
  items: AlertItem[]
  unreadIds?: Set<string>
  onOpen?: (item: AlertItem) => void
  compact?: boolean
}) {
  if (!items.length)
    return (
      <Empty
        title="표시할 알림이 없습니다"
        message="새 알림이 등록되면 여기에 표시됩니다."
        icon="bell"
      />
    )
  return (
    <div className={`alert-feed ${compact ? 'compact' : ''}`}>
      {items.map((item, index) => {
        const group = alertDate(item.timestamp),
          showGroup =
            !compact &&
            (index === 0 || group !== alertDate(items[index - 1].timestamp))
        const unread = unreadIds.has(item.id)
        return (
          <div key={item.id}>
            {showGroup && <h3 className="alert-date-heading">{group}</h3>}
            <a
              className={`alert-feed-item ${unread ? 'unread' : ''}`}
              href={`#${item.href}`}
              onClick={(event) => {
                if (onOpen) {
                  event.preventDefault()
                  onOpen(item)
                }
              }}
            >
              <span
                className={`alert-feed-icon level-${item.level.toLowerCase()}`}
              >
                <Icon name="bell" size={17} />
              </span>
              <div className="alert-feed-copy">
                <div className="alert-feed-title">
                  <strong>{item.title}</strong>
                  {unread && <i aria-label="미확인 알림" />}
                </div>
                <p>{item.message}</p>
                <div className="alert-feed-meta">
                  {item.context && <span>{item.context}</span>}
                  <time dateTime={item.timestamp || undefined}>
                    {item.timestamp
                      ? formatTime(item.timestamp, true)
                      : '시각 미제공'}
                  </time>
                </div>
              </div>
              <span className="alert-feed-arrow">›</span>
            </a>
          </div>
        )
      })}
    </div>
  )
}
