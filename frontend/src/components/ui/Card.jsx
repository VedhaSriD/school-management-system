import React from 'react';
import './Card.css';

/**
 * Generic glass-style card container.
 * Subtle translucency only — never sacrifices text readability.
 *
 * Props:
 * - children: content
 * - elevated: boolean — stronger shadow + opacity for emphasis (e.g. login card)
 * - padded: boolean — apply default internal padding (default true)
 * - className: optional extra classes
 * - as: optional element/tag override (default 'div')
 */
export default function Card({
  children,
  elevated = false,
  padded = true,
  className = '',
  as: Tag = 'div',
  ...rest
}) {
  const classes = [
    'ui-card',
    elevated ? 'ui-card--elevated' : '',
    padded ? 'ui-card--padded' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}