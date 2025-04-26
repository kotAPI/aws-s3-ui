'use client';

import React, { useState } from 'react';
import { checkS3Permissions } from '@/services/s3Service';
import IAMPolicyHelper from './IAMPolicyHelper';

const PermissionDiagnostic: React.FC = () => {
    const [permissions, setPermissions] = useState<{
        hasListBuckets: boolean;
        hasReadObjects: boolean;
        hasWriteObjects: boolean;
        hasCorsConfig: boolean;
    } | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runDiagnostic = async () => {
        setLoading(true);
        setError(null);

        try {
            const perms = await checkS3Permissions();
            setPermissions(perms);
            console.log('Permission diagnostic results:', perms);
        } catch (err) {
            setError(`Failed to check permissions: ${err instanceof Error ? err.message : 'Unknown error'}`);
            console.error('Permission diagnostic error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
            <h3 className="font-semibold mb-2">AWS Permissions Diagnostic</h3>

            <p className="text-sm text-gray-600 mb-4">
                If you&apos;re experiencing CORS or permission errors, run this diagnostic to check your AWS credentials.
            </p>

            <button
                onClick={runDiagnostic}
                disabled={loading}
                className={`px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
            >
                {loading ? 'Checking...' : 'Check Permissions'}
            </button>

            {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                </div>
            )}

            {permissions && (
                <div className="mt-4">
                    <h4 className="font-medium mb-2 text-sm">Results:</h4>
                    <ul className="text-sm space-y-1">
                        <li className="flex items-center">
                            <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full mr-2 ${permissions.hasListBuckets ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {permissions.hasListBuckets ? '✓' : '✗'}
                            </span>
                            List Buckets Permission
                        </li>
                        <li className="flex items-center">
                            <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full mr-2 ${permissions.hasReadObjects ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {permissions.hasReadObjects ? '✓' : '✗'}
                            </span>
                            Read Objects Permission
                        </li>
                        <li className="flex items-center">
                            <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full mr-2 ${permissions.hasCorsConfig ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {permissions.hasCorsConfig ? '✓' : '✗'}
                            </span>
                            Configure CORS Permission
                        </li>
                    </ul>

                    {!permissions.hasCorsConfig && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <p className="font-medium text-yellow-800">Missing CORS Configuration Permission</p>
                            <p className="mt-1 text-yellow-700">
                                Your AWS user needs the <code className="bg-yellow-100 px-1 rounded">s3:PutBucketCors</code> permission to configure CORS.
                                Please update your IAM policy to include this permission.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {(error || (permissions && (!permissions.hasCorsConfig || !permissions.hasReadObjects))) && (
                <IAMPolicyHelper />
            )}
        </div>
    );
};

export default PermissionDiagnostic; 