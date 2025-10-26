"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HostChangeNotificationProps {
  isVisible: boolean;
  newHostName: string;
  previousHostName: string;
  onDismiss: () => void;
  autoHideDelay?: number; // in milliseconds
}

export function HostChangeNotification({
  isVisible,
  newHostName,
  previousHostName,
  onDismiss,
  autoHideDelay = 5000
}: HostChangeNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDismiss, 300); // Wait for animation to complete
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, autoHideDelay, onDismiss]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.5 }}
          className="fixed top-4 right-4 z-[100] max-w-sm w-full"
        >
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-lg shadow-lg border border-yellow-400">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Crown className="h-6 w-6 text-yellow-200 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Host Changed</h3>
                  <p className="text-sm text-yellow-100">
                    <span className="font-semibold">{newHostName}</span> is now the host
                  </p>
                  {previousHostName && (
                    <p className="text-xs text-yellow-200 mt-1">
                      Previous host: {previousHostName}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShow(false);
                  setTimeout(onDismiss, 300);
                }}
                className="text-white hover:bg-yellow-600 p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useHostChangeNotification() {
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    newHostName: string;
    previousHostName: string;
  }>({
    isVisible: false,
    newHostName: '',
    previousHostName: ''
  });

  const showHostChange = (newHostName: string, previousHostName: string) => {
    setNotification({
      isVisible: true,
      newHostName,
      previousHostName
    });
  };

  const dismissNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  return {
    notification,
    showHostChange,
    dismissNotification
  };
}
