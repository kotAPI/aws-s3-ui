'use client';

import React from 'react';
import { useAws } from '@/contexts/AwsContext';
import CorsProxyHandler from './CorsProxyHandler';

// This is a client component wrapper for handling CORS
export default function CorsHandlerClient({ children }: { children: React.ReactNode }) {
    const { setCorsHandlerInitialized, isAuthenticated } = useAws();

    return (
        <>
            {isAuthenticated && <CorsProxyHandler onInitialized={() => setCorsHandlerInitialized(true)} />}
            {children}
        </>
    );
} 