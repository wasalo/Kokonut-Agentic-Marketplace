import Link from 'next/link';
import Image from 'next/image';

export default function NotFound(): JSX.Element {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <Image
          src="/kkn_icon.png"
          alt="Kokonut"
          width={64}
          height={64}
          className="h-16 w-16 mx-auto mb-6 opacity-50"
        />
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
