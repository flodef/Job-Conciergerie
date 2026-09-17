'use client';

// Shared 500 content, used by both global-error.tsx (root crashes, wraps it in
// its own <html>/<body>) and app/error.tsx (page crashes inside a layout).
// The .error-500 styles live in (app)/globals.css — imported here so the page
// also renders correctly under the (site) layout, which only loads landing.css.
// inspired by https://codepen.io/altreiter/pen/EedZRQ
import '@/app/(app)/globals.css';
import { Open_Sans } from 'next/font/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const email = 'flo@fims.fi';
const openSans = Open_Sans({ subsets: ['latin'], weight: ['400', '700'] });

export default function Error500({ error, reset }: { error: Error; reset: () => void }) {
  // window is unavailable when this boundary renders server-side (SSR errors)
  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
    setPageUrl(window.location.href);
  }, [error]);

  const retry = () => setTimeout(reset, 1000); // Attempt to recover by trying to re-render the segment
  const reload = () => setTimeout(() => window.location.reload(), 2000); // Hard reset by reloading the page

  return (
    <div className={`${openSans.className} fixed inset-0 z-50 bg-background`}>
      <div className="h-full overflow-hidden flex flex-col items-center justify-center font-bold uppercase text-[3vmin] text-center text-foreground">
        <p className="px-6 z-10">
          Oups ! L&apos;appli s&apos;est emmelée les pinceaux ... <br />
          Merci de me le signaler à{' '}
          <Link target="_blank" href={`mailto:${email}?subject=Erreur innatendue sur ${pageUrl}`}>
            {email}
          </Link>
        </p>
        <div className="error-500 z-0">
          <h1 className="internal" onClick={retry}>
            <span className="five">5</span>
            <span className="zero">0</span>
            <span className="zero">0</span>
          </h1>
          <p className="px-6 cursor-pointer" onClick={reload}>
            Recharger la page
          </p>
        </div>
      </div>
    </div>
  );
}
