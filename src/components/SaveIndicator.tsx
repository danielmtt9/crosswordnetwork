"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  error?: string | null;
}

export function SaveIndicator({ status, lastSaved, error }: SaveIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: "Saving...",
          color: "text-blue-500",
        };
      case 'saved':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Saved",
          color: "text-green-500",
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: "Save failed",
          color: "text-red-500",
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          text: "Auto-save enabled",
          color: "text-muted-foreground",
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <motion.div
      className={`flex items-center gap-2 text-sm ${statusInfo.color}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {statusInfo.icon}
      <span>{statusInfo.text}</span>
      {lastSaved && status === 'saved' && (
        <span className="text-xs text-muted-foreground">
          at {lastSaved.toLocaleTimeString()}
        </span>
      )}
      {error && status === 'error' && (
        <span className="text-xs text-red-400">
          {error}
        </span>
      )}
    </motion.div>
  );
}
