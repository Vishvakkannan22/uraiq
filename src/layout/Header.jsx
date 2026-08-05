export default function Header({ title, subtitle, leading, actions, children, style, className = '', scrolled = false }) {
  return (
    <header
      className={['header', scrolled && 'header--scrolled', className].filter(Boolean).join(' ')}
      style={style}
    >
      {leading}
      {(title || subtitle) && (
        <div className="grow" style={{ minWidth: 0 }}>
          {title && (
            <div className="header__title truncate" style={subtitle ? { fontSize: 'var(--fs-15)', letterSpacing: '-0.015em' } : undefined}>
              {title}
            </div>
          )}
          {subtitle && <div className="header__sub truncate">{subtitle}</div>}
        </div>
      )}
      {children}
      {actions && <div className="header__actions">{actions}</div>}
    </header>
  )
}
