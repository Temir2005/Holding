/** MEGA SMART mark: a 3×3 grid of circles, the top-left one orange (brand of smart-office.kz). */
export function LogoMark() {
  const dots = []
  for (const y of [4, 13, 22])
    for (const x of [4, 13, 22])
      dots.push(
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="3.6"
          fill={x === 4 && y === 4 ? '#F0843E' : '#fff'}
        />,
      )
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true">
      {dots}
    </svg>
  )
}
