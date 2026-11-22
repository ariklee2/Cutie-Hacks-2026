'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

import { useSceneNav } from './SceneTransition';

/** A link to another snapshot scene that plays the film wipe (plain link with modifier keys). */
export function SceneLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
  'data-direction'?: string;
}) {
  const go = useSceneNav();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(href);
  }

  return (
    <Link href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
