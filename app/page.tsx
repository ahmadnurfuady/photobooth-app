// app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">
            📸 Photobooth App
          </h1>
          <p className="text-xl text-gray-600">
            Professional photobooth experience for your events
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md: grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-3">🖼️</div>
            <h3 className="text-lg font-semibold mb-2">Custom Frames</h3>
            <p className="text-gray-600">Upload and manage custom photo frames</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-3">📷</div>
            <h3 className="text-lg font-semibold mb-2">Easy Capture</h3>
            <p className="text-gray-600">Simple and intuitive photo capture flow</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-3">⬇️</div>
            <h3 className="text-lg font-semibold mb-2">Quick Download</h3>
            <p className="text-gray-600">QR code and instant download options</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link href="/camera">
            <Button size="lg" className="w-full sm:w-auto">
              Start Photobooth
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button size="lg" variant="secondary" className="w-full sm: w-auto">
              Admin Login
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-12">
          Built with Next.js, Firebase, Supabase, and Cloudinary
        </p>
      </div>
    </div>
  );
}