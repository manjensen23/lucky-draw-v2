'use client';

import { useEffect, useState } from 'react';
import { Participant } from '@/types';

interface DrawAnimationProps {
  isDrawing: boolean;
  participants: Participant[];
  speed: number;
}

export default function DrawAnimation({ isDrawing, participants, speed }: DrawAnimationProps) {
  const [currentDisplay, setCurrentDisplay] = useState<string>('???');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isDrawing && participants.length > 0) {
      interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * participants.length);
        setCurrentDisplay(participants[randomIndex].name);
      }, speed);
    } else if (!isDrawing && participants.length === 0) {
      setCurrentDisplay('TIDAK ADA PARTISIPAN');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDrawing, participants, speed]);

  return (
    <div className="flex items-center justify-center w-full h-full text-center">
      <div className={`text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tight text-white/90 break-words w-full px-4 ${isDrawing ? 'scale-110 blur-[10px] opacity-100' : 'scale-100 blur-[16px] opacity-0'} transition-all duration-75`}>
        {currentDisplay}
      </div>
    </div>
  );
}
