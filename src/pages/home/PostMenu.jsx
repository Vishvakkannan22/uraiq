import { BarChart3, BellOff, EyeOff, Flag, Link2, UserMinus } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import Avatar from '../../components/ui/Avatar'

/**
 * Overflow menu for a feed post. Hide and mute are reversible from the
 * snackbar they raise, which is why neither asks for confirmation first.
 * Insights only appear on your own posts.
 */
export default function PostMenu({ post, mine, onClose, desktop, onHide, onMute, onReport, onInsights, onCopyLink }) {
  const act = (fn) => () => {
    fn?.(post)
    onClose()
  }

  return (
    <Sheet open={Boolean(post)} onClose={onClose} desktop={desktop}>
      {post && (
        <>
          <div className="row" style={{ gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
            <Avatar initials={post.initials} gradient={post.gradient} size={40} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 'var(--fs-15)', fontWeight: 660, color: 'var(--text)' }}>
                {post.author}
              </div>
              <div className="truncate" style={{ fontSize: 'var(--fs-12)', color: 'var(--text-4)' }}>@{post.handle}</div>
            </div>
          </div>

          <div className="col" style={{ gap: 'var(--s1)' }}>
            {mine && (
              <button className="popover__item" onClick={act(onInsights)}>
                <BarChart3 size={17} /> View insights
              </button>
            )}
            <button className="popover__item" onClick={act(onCopyLink)}>
              <Link2 size={17} /> Copy link
            </button>
            {!mine && (
              <>
                <button className="popover__item" onClick={act(onHide)}>
                  <EyeOff size={17} /> Hide this post
                </button>
                <button className="popover__item" onClick={act(onMute)}>
                  <BellOff size={17} /> Mute @{post.handle}
                </button>
                <button className="popover__item" onClick={act(onMute)}>
                  <UserMinus size={17} /> Unfollow @{post.handle}
                </button>
                <button className="popover__item popover__item--danger" onClick={act(onReport)}>
                  <Flag size={17} /> Report post
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Sheet>
  )
}
