import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from 'react-toastify';
import { AwsProvider, useAws } from '@/contexts/AwsContext';
import CorsProxyHandler from '@/components/CorsProxyHandler';
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S3 Bucket Manager",
  description: "A modern UI for managing AWS S3 buckets",
};

// Wrapper that adds CORS handling when authenticated
function CorsHandler({ children }: { children: React.ReactNode }) {
  const { setCorsHandlerInitialized, isAuthenticated } = useAws();

  return (
    <>
      {isAuthenticated && <CorsProxyHandler onInitialized={() => setCorsHandlerInitialized(true)} />}
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AwsProvider>
          <CorsHandler>
            <ToastContainer position="top-right" autoClose={3000} />
            {children}
          </CorsHandler>
        </AwsProvider>
      </body>
    </html>
  );
}
