import React from 'react';
import Card from './Card';
import './StatCard.css';

/**
 * Dashboard metric card (e.g. "Total Students", "Today's Collection").
 *
 * Props:
 * - label: string — metric name
 * - value: string | number — the headline number (caller formats currency/etc.)
 * - icon: optional ReactNode — small icon/emoji shown top-right
 * - tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' (default 'neutral')
 * - subtext: optional string — small helper line under value (e.g. "as of today")
 */
export default function StatCard({
  label,
  value,
  icon = null,
  tone = 'neutral',
  subtext = '',
}) {
  return (
    <Card className={`ui-statcard ui-statcard--${tone}`}>
      <div className="ui-statcard__header">
        <span className="text-label">{label}</span>
        {icon && <span className="ui-statcard__icon">{icon}</span>}
      </div>
      <div className="text-stat ui-statcard__value">{value}</div>
      {subtext && <div className="text-caption">{subtext}</div>}
    </Card>
  );
}