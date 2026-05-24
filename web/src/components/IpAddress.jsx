/**
 * IP / CIDR values — digits read LTR; wrapper follows page direction (RTL/LTR).
 */
function IpAddress({ children, className = '', as: Tag = 'span', style, ...props }) {
  if (children == null || children === '') return null

  const ipSpan = (
    <span className={['ip-address', className].filter(Boolean).join(' ')} dir="ltr" translate="no">
      {children}
    </span>
  )

  if (Tag === 'span') {
    return ipSpan
  }

  return (
    <Tag className="ip-line" style={{ textAlign: 'start', margin: 0, ...style }} {...props}>
      {ipSpan}
    </Tag>
  )
}

export default IpAddress
