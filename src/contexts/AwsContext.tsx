'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { initializeS3 } from '@/services/s3Service';
import { toast } from 'react-toastify';
import AWS from 'aws-sdk';

interface AwsCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
}

interface AwsContextType {
    credentials: AwsCredentials | null;
    region: string;
    isReadOnly: boolean;
    isAuthenticated: boolean;
    corsConfigured: boolean;
    corsHandlerInitialized: boolean;
    setCorsConfigured: (value: boolean) => void;
    setCorsHandlerInitialized: (value: boolean) => void;
    authenticate: (accessKeyId: string, secretAccessKey: string, region: string, readOnly?: boolean) => Promise<boolean>;
    logout: () => void;
}

const AwsContext = createContext<AwsContextType | undefined>(undefined);

export const useAws = (): AwsContextType => {
    const context = useContext(AwsContext);
    if (context === undefined) {
        throw new Error('useAws must be used within an AwsProvider');
    }
    return context;
};

export const AwsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [credentials, setCredentials] = useState<AwsCredentials | null>(null);
    const [region, setRegion] = useState<string>('us-east-1');
    const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [corsConfigured, setCorsConfigured] = useState<boolean>(false);
    const [corsHandlerInitialized, setCorsHandlerInitialized] = useState<boolean>(false);

    // Check for existing credentials in localStorage on mount
    useEffect(() => {
        const savedCredentials = localStorage.getItem('aws_credentials');
        const savedReadOnly = localStorage.getItem('aws_readonly');
        const savedCorsStatus = localStorage.getItem('aws_cors_configured');

        if (savedCredentials) {
            try {
                const parsedCredentials = JSON.parse(savedCredentials);
                setCredentials(parsedCredentials);
                setRegion(parsedCredentials.region);
                setIsReadOnly(savedReadOnly === 'true');
                setCorsConfigured(savedCorsStatus === 'true');
                setIsAuthenticated(true);

                // Initialize AWS SDK with saved credentials
                initializeS3(parsedCredentials);
            } catch (error) {
                console.error('Failed to parse saved credentials', error);
                localStorage.removeItem('aws_credentials');
                localStorage.removeItem('aws_readonly');
                localStorage.removeItem('aws_cors_configured');
            }
        }
    }, []);

    const authenticate = async (
        accessKeyId: string,
        secretAccessKey: string,
        selectedRegion: string,
        readOnly = false
    ): Promise<boolean> => {
        const awsCredentials: AwsCredentials = {
            accessKeyId,
            secretAccessKey,
            region: selectedRegion
        };

        try {
            console.log('Attempting to authenticate with AWS...');

            // Configure global AWS settings for better CORS handling
            AWS.config.update({
                region: selectedRegion,
                httpOptions: {
                    timeout: 30000,
                    xhrAsync: true,
                }
            });

            // Try to list buckets to verify credentials
            await initializeS3(awsCredentials);

            // If successful, save credentials
            setCredentials(awsCredentials);
            setRegion(selectedRegion);
            setIsReadOnly(readOnly);
            setIsAuthenticated(true);

            // Save to localStorage (be careful with this in production)
            localStorage.setItem('aws_credentials', JSON.stringify(awsCredentials));
            localStorage.setItem('aws_readonly', String(readOnly));

            // Show CORS configuration warning
            setTimeout(() => {
                toast.info(
                    'If you encounter CORS errors, you may need to configure CORS on your S3 buckets. Use the "Configure CORS" button on each bucket.',
                    { autoClose: 10000 }
                );
            }, 1000);

            return true;
        } catch (error) {
            console.error('AWS authentication failed', error);

            // Provide more helpful error for CORS issues
            if (error instanceof Error &&
                (error.message.includes('CORS') ||
                    error.message.includes('NetworkError') ||
                    error.message.includes('Failed to fetch'))) {
                throw new Error(`CORS error: Your browser is blocking cross-origin requests to AWS. Try using Chrome or Firefox.`);
            }

            throw error;
        }
    };

    const logout = (): void => {
        setCredentials(null);
        setIsAuthenticated(false);
        setCorsConfigured(false);
        setCorsHandlerInitialized(false);
        localStorage.removeItem('aws_credentials');
        localStorage.removeItem('aws_readonly');
        localStorage.removeItem('aws_cors_configured');
    };

    const value: AwsContextType = {
        credentials,
        region,
        isReadOnly,
        isAuthenticated,
        corsConfigured,
        corsHandlerInitialized,
        setCorsConfigured,
        setCorsHandlerInitialized,
        authenticate,
        logout,
    };

    return <AwsContext.Provider value={value}>{children}</AwsContext.Provider>;
}; 