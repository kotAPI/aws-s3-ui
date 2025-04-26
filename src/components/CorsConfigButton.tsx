'use client';

import React, { useState } from 'react';
import { configureBucketCORS } from '@/services/s3Service';
import { toast } from 'react-toastify';

interface CorsConfigButtonProps {
    bucketName: string;
}

export const CorsConfigButton: React.FC<CorsConfigButtonProps> = ({ bucketName }) => {
    const [isConfiguring, setIsConfiguring] = useState(false);

    const handleConfigureCORS = async () => {
        if (!bucketName) return;

        setIsConfiguring(true);
        try {
            await configureBucketCORS(bucketName);
            toast.success(`CORS configuration applied to ${bucketName}`);
        } catch (error) {
            console.error('Error configuring CORS:', error);
            toast.error(`Failed to configure CORS: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsConfiguring(false);
        }
    };

    return (
        <button
            onClick={handleConfigureCORS}
            disabled={isConfiguring}
            className={`px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors ${isConfiguring ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            title="Configure CORS to allow browser requests"
        >
            {isConfiguring ? 'Configuring...' : 'Configure CORS'}
        </button>
    );
};

export default CorsConfigButton; 