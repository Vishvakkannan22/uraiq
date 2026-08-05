export function Sk({ w, h = 12, r = 'var(--r-sm)', style }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

export function SkeletonRow() {
  return (
    <div className="row" style={{ gap: 'var(--s3)', padding: 'var(--s3)' }}>
      <Sk w={46} h={46} r="var(--r-full)" />
      <div className="col grow" style={{ gap: 8 }}>
        <Sk w="42%" h={11} />
        <Sk w="78%" h={10} />
      </div>
      <Sk w={26} h={10} />
    </div>
  )
}

export function SkeletonBubble({ side = 'in' }) {
  const out = side === 'out'
  return (
    <div style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start' }}>
      <Sk w={out ? '44%' : '58%'} h={out ? 38 : 52} r="var(--r-lg)" />
    </div>
  )
}

export function SkeletonTile({ ratio = '1 / 1' }) {
  return <div className="sk" style={{ aspectRatio: ratio, borderRadius: 'var(--r-md)' }} />
}
