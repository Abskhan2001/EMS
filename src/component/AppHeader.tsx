
import React from 'react';
import { Clock, BarChart2, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface AppHeaderProps {
  activeTab: string;
  
  onChangeTab: (tab: string) => void;
}

export default function AppHeader({ activeTab, onChangeTab }: AppHeaderProps) {
  return (
    <header className="border-b border-border py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Time Tracker</h1>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant={activeTab === 'tracker' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChangeTab('tracker')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Tracker
          </Button>

          <Button
            variant={activeTab === 'stats' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChangeTab('stats')}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Statistics
          </Button>

          <Button
            variant="ghost"
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
