// app/result/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Frame, PhotoSession } from '@/types';
import { LoadingOverlay } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { QRCodeCanvas } from 'qrcode.react';
import {
  createPhotoStripWithFrame,
  generateGIF,
  downloadBase64Image,
} from '@/lib/imageProcessing';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function ResultPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Loading photos...');
  
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);  // Original photos WITHOUT frame
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);  // 3 photos in 1 frame
  const [gifUrl, setGifUrl] = useState<string | null>(null);  // GIF from original photos
  const [session, setSession] = useState<PhotoSession | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAndProcessPhotos();
  }, []);

  const loadAndProcessPhotos = async () => {
    try {
      // Load data from sessionStorage
      const frameData = sessionStorage.getItem('selectedFrame');
      const photosData = sessionStorage.getItem('capturedPhotos');

      if (! frameData || !photosData) {
        toast.error('No photos found.  Please start a new session.');
        router.push('/camera');
        return;
      }

      const frame = JSON.parse(frameData) as Frame;
      const photos = JSON.parse(photosData) as string[];

      setSelectedFrame(frame);
      setCapturedPhotos(photos);  // Store original photos

      // Process photos
      await processAllPhotos(frame, photos);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Failed to process photos');
      router.push('/camera');
    }
  };

  const processAllPhotos = async (frame: Frame, photos: string[]) => {
    try {
      setProgress(10);
      setProgressMessage('Creating photo strip with frame...  🖼️');

      // Step 1: Create composite (3 photos in 1 frame) with custom layout settings
      const composite = await createPhotoStripWithFrame(
        photos, 
        frame.cloudinary_url,
        frame.layout_settings || undefined
      );
      setCompositePhoto(composite);
      setProgress(40);

      setProgressMessage('Generating GIF animation from original photos... ✨');

      // Step 2: Generate GIF from ORIGINAL photos (without frame)
      const gif = await generateGIF(photos);
      setGifUrl(gif);
      setProgress(70);

      setProgressMessage('Uploading to cloud...  ☁️');

      // Step 3: Upload to server and create session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame_id: frame.id,
          photos: photos,  // Original photos without frame
          composite_photo: composite,  // Photo strip with frame
          gif: gif,  // GIF from original photos
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to create session (${response.status})`;
        console.error('Session creation error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!data.data) {
        console.error('Invalid session response:', data);
        throw new Error('Invalid response from server');
      }
      setSession(data.data);
      setProgress(90);

      setProgressMessage('Almost done...  🎉');

      // Generate download URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const downloadLink = `${appUrl}/download/${data.data.id}`;
      setDownloadUrl(downloadLink);

      setProgress(100);
      setProgressMessage('Complete! ');
      
      // Clear sessionStorage
      sessionStorage.removeItem('selectedFrame');
      sessionStorage.removeItem('capturedPhotos');

      setTimeout(() => {
        setProcessing(false);
        toast.success('Photos processed successfully!  🎉');
      }, 500);
    } catch (error:  any) {
      console.error('Error processing photos:', error);
      toast.error(error.message || 'Failed to process photos');
      setProcessing(false);
    }
  };

  const handleDownloadComposite = () => {
    if (compositePhoto) {
      downloadBase64Image(compositePhoto, `photobooth-strip-${Date.now()}.jpg`);
      toast.success('Photo strip downloaded! ');
    }
  };

  const handleDownloadGif = () => {
    if (gifUrl) {
      downloadBase64Image(gifUrl, `photobooth-animation-${Date.now()}.gif`);
      toast.success('GIF downloaded!');
    }
  };

  const handleDownloadAllPhotos = async () => {
    // ZIP functionality removed - use individual downloads instead
    toast.success('Download individual photos using the buttons above');
  };

  const handleNewSession = () => {
    router.push('/camera');
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Progress Circle */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#3B82F6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600">{progress}%</span>
              </div>
            </div>

            {/* Progress Message */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Processing Photos
            </h2>
            <p className="text-gray-600 text-center mb-6">{progressMessage}</p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // app/result/page.tsx (bagian return setelah processing)

return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
    <div className="max-w-5xl mx-auto">
      {/* Header - Compact */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          🎉 Photos Ready! 
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Your photos are ready to download
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left Column:  Previews - Compact */}
        <div className="lg:col-span-2 space-y-4">
          {/* Photo Strip with Frame - Compact */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>📸</span>
              Photo Strip (3 in 1 frame)
            </h3>
            {compositePhoto && (
              <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3">
                <Image
                  src={compositePhoto}
                  alt="Photo Strip"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleDownloadComposite}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Photo Strip
            </Button>
          </div>

          {/* GIF & Individual Photos - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GIF Animation - Compact */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>✨</span>
                GIF Animation
              </h3>
              {gifUrl && (
                <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3">
                  <Image
                    src={gifUrl}
                    alt="GIF Animation"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadGif}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download GIF
              </Button>
            </div>

            {/* Individual Photos - Compact */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>🖼️</span>
                Individual Photos
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {capturedPhotos.map((photo, index) => (
                  <div key={index}>
                    <div className="relative w-full aspect-[3/4] bg-gray-100 rounded overflow-hidden">
                      <Image
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadAllPhotos}
                className="w-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download All (ZIP)
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: QR & Actions - Compact */}
        <div className="space-y-4">
          {/* QR Code - Compact */}
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📱 Scan QR Code
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              Download on your phone
            </p>
            {downloadUrl && (
              <>
                <div className="bg-gray-100 p-3 rounded-lg inline-block mb-2">
                  <QRCodeCanvas
                    value={downloadUrl}
                    size={150}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">
                    ⏰ Expires in 24 hours
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Session Info - Compact */}
          {session && (
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Session Info
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Frame:</span>
                  <span className="font-medium truncate ml-2">{selectedFrame?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Photos:</span>
                  <span className="font-medium">{session.photo_count}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions - Compact */}
          <div className="space-y-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleNewSession}
              className="w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              New Session
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}