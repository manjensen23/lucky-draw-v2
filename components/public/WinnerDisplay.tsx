'use client';

import { Winner } from '@/types';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface WinnerDisplayProps {
  winners: Winner[];
  showGroup: boolean;
  onVoidWinner?: (winnerId: number) => Promise<void>;
}

export default function WinnerDisplay({ winners, showGroup, onVoidWinner }: WinnerDisplayProps) {
  const [show, setShow] = useState(false);
  const [voidingIds, setVoidingIds] = useState<number[]>([]);
  const [voidedIds, setVoidedIds] = useState<number[]>([]);
  const { width, height } = useWindowSize(); // for full screen confetti

  const handleVoid = async (id: number) => {
    if (!onVoidWinner) return;
    if (!confirm('Apakah Yakin ingin hanguskan peserta ini? Peserta akan ditandai HANGUS dan stok hadiah dikembalikan.')) return;

    setVoidingIds(prev => [...prev, id]);
    try {
      await onVoidWinner(id);
      setVoidedIds(prev => [...prev, id]);
    } catch (err: any) {
      alert("Gagal hanguskan peserta: " + err.message);
    } finally {
      setVoidingIds(prev => prev.filter(x => x !== id));
    }
  };

  useEffect(() => {
    // Slight delay for animation effect
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (winners.length === 0) {
    return (
      <div className="text-4xl text-gray-400 font-bold">
        NO WINNER SELECTED
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center w-full transition-all duration-1000 transform ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
      {/* Confetti Effect directly layered on top */}
      {show && (
        <Confetti
          width={width}
          height={height}
          colors={['#fbbf24', '#f59e0b', '#d97706', '#fcd34d']}
          recycle={false}
          numberOfPieces={400}
          gravity={0.1}
          initialVelocityY={20}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, pointerEvents: 'none' }}
        />
      )}

      <h2 className="text-2xl text-gold-500 font-bold mb-8 uppercase tracking-[0.2em] animate-pulse z-10">
        {winners.length > 1 ? '🎉 Congratulations Winners! 🎉' : '🎉 Congratulations! 🎉'}
      </h2>

      <div className={`flex justify-center flex-wrap items-stretch w-full z-10 ${winners.length > 2 ? 'flex-row gap-3 md:gap-4' : 'flex-col gap-6'}`}>
        {winners.map((winner, idx) => {
          const isVoided = Boolean(winner.id && voidedIds.includes(winner.id));
          const isVoiding = Boolean(winner.id && voidingIds.includes(winner.id));

          const textClass = winners.length > 12 ? 'text-xl md:text-2xl lg:text-3xl' :
            winners.length > 6 ? 'text-2xl md:text-3xl lg:text-4xl' :
              winners.length > 2 ? 'text-3xl md:text-4xl lg:text-5xl' :
                'text-5xl md:text-7xl lg:text-8xl';

          const groupClass = winners.length > 12 ? 'text-sm md:text-base mt-1' :
            winners.length > 6 ? 'text-base md:text-lg mt-1' :
              winners.length > 2 ? 'text-lg md:text-xl mt-2' :
                'text-2xl mt-2';

          const paddingClass = winners.length > 6 ? 'px-4 py-3 rounded-2xl border' : 'px-8 py-4 rounded-3xl border-2';
          const badgeClass = winners.length > 6 ? 'text-2xl md:text-3xl px-3 py-1 border-4 rounded-xl shadow-lg' : 'text-5xl md:text-7xl lg:text-8xl px-6 py-2 border-8 rounded-3xl shadow-2xl';

          const containerWidthClass = winners.length > 12 ? 'w-[45%] sm:w-[30%] md:w-[22%] lg:w-[15%]' :
            winners.length > 6 ? 'w-[45%] sm:w-[45%] md:w-[30%] lg:w-[23%]' :
              winners.length > 2 ? 'w-[80%] sm:w-[45%] md:w-[30%]' :
                'w-full max-w-[90%]';

          return (
            <div
              key={idx}
              className={`relative ${textClass} ${containerWidthClass} ${paddingClass} font-black shadow-[0_0_60px_rgba(251,191,36,0.3)] text-center break-words backdrop-blur-md transition-all flex flex-col justify-center items-center ${isVoided ? 'bg-gray-900/90 text-gray-500 border-gray-700 shadow-none' : 'bg-white/10 text-white border-gold-400/50'
                }`}
              style={{
                animation: `slideUp 0.5s ease-out ${idx * 0.15}s both`
              }}
            >
              {isVoided && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <span className={`text-red-500 font-black rotate-[-10deg] uppercase bg-black/60 backdrop-blur-sm tracking-widest ${badgeClass}`}>HANGUS</span>
                </div>
              )}

              <div className={`w-full ${isVoided ? 'opacity-30' : ''}`}>
                <div className="break-words leading-tight">{winner.name}</div>
                {showGroup && winner.group && (
                  <span className={`block text-gold-400 font-medium ${groupClass} break-words mt-1`}>
                    {winner.group}
                  </span>
                )}
              </div>

              {!isVoided && winner.id !== undefined && onVoidWinner !== undefined ? (
                <button
                  onClick={() => handleVoid(winner.id!)}
                  disabled={isVoiding}
                  className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold px-3 py-1 md:px-4 md:py-2 rounded-2xl shadow-xl border-2 border-red-400 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 z-30"
                >
                  {isVoiding ? '...' : 'Hangus'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
