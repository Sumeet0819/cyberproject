'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { checkAuth } from '@/store/features/authSlice';
import { AppDispatch } from '@/store/store';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      dispatch(checkAuth());
    }
  }, [dispatch]);

  return <>{children}</>;
}
