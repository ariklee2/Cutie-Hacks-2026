'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraState = 'off' | 'starting' | 'live' | 'counting' | 'denied' | 'unavailable';

const COUNTDOWN = 3; // seconds before the shot
const SIZE = 900; // px, the square photo's side

/**
 * A webcam photo for the share card: start() asks for the camera and shows
 * a live, mirrored preview in `videoRef`; snap() counts down 3-2-1, then
 * takes a square photo from the middle of the frame (mirrored like the
 * preview) and turns the camera off. The photo is a data URL kept in memory
 * only — never uploaded. The camera is always released on cancel, after a
 * shot, and when the card unmounts.
 */
export function useWebcamPhoto() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<CameraState>('off');
  const [count, setCount] = useState(COUNTDOWN);
  const [photo, setPhoto] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // Attach the stream once the <video> is on screen.
  useEffect(() => {
    if ((state === 'live' || state === 'counting') && videoRef.current && stream.current) {
      if (videoRef.current.srcObject !== stream.current) videoRef.current.srcObject = stream.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [state]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      setState('live');
    } catch (error) {
      const name = (error as DOMException).name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }, []);

  const cancel = useCallback(() => {
    stop();
    setState('off');
  }, [stop]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(SIZE, 0); // mirror, to match the selfie preview
    ctx.scale(-1, 1);
    ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    setPhoto(canvas.toDataURL('image/jpeg', 0.9));
    stop();
    setState('off');
  }, [stop]);

  const snap = useCallback(() => {
    if (state !== 'live') return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant) {
      capture();
      return;
    }
    setState('counting');
    setCount(COUNTDOWN);
    let left = COUNTDOWN;
    timer.current = setInterval(() => {
      left -= 1;
      if (left > 0) setCount(left);
      else capture();
    }, 1000);
  }, [state, capture]);

  return { videoRef, state, count, photo, start, snap, cancel, remove: () => setPhoto(null) };
}
