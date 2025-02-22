import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Link
        href="/home"
        className="px-8 py-4 text-2xl font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Ajouter un bien
      </Link>
    </div>
  );
}
