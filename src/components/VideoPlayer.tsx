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
import { useCallback, useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  src,
  poster,
  active,
  captions,
  onEnded,
  className,
  vertical,
}: {
  src: string;
  poster?: string;
  active?: boolean;
  captions?: string;
  onEnded?: () => void;
  className?: string;
  vertical?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true);
  const [fs, setFs] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const play = useCallback(async () => {
    const v = ref.current;
    if (!v) return;
    try {
      await v.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    ref.current?.pause();
    setPlaying(false);
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
    const onTime = () => {
      if (v.duration) setProgress(v.currentTime / v.duration);
    };
    const onPlay = () => setPlaying(true);
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
  }, [onEnded]);

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
