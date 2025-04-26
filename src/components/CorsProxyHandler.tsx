'use client';

import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { useAws } from '@/contexts/AwsContext';

interface CorsProxyHandlerProps {
    onInitialized: () => void;
}

// This component helps with CORS issues for the root S3 endpoint
const CorsProxyHandler: React.FC<CorsProxyHandlerProps> = ({ onInitialized }) => {
    const [initialized, setInitialized] = useState(false);
    const { credentials } = useAws();

    useEffect(() => {
        if (!credentials || initialized) return;

        const setupCorsWorkaround = async () => {
            try {
                console.log('Setting up comprehensive CORS workarounds for AWS SDK...');

                // 1. Apply global AWS configuration for CORS
                AWS.config.update({
                    httpOptions: {
                        timeout: 30000,
                        xhrAsync: true,
                        // The following disables credentials in CORS requests
                        // which prevents preflight issues in some browsers
                        xhrWithCredentials: false,
                    },
                    // A custom user agent can help bypass some CORS restrictions
                    customUserAgent: 'S3BucketManager/1.0'
                });

                // 2. Patch the AWS.HttpClient for better CORS handling
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const awsAny = AWS as any;
                if (awsAny.HttpClient && awsAny.HttpClient.prototype) {
                    const originalHandleRequest = awsAny.HttpClient.prototype.handleRequest;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    awsAny.HttpClient.prototype.handleRequest = function (request: any, options: any, callback: any, errCallback: any) {
                        // Add CORS-friendly headers
                        if (!request.headers['Content-Type']) {
                            request.headers['Content-Type'] = 'application/json';
                        }

                        if (!request.headers['X-Amz-Content-Sha256']) {
                            request.headers['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD';
                        }

                        console.log('AWS request patched for CORS compatibility:', request.operation);

                        // Continue with the original implementation
                        return originalHandleRequest.call(this, request, options, callback, errCallback);
                    };
                }

                // 3. Override S3 listBuckets to handle CORS better
                const originalListBuckets = AWS.S3.prototype.listBuckets;

                AWS.S3.prototype.listBuckets = function () {
                    console.log('Using enhanced CORS-friendly listBuckets implementation');

                    // Create the request using the original method
                    const request = originalListBuckets.call(this);

                    // Add headers that help with CORS
                    request.on('build', function () {
                        // Mark payload as unsigned which helps with some CORS scenarios
                        request.httpRequest.headers['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD';
                        // Use a simple content type to avoid preflight
                        request.httpRequest.headers['Content-Type'] = 'application/json';
                        // Some services work better with this header for CORS
                        request.httpRequest.headers['Accept'] = 'application/json, text/plain, */*';
                    });

                    return request;
                };

                console.log('Comprehensive CORS workarounds applied to AWS S3 SDK');
                setInitialized(true);
                onInitialized();
            } catch (error) {
                console.error('Failed to set up CORS workarounds:', error);
            }
        };

        setupCorsWorkaround();
    }, [credentials, initialized, onInitialized]);

    return null; // This is a utility component, no UI needed
};

export default CorsProxyHandler; 