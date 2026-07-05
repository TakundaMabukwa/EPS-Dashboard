'use client';

import { useRef, useEffect, useState } from 'react';

interface FLVPlayerProps {
  streamUrl: string;
  channel: number;
  vehicleName: string;
  onStop?: () => void;
  onStatusChange?: (channel: number, status: 'loading' | 'live' | 'offline') => void;
}

export default function FLVPlayer({ streamUrl, channel, vehicleName, onStop, onStatusChange }: FLVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const reconnectRef = useRef(0);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const destroyedRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;

    let destroyed = false;
    destroyedRef.current = false;
    reconnectRef.current = 0;
    setVideoPlaying(false);
    setError(false);
    setStatus('loading');
    onStatusChange?.(channel, 'loading');
    const maxReconnects = 3;

    const onVideoPlaying = () => {
      if (destroyed) return;
      setVideoPlaying(true);
      setStatus('live');
      setError(false);
      reconnectRef.current = 0;
      onStatusChange?.(channel, 'live');
    };
    const onVideoTimeUpdate = () => {
      if (destroyed) return;
      if (videoRef.current && videoRef.current.currentTime > 0 && !videoPlaying) {
        setVideoPlaying(true);
        setStatus('live');
        setError(false);
        reconnectRef.current = 0;
        onStatusChange?.(channel, 'live');
      }
    };
    const videoEl = videoRef.current;
    videoEl.addEventListener('playing', onVideoPlaying);
    videoEl.addEventListener('timeupdate', onVideoTimeUpdate);

    (async () => {
      let flvjs: any;
      try {
        flvjs = (await import('flv.js')).default;
      } catch {
        if (!destroyed) {
          setStatus('offline');
          onStatusChange?.(channel, 'offline');
        }
        return;
      }
      if (destroyed || !flvjs?.isSupported()) {
        if (!destroyed) {
          setStatus('offline');
          onStatusChange?.(channel, 'offline');
        }
        return;
      }

      function goOffline() {
        if (destroyed) return;
        setError(true);
        setStatus('offline');
        onStatusChange?.(channel, 'offline');
        destroyPlayer();
      }

      function connect() {
        if (destroyed || !videoRef.current) return;

        destroyPlayer();

        const proxyUrl = `/api/video-server/stream/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

        try {
          const player = flvjs.createPlayer({
            type: 'flv',
            url: proxyUrl,
            isLive: true,
            hasAudio: false,
            enableStashBuffer: false,
            stashInitialSize: 128,
          });

          player.attachMediaElement(videoRef.current);
          playerRef.current = player;

          player.on(flvjs.Events.ERROR, () => {
            if (destroyed) return;
            reconnectRef.current++;
            if (reconnectRef.current >= maxReconnects) {
              goOffline();
            } else {
              setTimeout(connect, 1500);
            }
          });

          player.on(flvjs.Events.LOADING_COMPLETE, () => {
            if (destroyed) return;
            reconnectRef.current++;
            if (reconnectRef.current >= maxReconnects) {
              goOffline();
            } else {
              setTimeout(connect, 1500);
            }
          });

          player.load();
          player.play().catch(() => {
            if (!destroyed) {
              reconnectRef.current++;
              if (reconnectRef.current >= maxReconnects) {
                goOffline();
              }
            }
          });
        } catch {
          if (!destroyed) {
            goOffline();
          }
        }
      }

      function destroyPlayer() {
        if (playerRef.current) {
          try {
            playerRef.current.pause();
            playerRef.current.unload();
            playerRef.current.detachMediaElement();
            playerRef.current.destroy();
          } catch {}
          playerRef.current = null;
        }
      }

      connect();

      pingRef.current = setInterval(() => {
        if (destroyed) return;
        if (playerRef.current && videoRef.current && videoRef.current.paused && !error) {
          playerRef.current.play().catch(() => {});
        }
      }, 15000);
    })();

    return () => {
      destroyed = true;
      destroyedRef.current = true;
      if (videoEl) {
        videoEl.removeEventListener('playing', onVideoPlaying);
        videoEl.removeEventListener('timeupdate', onVideoTimeUpdate);
      }
      if (pingRef.current) clearInterval(pingRef.current);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.unload();
          playerRef.current.detachMediaElement();
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [streamUrl]);

  const isLive = status === 'live';
  const isOffline = status === 'offline';

  return (
    <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
      <div className="relative w-full aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted
          playsInline
          autoPlay
        />
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Connecting...</p>
            </div>
          </div>
        )}
        {isOffline && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">Camera Offline</p>
              <p className="text-slate-600 text-xs mt-1">CH{channel}</p>
            </div>
          </div>
        )}
        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white font-medium uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">CH{channel}</span>
          <span className="text-[10px] text-slate-500">|</span>
          <span className={`text-[10px] font-medium ${isLive ? 'text-green-400' : isOffline ? 'text-slate-500' : 'text-yellow-400'}`}>
            {isLive ? 'Streaming' : isOffline ? 'Offline' : 'Connecting'}
          </span>
        </div>
        {onStop && (
          <button
            onClick={onStop}
            className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
