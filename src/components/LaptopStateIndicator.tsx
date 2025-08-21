import React from 'react';
import { Monitor, Moon, Power } from 'lucide-react';
import type { LaptopState } from '../services/laptopStateMonitor';

interface LaptopStateIndicatorProps {
  state: LaptopState;
  timestamp?: string;
  batteryLevel?: number;
  isCharging?: boolean;
  onClick?: () => void;
  className?: string;
  showDetails?: boolean;
}

const LaptopStateIndicator: React.FC<LaptopStateIndicatorProps> = ({
  state,
  timestamp,
  batteryLevel,
  isCharging,
  onClick,
  className = '',
  showDetails = false,
}) => {
  const getStateConfig = (state: LaptopState) => {
    switch (state) {
      case 'On':
        return {
          icon: Monitor,
          label: 'Online',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          dotColor: 'bg-green-500',
        };
      case 'Sleep':
        return {
          icon: Moon,
          label: 'Away',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          dotColor: 'bg-yellow-500',
        };
      case 'Off':
        return {
          icon: Power,
          label: 'Offline',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          dotColor: 'bg-red-500',
        };
      default:
        return {
          icon: Monitor,
          label: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          dotColor: 'bg-gray-500',
        };
    }
  };

  const config = getStateConfig(state);
  const Icon = config.icon;

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getDetailedTooltip = () => {
    const batteryInfo = batteryLevel !== undefined ?
      `Battery: ${batteryLevel}%${isCharging ? ' (Charging)' : ''}` : '';

    const parts = [
      `Current Status: ${config.label}`,
      batteryInfo,
      'Live monitoring active'
    ].filter(Boolean);

    return parts.join(' • ');
  };

  const getBatteryIcon = (level?: number, charging?: boolean) => {
    if (level === undefined) return null;

    let batteryClass = 'text-gray-500';
    if (charging) {
      batteryClass = 'text-green-600';
    } else if (level <= 20) {
      batteryClass = 'text-red-600';
    } else if (level <= 50) {
      batteryClass = 'text-yellow-600';
    } else {
      batteryClass = 'text-green-600';
    }

    return (
      <span className={`text-xs ${batteryClass} ml-1`}>
        {charging ? '⚡' : '🔋'} {level}%
      </span>
    );
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        onClick={onClick}
        className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
          transition-all duration-200 border
        `}
        title={getDetailedTooltip()}
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full ${config.dotColor} mr-1.5`} />

        {/* Icon */}
        <Icon className="w-3 h-3 mr-1" />

        {/* State label */}
        <span>{config.label}</span>

        {/* Battery indicator */}
        {showDetails && getBatteryIcon(batteryLevel, isCharging)}
      </button>

      {/* Show current battery info if showDetails is true */}
      {showDetails && batteryLevel !== undefined && (
        <div className="ml-2 text-xs text-gray-500">
          {batteryLevel}%{isCharging ? ' ⚡' : ''}
        </div>
      )}
    </div>
  );
};

export default LaptopStateIndicator;