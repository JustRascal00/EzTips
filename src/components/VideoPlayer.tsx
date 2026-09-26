"use client";

import { cn } from "@/lib/cn";
import {
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  src,
  poster,
  active,
  captions,
  onEnded,
  className,
  vertical,
  minimal,
}: {
  src: string;
  poster?: string;
  active?: boolean;
  captions?: string;
  onEnded?: () => void;
  className?: string;
  vertical?: boolean;
  /** TikTok-style: tap to pause, thin draggable timeline at the bottom edge, mute in the corner. */
  minimal?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const playerId = useId();
  const [playing, setPlaying] = useState(false);
  // Start with sound enabled. Browsers may block the initial autoplay, in which
  // case the visible play button provides the required user gesture.
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [fs, setFs] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [duration, setDuration] = useState(0);

  const play = useCallback(async () => {
    const v = ref.current;
    if (!v) return;
    try {
      await v.play();
    } catch {}
  }, []);

  const pause = useCallback(() => {
    ref.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (ref.current?.paused) play();
    else pause();
  }, [play, pause]);

  useEffect(() => {
    if (active === false) pause();
    else if (active) play();
  }, [active, play, pause]);

  useEffect(() => {
    const element = wrap.current;
    const video = ref.current;
    if (!element || !video) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.35) video.pause();
    }, { threshold: [0, 0.35] });
    observer.observe(element);

    const pauseForOtherPlayer = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== playerId) video.pause();
    };
    const pauseWhenHidden = () => {
      if (document.hidden) video.pause();
    };
    window.addEventListener("eztips:video-play", pauseForOtherPlayer);
    document.addEventListener("visibilitychange", pauseWhenHidden);

    return () => {
      observer.disconnect();
      window.removeEventListener("eztips:video-play", pauseForOtherPlayer);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      video.pause();
    };
  }, [playerId]);

  useEffect(() => {
    if (active === false) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "m" || e.key === "M") {
        const v = ref.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, toggle]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let last = 0;
    const onTime = () => {
      if (v.duration) {
        // A looping video never fires "ended": treat wrapping from the end back to the start as a completion.
        if (v.loop && last > v.duration * 0.85 && v.currentTime < 1) onEnded?.();
        last = v.currentTime;
        setProgress(v.currentTime / v.duration);
        setDuration(v.duration);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      window.dispatchEvent(new CustomEvent("eztips:video-play", { detail: playerId }));
    };
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", () => onEnded?.());
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [onEnded, playerId]);

  const bumpUi = () => {
    setShowUi((open) => (open ? open : true));
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowUi(false), 1800);
  };

  const seek = (ratio: number) => {
    const v = ref.current;
    if (!v?.duration) return;
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  const toggleFs = async () => {
    const el = wrap.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFs(true);
    } else {
      await document.exitFullscreen();
      setFs(false);
    }
  };

  if (minimal) {
    const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
    const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      seek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
    };
    return (
      <div ref={wrap} className={cn("relative overflow-hidden bg-black", className)}>
        <video ref={ref} src={src} poster={poster} muted={muted} playsInline loop className="h-full w-full cursor-pointer object-cover" onClick={toggle} />

        {!playing && (
          <button type="button" onClick={toggle} aria-label="Play" className="absolute left-1/2 top-1/2 z-10 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 backdrop-blur">
            <Play className="ml-1 h-7 w-7 fill-white text-white" />
          </button>
        )}

        <button
          type="button"
          onClick={() => { const v = ref.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* timeline */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") seek(Math.min(1, progress + 0.05)); if (e.key === "ArrowLeft") seek(Math.max(0, progress - 0.05)); }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); seekFromPointer(e); }}
          onPointerMove={(e) => { if (dragging) seekFromPointer(e); }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className="group/bar absolute inset-x-0 bottom-0 z-30 flex h-6 cursor-pointer touch-none items-end"
        >
          {(dragging || duration > 0) && (
            <span className={cn("pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular text-white transition-opacity", dragging ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100")}>
              {fmt(progress * duration)} / {fmt(duration)}
            </span>
          )}
          <div className={cn("relative w-full bg-white/20 transition-[height]", dragging ? "h-1.5" : "h-[3px] group-hover/bar:h-1.5")}>
            <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
            <span className={cn("absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity", dragging ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100")} style={{ left: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      className={cn(
        "relative overflow-hidden bg-black group",
        vertical ? "rounded-2xl" : "rounded-2xl",
        className,
      )}
      onMouseMove={bumpUi}
      onMouseLeave={() => setShowUi(false)}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        playsInline
        className="h-full w-full object-cover"
        onClick={toggle}
      />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div className="h-full bg-white/80" style={{ width: `${progress * 100}%` }} />
      </div>
      {showCaptions && captions && playing && (
        <div className="absolute bottom-16 left-3 right-3 text-center text-[13px] leading-snug text-white drop-shadow">
          {captions}
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          playing && !showUi ? "opacity-0" : "opacity-100",
        )}
      >
        <button
          onClick={toggle}
          className="h-14 w-14 rounded-full bg-black/45 border border-white/15 grid place-items-center"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </button>
      </div>
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200",
          showUi || !playing ? "opacity-100" : "opacity-0",
        )}
      >
        <button onClick={toggle} className="text-white" aria-label="Play pause">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 accent-white h-1"
        />
        <button
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
          }}
          aria-label="Mute"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            const val = Number(e.target.value);
            setVolume(val);
            if (ref.current) {
              ref.current.volume = val;
              ref.current.muted = val === 0;
              setMuted(val === 0);
            }
          }}
          className="w-16 accent-white h-1 hidden sm:block"
        />
        <select
          value={speed}
          onChange={(e) => {
            const s = Number(e.target.value);
            setSpeed(s);
            if (ref.current) ref.current.playbackRate = s;
          }}
          className="bg-black/40 text-xs rounded-md px-1 py-0.5 border border-white/15"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCaptions((v) => !v)}
          className={cn(showCaptions ? "text-white" : "text-white/40")}
          aria-label="Captions"
        >
          <Captions className="h-4 w-4" />
        </button>
        <button onClick={toggleFs} aria-label="Fullscreen">
          {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
