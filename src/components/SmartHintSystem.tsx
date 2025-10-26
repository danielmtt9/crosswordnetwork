'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SmartHintSystemProps {
  onUseHint: (hintType: 'letter' | 'word' | 'definition') => Promise<void>;
  canUseHint: boolean;
  hintsUsed: number;
  hintLimit: number;
  isPremium: boolean;
}

export function SmartHintSystem({
  onUseHint,
  canUseHint,
  hintsUsed,
  hintLimit,
  isPremium
}: SmartHintSystemProps) {
  const [hintLevel, setHintLevel] = useState<'letter' | 'word' | 'definition'>('letter');
  
  const hintTypes = [
    { 
      level: 'letter', 
      label: 'Letter', 
      desc: 'Reveals one letter',
      cost: 1, 
      icon: '💡' 
    },
    { 
      level: 'word', 
      label: 'Word', 
      desc: 'Reveals entire word',
      cost: 2, 
      icon: '🔤' 
    },
    { 
      level: 'definition', 
      label: 'Clue', 
      desc: 'Extra context',
      cost: 1, 
      icon: '✨' 
    }
  ];
  
  const selectedHint = hintTypes.find(h => h.level === hintLevel);
  
  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardContent className="p-3 space-y-3">
        {/* Header with usage counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold">Smart Hints</span>
          </div>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            {hintsUsed}/{isPremium ? '∞' : hintLimit}
          </Badge>
        </div>
        
        {/* Hint type selector - larger, clearer buttons */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Select Hint Type
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {hintTypes.map(({ level, label, cost, icon }) => (
              <button
                key={level}
                onClick={() => setHintLevel(level as any)}
                className={`p-2.5 rounded-lg border-2 transition-all ${
                  hintLevel === level
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/50 shadow-sm'
                    : 'border-green-200 dark:border-green-800 hover:border-green-300'
                }`}
              >
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-[10px] font-bold leading-tight">{label}</div>
                <div className="text-[9px] text-green-600 font-semibold">{cost} hint{cost > 1 ? 's' : ''}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Selected hint info - prominent display */}
        {selectedHint && (
          <div className="p-2.5 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <div className="text-lg flex-shrink-0">{selectedHint.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-green-700 dark:text-green-300 mb-0.5">
                  {selectedHint.label} Hint
                </div>
                <div className="text-[9px] text-muted-foreground leading-snug">
                  {selectedHint.desc}
                </div>
              </div>
              <div className="text-xs font-bold text-green-600 flex-shrink-0">
                {selectedHint.cost}h
              </div>
            </div>
          </div>
        )}
        
        {/* Use hint button - prominent */}
        <Button
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-xs h-9 font-semibold shadow-sm"
          disabled={!canUseHint}
          onClick={() => onUseHint(hintLevel)}
        >
          <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
          Use {selectedHint?.label} Hint
        </Button>
        
        {/* Hint usage warning */}
        {!isPremium && hintsUsed >= hintLimit - 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[9px] text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200"
          >
            ⚠️ {hintLimit - hintsUsed} hint{hintLimit - hintsUsed !== 1 ? 's' : ''} remaining
          </motion.div>
        )}
        
        {/* Premium upsell */}
        {!isPremium && (
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-center text-muted-foreground pt-1 border-t border-green-200 dark:border-green-800">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="font-medium">Premium: Unlimited hints</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}