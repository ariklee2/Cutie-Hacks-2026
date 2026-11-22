import type { ReactNode } from 'react';

import { SceneProgress } from '@/components/snapshot/SceneProgress';
import { SceneTransition } from '@/components/snapshot/SceneTransition';

/**
 * Shared by every snapshot scene, so it stays mounted between them: the
 * progress bar across the top and the film wipe between scenes.
 */
export default function SnapshotLayout({ children }: { children: ReactNode }) {
  return (
    <SceneTransition>
      <SceneProgress />
      {children}
    </SceneTransition>
  );
}
