/**
 * IP / CIDR values — always LTR + monospace (Arabic UI safe).
 */
function IpAddress({ children, className = '', as: Tag = 'span', ...props }) {
  if (children == null || children === '') return null
  const classes = ['ip-address', className].filter(Boolean).join(' ')
  return (
    <Tag className={classes} dir="ltr" {...props}>
      {children}
    </Tag>
  )
}

export default IpAddress
