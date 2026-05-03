'use client';

import { useState, useEffect } from 'react';

const planTiers: Record<string, number> = {
  free: 0,
  pro: 1,
  family: 2,
  school: 3
};

const featureRequirements: Record<string, string> = {
  'parent_dashboard': 'pro',
  'unlimited_ai': 'pro',
  'pin_lock': 'family',
  'exam_scheduler': 'family',
};

export function useFeatureGate(feature: string, userPlan: string = 'free') {
  const [allowed, setAllowed] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState('');

  useEffect(() => {
    const required = featureRequirements[feature] || 'free';
    const reqLevel = planTiers[required];
    const userLevel = planTiers[userPlan.toLowerCase()] || 0;

    setRequiredPlan(required);
    setAllowed(userLevel >= reqLevel);
  }, [feature, userPlan]);

  return { allowed, requiredPlan };
}
