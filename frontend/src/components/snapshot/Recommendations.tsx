import { snapshotContent } from '@/content/snapshot';
import type { RecommendedProfile, RecommendedReel } from '@/lib/recommendationsData';

import classes from './Recommendations.module.css';

const copy = snapshotContent.recommendations;

/** First line of a caption, without hashtags, for a one-line preview. */
function captionPreview(caption: string) {
  const text = caption.replace(/#[\w.]+/g, '').replace(/\s+/g, ' ').trim();
  return text || copy.noCaption;
}

/** External link to Instagram, opened in a new tab. */
function InstagramLink({ href, label, subject }: { href: string; label: string; subject: string }) {
  return (
    <a className={classes.link} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: ${subject}`}>
      {label} <span aria-hidden="true">↗</span>
    </a>
  );
}

/** Recommended reels: creator, caption preview, why, and a link to watch it. */
export function RecommendedReels({ reels }: { reels: RecommendedReel[] }) {
  return (
    <section className={classes.group} aria-labelledby="recommended-reels">
      <h2 id="recommended-reels" className={classes.heading}>
        {copy.reelsHeading}
      </h2>
      <ol className={classes.list}>
        {reels.map((reel) => (
          <li key={reel.shortcode} className={classes.row}>
            <div className={classes.main}>
              <p className={classes.name}>{copy.by(reel.creator)}</p>
              <p className={classes.caption}>{captionPreview(reel.caption)}</p>
              <p className={classes.why}>{reel.why}</p>
            </div>
            <InstagramLink href={reel.url} label={copy.openReel} subject={`@${reel.creator}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Recommended accounts: username, name, why, and a link to their profile. */
export function RecommendedProfiles({ profiles }: { profiles: RecommendedProfile[] }) {
  return (
    <section className={classes.group} aria-labelledby="recommended-profiles">
      <h2 id="recommended-profiles" className={classes.heading}>
        {copy.profilesHeading}
      </h2>
      <ol className={classes.list}>
        {profiles.map((profile) => (
          <li key={profile.username} className={classes.row}>
            <div className={classes.main}>
              <p className={classes.name}>
                @{profile.username}
                {profile.full_name && <span className={classes.fullName}> · {profile.full_name}</span>}
              </p>
              <p className={classes.why}>{profile.why}</p>
            </div>
            <InstagramLink href={profile.url} label={copy.openProfile} subject={`@${profile.username}`} />
          </li>
        ))}
      </ol>
    </section>
  );
}
