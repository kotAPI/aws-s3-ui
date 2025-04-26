'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAws } from '@/contexts/AwsContext';
import { listBuckets } from '@/services/s3Service';
import CorsConfigButton from '@/components/CorsConfigButton';
import PermissionDiagnostic from '@/components/PermissionDiagnostic';
import { S3 } from 'aws-sdk';

interface Bucket {
    Name: string;
    CreationDate: Date;
}

export default function BucketsPage() {
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showDiagnostic, setShowDiagnostic] = useState<boolean>(false);
    const {
        isAuthenticated,
        logout,
        isReadOnly
    } = useAws();
    const router = useRouter();

    const fetchBuckets = async () => {
        setLoading(true);
        try {
            console.log('Fetching buckets...');
            const bucketList = await listBuckets();
            console.log('Buckets fetched:', bucketList);

            // Filter out any buckets with undefined Name or CreationDate
            const validBuckets = bucketList
                .filter((bucket): bucket is S3.Bucket & { Name: string; CreationDate: Date } =>
                    bucket.Name !== undefined && bucket.CreationDate !== undefined
                )
                .map(bucket => ({
                    Name: bucket.Name,
                    CreationDate: bucket.CreationDate
                }));

            setBuckets(validBuckets);
        } catch (error) {
            console.error('Error fetching buckets:', error);
            toast.error(`Failed to fetch buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Automatically show diagnostic on error
            setShowDiagnostic(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth');
            return;
        }

        // Fetch buckets directly - our new implementation handles CORS internally
        fetchBuckets();
    }, [isAuthenticated, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen p-8">
            <header className="mb-8">
                <div className="flex justify-between items-center">
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← Back to Home
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Logout
                    </button>
                </div>
                <h1 className="text-3xl font-bold mt-4">S3 Buckets</h1>
                <p className="mt-2 text-sm text-gray-600">
                    If you encounter CORS errors, use the &quot;Configure CORS&quot; button on each bucket to allow browser access.
                    <Link href="/README-CORS.md" target="_blank" className="ml-1 text-blue-600 hover:underline">
                        Read our CORS troubleshooting guide for more help.
                    </Link>
                </p>
                <div className="mt-2">
                    <button
                        onClick={() => setShowDiagnostic(!showDiagnostic)}
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {showDiagnostic ? 'Hide Diagnostic Tool' : 'Having issues? Show Diagnostic Tool'}
                    </button>
                </div>

                {showDiagnostic && <PermissionDiagnostic />}
            </header>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-600">Loading buckets...</p>
                </div>
            ) : (
                <>
                    {buckets.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <div className="text-center py-8">
                                <h2 className="text-xl font-semibold mb-2">No Buckets Found</h2>
                                <p className="text-gray-600 mb-4">
                                    You don&apos;t have any S3 buckets in this region or your account doesn&apos;t have permission to list buckets.
                                </p>
                                <div className="mt-4">
                                    <Link
                                        href="/buckets/create"
                                        className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Create Your First Bucket
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {buckets.map((bucket) => (
                                <div key={bucket.Name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                    <h3 className="font-semibold mb-2">{bucket.Name}</h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Created: {new Date(bucket.CreationDate).toLocaleDateString()}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <Link
                                            href={`/buckets/${bucket.Name}`}
                                            className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200"
                                        >
                                            View Details
                                        </Link>
                                        <Link
                                            href={`/buckets/${bucket.Name}/browse`}
                                            className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full hover:bg-green-200"
                                        >
                                            Browse Files
                                        </Link>
                                        {!isReadOnly && (
                                            <CorsConfigButton bucketName={bucket.Name} />
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-dashed border-gray-300">
                                <div className="flex items-center justify-center h-full text-center p-4">
                                    <Link href="/buckets/create" className="text-blue-600 hover:underline">
                                        <div>
                                            <p className="text-gray-700 font-medium">Create New Bucket</p>
                                            <p className="text-gray-500 text-sm mt-1">Click to add a new S3 bucket</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
} 