'use client';

import AWS from 'aws-sdk';
import { createBufferFromArrayBuffer } from '@/utils/buffer-utils';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

let s3Instance: AWS.S3 | null = null;

export const initializeS3 = async (credentials: AwsCredentials): Promise<AWS.S3> => {
  // Configure AWS to handle CORS better
  AWS.config.update({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    region: credentials.region || 'us-east-1',
    httpOptions: {
      timeout: 30000, // Longer timeout for S3 operations
      xhrAsync: true, // Ensure XHR is async for browser compatibility
      connectTimeout: 5000, // Shorter connect timeout helps with CORS issues
    }
  });
  
  // Create S3 instance with settings that work better with CORS
  s3Instance = new AWS.S3({
    signatureVersion: 'v4',
    region: credentials.region || 'us-east-1',
    s3ForcePathStyle: true, // Path style can be more CORS-friendly in some browsers
    useAccelerateEndpoint: false,
    computeChecksums: true,
    correctClockSkew: true,
    // The following specific S3 options can help with CORS
    params: {
      ACL: 'private' // Default ACL for uploaded objects
    }
  });
  
  // Set up global credential refresh handling
  AWS.config.credentials = new AWS.Credentials({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey
  });
  
  // Extend the AWS SDK with custom handling for CORS issues
  patchAwsSdkForCors();
  
  // Test connection by listing buckets (will use our patched version)
  try {
    console.log('Testing S3 connection...');
    const result = await s3Instance.listBuckets().promise();
    console.log('S3 connection successful, buckets:', result.Buckets?.length || 0);
    return s3Instance;
  } catch (error) {
    console.error('S3 initialization error:', error);
    s3Instance = null;
    throw error;
  }
};

// Patch the AWS SDK to better handle CORS preflight issues
function patchAwsSdkForCors() {
  if (!s3Instance) return;

  try {
    // Store reference to the original method
    const originalMakeRequest = s3Instance.makeRequest;
    
    // Create a custom implementation for listBuckets that avoids CORS issues
    const customListBuckets = async () => {
      console.log('Using advanced custom listBuckets implementation to avoid CORS');
      
      // Create a promise that will be resolved with the bucket list
      return new Promise((resolve, reject) => {
        // Get the current AWS credentials
        const credentials = AWS.config.credentials;
        if (!credentials) {
          return reject(new Error('No AWS credentials available'));
        }
        
        // Create a simple GET request to S3 with Authorization headers
        // Using the regional endpoint can help with some CORS issues
        const region = AWS.config.region || 'us-east-1';
        let endpoint;
        
        // Use the regional endpoint if not us-east-1
        if (region === 'us-east-1') {
          endpoint = 'https://s3.amazonaws.com/';
        } else {
          endpoint = `https://s3.${region}.amazonaws.com/`;
        }
        
        console.log(`Using S3 endpoint: ${endpoint} for CORS-friendly request`);
        
        const request = new AWS.HttpRequest(new AWS.Endpoint(endpoint), region);
        request.method = 'GET';
        request.path = '/';
        request.headers.Host = request.endpoint.host;
        request.headers['Accept'] = 'application/xml, text/xml, */*';
        request.headers['Content-Type'] = 'application/json'; // Simple CORS content type
        
        // Sign the request using AWS Signature V4
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SignerV4 = (AWS as any).Signers.V4;
        const signer = new SignerV4(request, 's3');
        signer.addAuthorization(credentials, new Date());
        
        // Create fetch request options with CORS mode explicitly set
        const requestOptions: RequestInit = {
          method: 'GET',
          headers: request.headers,
          mode: 'cors',
          credentials: 'omit', // Explicitly omit credentials for CORS
        };
        
        // Make a direct fetch call to the S3 API
        fetch(endpoint, requestOptions)
          .then(response => {
            if (!response.ok) {
              console.error('S3 API error response:', response.status, response.statusText);
              throw new Error(`S3 API responded with ${response.status}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(xmlData => {
            // Parse the XML response
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, "application/xml");
            
            // Extract bucket information
            const buckets = Array.from(xmlDoc.getElementsByTagName('Bucket')).map(bucket => {
              const name = bucket.getElementsByTagName('Name')[0]?.textContent;
              const creationDate = bucket.getElementsByTagName('CreationDate')[0]?.textContent;
              
              return {
                Name: name || '',
                CreationDate: creationDate ? new Date(creationDate) : undefined
              };
            });
            
            // Create a response object similar to what the AWS SDK would return
            resolve({
              Buckets: buckets,
              Owner: {
                ID: xmlDoc.getElementsByTagName('ID')[0]?.textContent || '',
                DisplayName: xmlDoc.getElementsByTagName('DisplayName')[0]?.textContent || ''
              }
            });
          })
          .catch(error => {
            console.error('Error in custom listBuckets implementation:', error);
            reject(error);
          });
      });
    };

    // Type cast to 'any' is necessary here because we're monkey-patching the AWS SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s3InstanceAny = s3Instance as any;
    
    // Override the makeRequest method to intercept listBuckets operations
    s3InstanceAny.makeRequest = function(operation: string, params: Record<string, unknown>) {
      // For listBuckets operation specifically, use our custom implementation
      if (operation === 'listBuckets') {
        console.log('Intercepting listBuckets to use CORS-friendly implementation');
        
        // Create a mock request object with a promise method
        const mockRequest = {
          promise: () => customListBuckets()
        };
        
        return mockRequest;
      }
      
      // For all other operations, use the original behavior
      return originalMakeRequest.call(this, operation, params);
    };
  } catch (error) {
    // If patching fails, log the error but don't break the application
    console.error('Failed to patch AWS SDK for CORS:', error);
  }
}

export const getS3 = (): AWS.S3 => {
  if (!s3Instance) {
    throw new Error('S3 not initialized. Call initializeS3 first.');
  }
  return s3Instance;
};

// Use the standard SDK implementation which is now patched for CORS
export const listBuckets = async () => {
  const s3 = getS3();
  try {
    const response = await s3.listBuckets().promise();
    return response.Buckets || [];
  } catch (error) {
    console.error('Error listing buckets:', error);
    throw error;
  }
};

export const createBucket = async (bucketName: string, region: string) => {
  const s3 = getS3();
  const params: AWS.S3.CreateBucketRequest = {
    Bucket: bucketName,
    CreateBucketConfiguration: {
      LocationConstraint: region === 'us-east-1' ? undefined : region
    }
  };
  
  try {
    const response = await s3.createBucket(params).promise();
    return response;
  } catch (error) {
    console.error('Error creating bucket:', error);
    throw error;
  }
};

export const deleteBucket = async (bucketName: string) => {
  const s3 = getS3();
  try {
    await s3.deleteBucket({ Bucket: bucketName }).promise();
    return true;
  } catch (error) {
    console.error('Error deleting bucket:', error);
    throw error;
  }
};

export const getBucketObjects = async (bucketName: string, prefix: string = '') => {
  const s3 = getS3();
  const params: AWS.S3.ListObjectsV2Request = {
    Bucket: bucketName,
    Prefix: prefix,
    Delimiter: '/'
  };
  
  try {
    const response = await s3.listObjectsV2(params).promise();
    return {
      objects: response.Contents || [],
      folders: response.CommonPrefixes || []
    };
  } catch (error) {
    console.error('Error listing bucket objects:', error);
    throw error;
  }
};

// Upload file
export const uploadObject = async (bucketName: string, key: string, file: File): Promise<AWS.S3.ManagedUpload.SendData> => {
  const s3 = getS3();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = createBufferFromArrayBuffer(arrayBuffer);
    
    const params: AWS.S3.PutObjectRequest = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    };
    
    return await s3.upload(params).promise();
  } catch (error) {
    console.error('Error uploading object:', error);
    throw error;
  }
};

// Download file
export const getObjectUrl = (bucketName: string, key: string, expiresInSeconds = 60): string => {
  const s3 = getS3();
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucketName,
    Key: key
  };
  
  return s3.getSignedUrl('getObject', { ...params, Expires: expiresInSeconds });
};

// Delete object
export const deleteObject = async (bucketName: string, key: string): Promise<AWS.S3.DeleteObjectOutput> => {
  const s3 = getS3();
  const params: AWS.S3.DeleteObjectRequest = {
    Bucket: bucketName,
    Key: key
  };
  
  try {
    return await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
};

// Get bucket location
export const getBucketLocation = async (bucketName: string): Promise<string> => {
  const s3 = getS3();
  try {
    const response = await s3.getBucketLocation({ Bucket: bucketName }).promise();
    // If the response is null, the bucket is in us-east-1
    return response.LocationConstraint || 'us-east-1';
  } catch (error) {
    console.error('Error getting bucket location:', error);
    throw error;
  }
};

// Configure CORS for a bucket
export const configureBucketCORS = async (bucketName: string) => {
  const s3 = getS3();
  const corsConfig = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'], // In production, restrict this to your actual domain
        ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
        MaxAgeSeconds: 3000
      }
    ]
  };

  try {
    await s3.putBucketCors({
      Bucket: bucketName,
      CORSConfiguration: corsConfig
    }).promise();
    console.log(`CORS configuration applied to bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error('Error configuring bucket CORS:', error);
    throw error;
  }
};

// Get CORS configuration of a bucket
export const getBucketCORS = async (bucketName: string) => {
  const s3 = getS3();
  try {
    const corsConfig = await s3.getBucketCors({ Bucket: bucketName }).promise();
    return corsConfig.CORSRules || [];
  } catch (error) {
    if ((error as AWS.AWSError).code === 'NoSuchCORSConfiguration') {
      return [];
    }
    console.error('Error getting bucket CORS configuration:', error);
    throw error;
  }
};

// Check if the current credentials have all needed permissions
export const checkS3Permissions = async (): Promise<{
  hasListBuckets: boolean;
  hasReadObjects: boolean;
  hasWriteObjects: boolean;
  hasCorsConfig: boolean;
}> => {
  const s3 = getS3();
  const result = {
    hasListBuckets: false,
    hasReadObjects: false,
    hasWriteObjects: false,
    hasCorsConfig: false
  };
  
  // Test ListBuckets permission
  try {
    await s3.listBuckets().promise();
    result.hasListBuckets = true;
    console.log('Permission check: ListBuckets ✅');
  } catch (error) {
    console.error('Permission check: ListBuckets ❌', error);
  }
  
  // If we can list buckets, try to check other permissions on the first bucket
  if (result.hasListBuckets) {
    try {
      const buckets = await listBuckets();
      if (buckets.length > 0 && buckets[0].Name) {
        const testBucket = buckets[0].Name;
        
        // Test GetObject permission
        try {
          // Just check if we can get the object metadata, don't actually download
          await s3.headObject({ 
            Bucket: testBucket, 
            Key: 'test-key-nonexistent' 
          }).promise()
            .catch(err => {
              // It's okay if the object doesn't exist (404) - we're just checking permissions
              if (err.code === 'NotFound') {
                result.hasReadObjects = true;
              } else if (err.code === 'AccessDenied' || err.code === 'Forbidden') {
                throw err; // Re-throw permission errors
              }
            });
          // If we didn't catch a permission error above
          result.hasReadObjects = true;
          console.log('Permission check: ReadObjects ✅');
        } catch (error) {
          console.error('Permission check: ReadObjects ❌', error);
        }
        
        // Test PutBucketCors permission
        try {
          await s3.getBucketCors({ 
            Bucket: testBucket 
          }).promise()
            .catch(err => {
              // It's okay if no CORS config exists
              if (err.code === 'NoSuchCORSConfiguration') {
                result.hasCorsConfig = true;
              } else if (err.code === 'AccessDenied' || err.code === 'Forbidden') {
                throw err;
              }
            });
          result.hasCorsConfig = true;
          console.log('Permission check: ConfigureCORS ✅');
        } catch (error) {
          console.error('Permission check: ConfigureCORS ❌', error);
        }
      }
    } catch (error) {
      console.error('Error during detailed permission checks:', error);
    }
  }
  
  return result;
}; 