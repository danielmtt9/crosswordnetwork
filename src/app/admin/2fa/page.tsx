import React from 'react';
import { TwoFactorAuth } from '@/components/admin/TwoFactorAuth';

export default function TwoFactorAuthPage() {
  return (
    <div className="container mx-auto py-6">
      <TwoFactorAuth userId="current-user" />
    </div>
  );
}
