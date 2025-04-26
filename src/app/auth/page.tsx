'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAws } from '@/contexts/AwsContext';
import AWS from 'aws-sdk';

export default function AuthPage() {
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [region, setRegion] = useState('us-east-1');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [loading, setLoading] = useState(false);

    const { authenticate } = useAws();
    const router = useRouter();

    // Load saved credentials from localStorage on component mount
    useEffect(() => {
        const savedAccessKey = localStorage.getItem('accessKey');
        const savedSecretKey = localStorage.getItem('secretKey');
        const savedRegion = localStorage.getItem('region');
        const savedReadOnly = localStorage.getItem('isReadOnly');

        if (savedAccessKey) setAccessKey(savedAccessKey);
        if (savedSecretKey) setSecretKey(savedSecretKey);
        if (savedRegion) setRegion(savedRegion);
        if (savedReadOnly) setIsReadOnly(savedReadOnly === 'true');
    }, []);

    // Apply CORS configuration to AWS SDK directly
    const setupAwsCorsConfig = () => {
        console.log('Setting up direct CORS configuration for AWS SDK...');

        // Configure AWS with the right CORS settings before authentication
        AWS.config.update({
            httpOptions: {
                xhrAsync: true,
                xhrWithCredentials: false, // Ensures no cookies are sent in CORS requests
                timeout: 60000  // Longer timeout for potentially slow connections
            },
            // The following helps with CORS preflight requests
            customUserAgent: 'Mozilla/5.0 S3BucketManager'
        });

        // Add global handler for AWS HTTP requests
        try {
            // Using type assertion since AWS.util and HttpClient are not directly exposed in TypeScript
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const AWSAny = AWS as any;

            // Register a global event listener if available
            if (AWSAny.events) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                AWSAny.events.on('build', function (req: any) {
                    console.log('Applying CORS-friendly headers to AWS request');
                    // Add CORS friendly headers to all requests
                    if (req.httpRequest && req.httpRequest.headers) {
                        req.httpRequest.headers['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD';
                        req.httpRequest.headers['Content-Type'] = 'application/json';
                    }
                });
            }
        } catch (error) {
            console.warn('Could not attach global event handler:', error);
        }

        // Apply direct patch to the S3 client prototype for listBuckets
        const originalS3 = AWS.S3;

        // This will be called when the S3 client is instantiated
        // @ts-expect-error - We need to monkey patch AWS SDK
        AWS.S3 = function (options) {
            // Create a new S3 instance with modified options to handle CORS better
            const modifiedOptions = {
                ...options,
                s3ForcePathStyle: true,  // Use path style which can be more CORS-friendly
                signatureVersion: 'v4'
            };

            const s3 = new originalS3(modifiedOptions);

            // Save the original listBuckets method
            const originalListBuckets = s3.listBuckets;

            // Replace with our CORS-friendly version
            s3.listBuckets = function () {
                console.log('Using direct CORS-enhanced listBuckets');
                const request = originalListBuckets.call(this);
                console.log('request type:', typeof request, request);

                // Check if request has the 'on' method before trying to use it
                if (request && typeof request.on === 'function') {
                    // Add headers to prevent CORS issues
                    request.on('build', function () {
                        if (request.httpRequest) {
                            request.httpRequest.headers['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD';
                            request.httpRequest.headers['Content-Type'] = 'application/json';
                        }
                    });
                } else if (request && request.httpRequest) {
                    // Direct modification if .on() is not available
                    request.httpRequest.headers['X-Amz-Content-Sha256'] = 'UNSIGNED-PAYLOAD';
                    request.httpRequest.headers['Content-Type'] = 'application/json';
                } else {
                    console.log('Cannot modify request headers - unexpected request format:', request);
                }

                return request;
            };

            return s3;
        };

        // Copy all properties from the original S3 constructor
        Object.keys(originalS3).forEach(key => {
            // Use type assertion to avoid TypeScript errors with indexing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (AWS.S3 as any)[key] = (originalS3 as any)[key];
        });

        console.log('AWS SDK CORS configuration applied');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Setup CORS handling before any AWS calls
            setupAwsCorsConfig();

            // save the credentials to local storage
            localStorage.setItem('accessKey', accessKey);
            localStorage.setItem('secretKey', secretKey);
            localStorage.setItem('region', region);
            localStorage.setItem('isReadOnly', isReadOnly.toString());

            await authenticate(accessKey, secretKey, region, isReadOnly);
            toast.success('Successfully connected to AWS');
            router.push('/buckets');
        } catch (error) {
            console.error('Authentication error:', error);
            toast.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
                <div className="mb-6">
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← Back to Home
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6">Connect to AWS</h1>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="accessKey">
                            Access Key ID
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="accessKey"
                            type="text"
                            value={accessKey}
                            onChange={(e) => setAccessKey(e.target.value)}
                            placeholder="Enter your AWS access key ID"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="secretKey">
                            Secret Access Key
                        </label>
                        <input
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="secretKey"
                            type="password"
                            value={secretKey}
                            onChange={(e) => setSecretKey(e.target.value)}
                            placeholder="Enter your AWS secret access key"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="region">
                            Region
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="region"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                        >
                            <option value="us-east-1">US East (N. Virginia)</option>
                            <option value="us-east-2">US East (Ohio)</option>
                            <option value="us-west-1">US West (N. California)</option>
                            <option value="us-west-2">US West (Oregon)</option>
                            <option value="eu-west-1">EU (Ireland)</option>
                            <option value="eu-central-1">EU (Frankfurt)</option>
                            <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                            <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                            <option value="sa-east-1">South America (São Paulo)</option>
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                checked={isReadOnly}
                                onChange={(e) => setIsReadOnly(e.target.checked)}
                            />
                            <span className="ml-2 text-gray-700 text-sm">Read-only mode (safer)</span>
                        </label>
                    </div>

                    <div className="flex mb-4">
                        <button
                            type="submit"
                            className={`flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''
                                }`}
                            disabled={loading}
                        >
                            {loading ? 'Connecting...' : 'Connect to AWS'}
                        </button>

                        {(accessKey || secretKey) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setAccessKey('');
                                    setSecretKey('');
                                    localStorage.removeItem('accessKey');
                                    localStorage.removeItem('secretKey');
                                    toast.info('Credentials cleared from browser storage');
                                }}
                                className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                </form>

                <div className="mt-6 text-sm text-gray-500">
                    <p>Your AWS credentials are never stored on our servers. All operations are performed directly between your browser and AWS.</p>
                    <p className="mt-2">
                        <strong>Note:</strong> If you encounter CORS errors when using the application, you may need to configure CORS on your buckets. A &quot;Configure CORS&quot; button will be available for each bucket after login.
                    </p>
                </div>
            </div>
        </div>
    );
} 