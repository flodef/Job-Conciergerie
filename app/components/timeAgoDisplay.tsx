'use client';

import { getTimeDifference } from '@/app/utils/date';
import { useEffect, useState } from 'react';

interface TimeAgoDisplayProps {
  lastFetchTime: number | undefined;
}

export function TimeAgoDisplay({ lastFetchTime }: TimeAgoDisplayProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!lastFetchTime) return null;

  return <>{getTimeDifference(new Date(lastFetchTime), currentTime)}</>;
}
