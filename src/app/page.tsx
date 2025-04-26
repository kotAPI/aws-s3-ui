import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold text-gray-800">
          S3 Bucket Manager
        </h1>

        <p className="text-xl text-gray-600">
          A modern, user-friendly interface for managing your AWS S3 buckets and objects
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center mt-8">
          <Link
            href="/auth"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            Connect to AWS
          </Link>

          <Link
            href="/buckets"
            className="px-6 py-3 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            Browse Buckets (Demo)
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Manage Buckets</h3>
            <p className="text-gray-600">Create, view, and delete S3 buckets across all your regions</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Browse Files</h3>
            <p className="text-gray-600">Navigate folders, upload files, and manage permissions</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-2">Secure Access</h3>
            <p className="text-gray-600">Use read-only mode for safer access to your S3 resources</p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 text-gray-500 text-sm">
          <p>This application requires AWS credentials with appropriate S3 permissions.</p>
          <p className="mt-2">All operations are performed directly between your browser and AWS.</p>
        </div>
      </div>
    </div>
  );
}
