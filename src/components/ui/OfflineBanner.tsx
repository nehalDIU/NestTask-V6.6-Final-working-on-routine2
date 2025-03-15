import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({ message = "You are currently offline. Some features may be limited." }: OfflineBannerProps) {
  return (
    <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
      <div className="flex items-center">
        <div className="flex-shrink-0 text-amber-400">
          <WifiOff className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
} 