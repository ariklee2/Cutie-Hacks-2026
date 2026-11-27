'use client';

import { toPng } from 'html-to-image';
import { forwardRef, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

import { sprocketTile } from '@/components/cinema/filmArt';
import { snapshotContent } from '@/content/snapshot';
import { shareSchemes, type ShareScheme } from '@/theme/tokens';

import classes from './ShareCard.module.css';
import { useWebcamPhoto } from './useWebcamPhoto';

const copy = snapshotContent.share;
const SCHEMES = Object.keys(shareSchemes) as ShareScheme[];

export interface ShareCardData {
  name: string;
  /** The snapshot's year ("2026"), from its week. */
  year: number;
  /** "Nov 14 – Nov 21", or null when unknown. */
  range: string | null;
  /** Up to five, best first: "@f1", "#formula1". */
  topCreators: string[];
  topHashtags: string[];
  /** "1,131", or null when unknown. */
  reels: string | null;
  /** "Sporty 🏀", or null when unknown. */
  club: string | null;
}

/**
 * The share card, story-shaped (9:16), in a carousel of color schemes: the
 * chosen card faces front, its neighbours turn away to either side; ‹ ›,
 * the named swatches, or clicking a side card switch schemes. Top of each
 * card: the year running up the left, a film frame where the picture goes
 * (titled "Insta Snapshot", or a webcam photo), clapperboard stripes. Below:
 * top 5 creators and hashtags, reels watched and club, a footer. "Take a
 * photo" (live preview, 3-2-1, snap; kept in the browser only) puts the photo
 * on every card. Save image downloads the front card as a PNG; Share and
 * Copy text send the same content as plain text.
 */
export function ShareCard({ data }: { data: ShareCardData }) {
  const front = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'saving' | 'copyFailed' | 'saveFailed'>('idle');
  const camera = useWebcamPhoto();
  const cameraOn = camera.state === 'starting' || camera.state === 'live' || camera.state === 'counting';
  const cam = copy.camera;
  const none = copy.unavailable;
  const scheme = SCHEMES[active];
  const n = SCHEMES.length;
  const text = copy.text(copy.cardTitle, data.year, data.range, [
    [copy.labels.topCreators, data.topCreators.join(', ') || none],
    [copy.labels.topHashtags, data.topHashtags.join(', ') || none],
    [copy.labels.reels, data.reels ?? none],
    [copy.labels.club, data.club ?? none],
  ]);

  useEffect(() => setCanShare(typeof navigator !== 'undefined' && 'share' in navigator), []);

  const go = (i: number) => {
    if (!cameraOn) setActive(((i % n) + n) % n); // the live preview stays on one card
  };

  async function saveImage() {
    if (!front.current) return;
    setStatus('saving');
    try {
      const url = await toPng(front.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.name}-insta-snapshot-${data.year}-${scheme}.png`;
      link.click();
      setStatus('idle');
    } catch {
      setStatus('saveFailed');
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('copyFailed');
    }
  }

  async function share() {
    try {
      await navigator.share({ title: copy.cardTitle, text });
    } catch {
      // Cancelled by the user, or not allowed: nothing to report.
    }
  }

  return (
    <div className={classes.wrap} data-no-tap>
      <div className={classes.carousel} role="group" aria-roledescription="carousel" aria-label={copy.schemesLabel}>
        <button
          type="button"
          className={classes.arrow}
          data-side="previous"
          onClick={() => go(active - 1)}
          disabled={cameraOn}
          aria-label={copy.previousScheme}
        >
          ‹
        </button>

        <div className={classes.stage}>
          {SCHEMES.map((s, i) => {
            // Shortest way round: -2…2 for five schemes.
            let offset = i - active;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const isFront = offset === 0;
            return (
              <div
                key={s}
                className={classes.slot}
                data-offset={offset}
                style={{ '--offset': offset, '--abs': Math.abs(offset) } as CSSProperties}
                aria-hidden={!isFront}
                onClick={isFront ? undefined : () => go(i)}
              >
                <CardFace
                  ref={isFront ? front : undefined}
                  scheme={s}
                  data={data}
                  picture={
                    isFront && cameraOn ? (
                      <>
                        <video ref={camera.videoRef} className={classes.video} muted playsInline aria-hidden="true" />
                        {camera.state === 'counting' && (
                          <span key={camera.count} className={classes.countdown} aria-live="assertive">
                            {camera.count}
                          </span>
                        )}
                      </>
                    ) : camera.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a local data URL, not an optimisable asset
                      <img src={camera.photo} alt={cam.alt(data.name)} className={classes.photo} />
                    ) : null
                  }
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={classes.arrow}
          data-side="next"
          onClick={() => go(active + 1)}
          disabled={cameraOn}
          aria-label={copy.nextScheme}
        >
          ›
        </button>
      </div>

      {/* Named swatches: each shows its card and text colors. */}
      <div className={classes.swatches} role="radiogroup" aria-label={copy.schemesLabel}>
        {SCHEMES.map((s, i) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={i === active}
            className={classes.swatch}
            onClick={() => go(i)}
            disabled={cameraOn}
            style={schemeStyle(s)}
          >
            <span className={classes.chip} aria-hidden="true" />
            {copy.schemes[s]}
          </button>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {copy.schemeOf(copy.schemes[scheme], active + 1, n)}
      </p>

      <div className={classes.side}>
        <div className={classes.actions}>
          {cameraOn ? (
            <>
              <button
                type="button"
                className={classes.button}
                data-primary
                onClick={camera.snap}
                disabled={camera.state !== 'live'}
              >
                {camera.state === 'starting' ? cam.starting : cam.snap}
              </button>
              <button type="button" className={classes.button} onClick={camera.cancel}>
                {cam.cancel}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={classes.button} onClick={camera.start}>
                {camera.photo ? cam.retake : cam.take}
              </button>
              {camera.photo && (
                <button type="button" className={classes.button} onClick={camera.remove}>
                  {cam.remove}
                </button>
              )}
            </>
          )}
        </div>
        <p className={classes.note}>
          {camera.state === 'denied' ? cam.denied : camera.state === 'unavailable' ? cam.unavailable : cam.privacy}
        </p>
        <div className={classes.actions}>
          <button
            type="button"
            className={classes.button}
            data-primary={!cameraOn || undefined}
            onClick={saveImage}
            disabled={status === 'saving' || cameraOn}
          >
            {status === 'saving' ? copy.saving : copy.saveButton}
          </button>
          {canShare && (
            <button type="button" className={classes.button} onClick={share}>
              {copy.shareButton}
            </button>
          )}
          <button type="button" className={classes.button} onClick={copyText}>
            {status === 'copied' ? copy.copied : copy.copyButton}
          </button>
        </div>
        <p role="status" className={classes.status}>
          {status === 'copyFailed' ? copy.copyFailed : status === 'saveFailed' ? copy.saveFailed : ''}
        </p>
      </div>
    </div>
  );
}

/** The scheme's colors as the card's CSS variables. */
function schemeStyle(scheme: ShareScheme): CSSProperties {
  const c = shareSchemes[scheme];
  return {
    '--card-bg': c.bg,
    '--card-fg': c.fg,
    '--card-picture': c.picture,
    '--card-on-picture': c.onPicture,
    '--card-year': c.year,
  } as CSSProperties;
}

/** One card in one scheme. `picture` replaces the title in the film frame (a photo or the live camera). */
const CardFace = forwardRef<
  HTMLElement,
  { scheme: ShareScheme; data: ShareCardData; picture: ReactNode }
>(function CardFace({ scheme, data, picture }, ref) {
  const none = copy.unavailable;
  return (
    <article
      ref={ref as RefObject<HTMLElement>}
      className={classes.card}
      aria-label={`${copy.cardTitle} ${data.year}, ${copy.schemes[scheme]}`}
      style={{ ...schemeStyle(scheme), '--sprocket': sprocketTile() } as CSSProperties}
    >
      {/* Art: stripes behind, the year up the left, the titled film frame. */}
      <div className={classes.art}>
        <span className={classes.stripesTop} aria-hidden="true" />
        <span className={classes.stripesSide} aria-hidden="true" />
        <span className={classes.year}>{data.year}</span>
        <div className={classes.frame}>
          <div className={classes.picture} data-photo={picture ? '' : undefined}>
            {picture ?? (
              <>
                <p className={classes.title}>{copy.cardTitle}</p>
                {data.range && <p className={classes.range}>{data.range}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className={classes.lists}>
        <RankList label={copy.labels.topCreators} items={data.topCreators} />
        <RankList label={copy.labels.topHashtags} items={data.topHashtags} />
      </div>

      <div className={classes.stats}>
        <div>
          <p className={classes.label}>{copy.labels.reels}</p>
          <p className={classes.big}>{data.reels ?? none}</p>
        </div>
        <div>
          <p className={classes.label}>{copy.labels.club}</p>
          <p className={classes.big}>{data.club ?? none}</p>
        </div>
      </div>

      <footer className={classes.footer}>
        <span className={classes.handle}>@{data.name}</span>
        <span className={classes.brand}>{copy.footer}</span>
      </footer>
    </article>
  );
});

/** "Top Creators" then 1–5, numbered. */
function RankList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className={classes.label}>{label}</p>
      {items.length > 0 ? (
        <ol className={classes.ranks}>
          {items.map((item, i) => (
            <li key={item}>
              <span className={classes.rank}>{i + 1}</span>
              <span className={classes.item}>{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={classes.item}>{copy.unavailable}</p>
      )}
    </div>
  );
}
