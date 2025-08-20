import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Mouse, Keyboard, Activity } from 'lucide-react';

interface ActivityStatsProps {
  mouseActivity: number;
  keyboardActivity: number;

  
  isActive: boolean;
  lastActivityTime: Date;
}

export default function ActivityStats({ mouseActivity, keyboardActivity, isActive, lastActivityTime }: ActivityStatsProps) {
  // Calculate activity percentages (normalize to 0-100)
  const maxEvents = 100; // Maximum events per second to consider 100%
  const mousePercentage = Math.min((mouseActivity / maxEvents) * 100, 100);
  const keyboardPercentage = Math.min((keyboardActivity / maxEvents) * 100, 100);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={20} />
          Activity Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mouse size={16} />
                <span className="text-sm">Mouse Activity</span>
              </div>
              <span className="text-sm text-muted-foreground">{mouseActivity} events/s</span>
            </div>
            <Progress value={mousePercentage} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard size={16} />
                <span className="text-sm">Keyboard Activity</span>
              </div>
              <span className="text-sm text-muted-foreground">{keyboardActivity} events/s</span>
            </div>
            <Progress value={keyboardPercentage} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={isActive ? 'text-green-500' : 'text-amber-500'}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            Last activity: {lastActivityTime.toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}