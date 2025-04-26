'use client';

import React, { useState } from 'react';

interface IAMPolicyHelperProps {
    bucketName?: string;
}

const IAMPolicyHelper: React.FC<IAMPolicyHelperProps> = ({ bucketName = '*' }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Generate policy
    const minimalPolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: [
                    's3:ListAllMyBuckets',
                    's3:GetBucketLocation'
                ],
                Resource: '*'
            },
            {
                Effect: 'Allow',
                Action: [
                    's3:ListBucket',
                    's3:GetBucketCORS',
                    's3:PutBucketCORS',
                    's3:GetBucketLocation'
                ],
                Resource: `arn:aws:s3:::${bucketName}`
            },
            {
                Effect: 'Allow',
                Action: [
                    's3:GetObject',
                    's3:PutObject',
                    's3:DeleteObject'
                ],
                Resource: `arn:aws:s3:::${bucketName}/*`
            }
        ]
    };

    const policyJson = JSON.stringify(minimalPolicy, null, 2);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(policyJson);
            alert('Policy copied to clipboard');
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    return (
        <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold mb-2">IAM Policy Suggestions</h3>

            <p className="text-sm text-gray-600 mb-2">
                If you&apos;re experiencing 403 errors, you might need to update your IAM user&apos;s permissions.
            </p>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-sm text-blue-600 hover:underline mb-2"
            >
                {isOpen ? 'Hide Policy Example' : 'Show Recommended IAM Policy'}
            </button>

            {isOpen && (
                <div className="mt-3">
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono overflow-x-auto">
                        <pre>{policyJson}</pre>
                    </div>

                    <button
                        onClick={copyToClipboard}
                        className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Copy to Clipboard
                    </button>

                    <div className="mt-3 text-xs text-gray-600">
                        <p className="font-medium mb-1">How to use this policy:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Sign in to the AWS Management Console</li>
                            <li>Navigate to IAM (Identity and Access Management)</li>
                            <li>Select your user or create a new one</li>
                            <li>Click &quot;Add Permissions&quot; &gt; &quot;Create inline policy&quot;</li>
                            <li>Select the JSON tab</li>
                            <li>Paste the policy above</li>
                            <li>Customize the bucket name if needed (currently set to: {bucketName === '*' ? 'all buckets' : bucketName})</li>
                            <li>Save the policy with a descriptive name like &quot;S3BucketManagerAccess&quot;</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IAMPolicyHelper; 