# Troubleshooting CORS Issues with AWS S3

If you're experiencing CORS (Cross-Origin Resource Sharing) errors when using this S3 Bucket Manager, this guide will help you understand the issues and provide solutions.

## Understanding CORS Errors

CORS errors occur when your browser tries to make a request to an AWS S3 bucket from a different origin (domain, protocol, or port) than the one hosting the web application. AWS S3 buckets block these cross-origin requests by default for security reasons.

Common error messages include:
- `Access to XMLHttpRequest has been blocked by CORS policy`
- `403 Forbidden` with CORS mentioned in the details
- `No 'Access-Control-Allow-Origin' header is present on the requested resource`

## 1. Basic Solutions

### Use the "Configure CORS" Button

The easiest solution is to use the "Configure CORS" button provided next to each bucket in the application. This will:

1. Add a CORS configuration to your bucket that allows requests from any origin 
2. Enable the necessary HTTP methods (GET, PUT, POST, DELETE, HEAD)
3. Allow the required headers

### Manually Configure CORS in AWS Console

If the button doesn't work, you can manually configure CORS:

1. Log in to the AWS Management Console
2. Navigate to S3 and select your bucket
3. Go to the "Permissions" tab
4. Scroll down to the "Cross-origin resource sharing (CORS)" section
5. Click "Edit" and paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-server-side-encryption"],
    "MaxAgeSeconds": 3000
  }
]
```

**Note:** In production, you should restrict `AllowedOrigins` to only your application's domain for security.

## 2. IAM Permission Issues

A common cause of CORS errors is insufficient IAM permissions. Your AWS user needs these permissions:

### Minimum Required Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketCORS",
        "s3:PutBucketCORS",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual bucket name or use `*` for all buckets.

## 3. Browser Debugging

To see the exact CORS errors:

1. Open your browser's Developer Tools (F12 or Right-click > Inspect)
2. Go to the Network tab
3. Look for the failed requests to AWS S3 (they'll typically show status 403)
4. Click on the request and check the Response or Console tab for the specific error

## 4. Common Issues and Solutions

### Missing s3:PutBucketCORS Permission
- **Symptom:** "Configure CORS" button fails with Access Denied
- **Solution:** Add the `s3:PutBucketCORS` permission to your IAM policy

### Endpoint Region Mismatch
- **Symptom:** CORS errors despite proper configuration
- **Solution:** Make sure the region selected in the application matches your bucket's region

### Public vs Private Buckets
- **Symptom:** CORS works for some operations but not others
- **Solution:** Check bucket privacy settings. Some operations might require different permissions for public vs private buckets

### Bucket Policy Blocking Access
- **Symptom:** CORS configuration is correct but still getting 403 errors
- **Solution:** Check if your bucket has a restrictive bucket policy that's overriding the CORS settings

## 5. Using the Diagnostic Tool

This application includes a diagnostic tool that can help identify permission issues:

1. Click on "Having issues? Show Diagnostic Tool" on the buckets page
2. Click "Check Permissions" to run a permission check
3. The tool will tell you which specific permissions are missing
4. Use the IAM Policy Suggestions to generate a policy that fixes the issues

## Need More Help?

If you're still experiencing issues after trying these solutions, please:

1. Use the permission diagnostic tool to check which permissions are missing
2. Take a screenshot of the specific error in your browser's developer console
3. Create an issue on our GitHub repository with the above information

---

Remember, CORS issues are often related to permissions or configuration rather than code problems. With the right settings, they can be resolved quickly. 