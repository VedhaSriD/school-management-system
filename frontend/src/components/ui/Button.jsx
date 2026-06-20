import React from 'react';
import './Button.css';

/**
 * Generic button. Does not contain any business logic —
 * caller passes onClick / type / disabled as needed.
 *
 * Props:
 * - children: label content
 * - variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' (default 'secondary')
 * - size: 'sm' | 'md' | 'lg' (default 'md')
 * - fullWidth: boolean
 * - disabled, type, onClick: standard button props passed through
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    fullWidth ? 'ui-btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}