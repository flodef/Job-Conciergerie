'use client';

import Error500 from '@/app/components/error500';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <Error500 error={error} reset={reset} />;
}
