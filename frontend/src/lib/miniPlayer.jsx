import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Play, Pause, X, Music, ChevronUp, ChevronDown, SkipBack, SkipForward } from "lucide-react";

const MiniPlayerContext = createContext(null);

export function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = u.searchParams.get("v");
    if (id) return id;
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    return null;
  } catch {
    return null;
  }
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    if (!document.getElementById("yt-iframe-api-script")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api-script";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
  });
}

export function MiniPlayerProvider({ children }) {
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [track, setTrack] = useState(null); // { videoId, name, artist }
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const tickRef = useRef(null);

  // Init API + player
  useEffect(() => {
    let mounted = true;
    loadYouTubeAPI().then((YT) => {
      if (!mounted) return;
      // Ensure container exists
      if (!document.getElementById("yt-audio-host")) {
        const host = document.createElement("div");
        host.id = "yt-audio-host";
        host.style.cssText =
          "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
        host.innerHTML = '<div id="yt-audio"></div>';
        document.body.appendChild(host);
      }
      playerRef.current = new YT.Player("yt-audio", {
        width: "1",
        height: "1",
        playerVars: { controls: 0, disablekb: 1, playsinline: 1, autoplay: 0, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            setIsPlaying(e.data === S.PLAYING);
            if (e.data === S.ENDED) {
              setIsPlaying(false);
            }
          },
          onError: (e) => {
            // 100: video not found, 101/150: embed not allowed, 2: invalid param
            const codes = { 2: "Vídeo inválido", 5: "Erro no player HTML5", 100: "Vídeo não encontrado", 101: "Reprodução restrita pelo autor", 150: "Reprodução restrita pelo autor" };
            const msg = codes[e.data] || "Não foi possível reproduzir este vídeo";
            setPlayerError(msg);
            setIsPlaying(false);
          },
        },
      });
    });
    return () => { mounted = false; };
  }, []);

  // Progress tick
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (isPlaying && playerRef.current) {
      tickRef.current = setInterval(() => {
        try {
          const p = playerRef.current;
          if (!p || !p.getCurrentTime) return;
          setCurrentTime(p.getCurrentTime() || 0);
          setDuration(p.getDuration() || 0);
        } catch {}
      }, 500);
    }
    return () => tickRef.current && clearInterval(tickRef.current);
  }, [isPlaying]);

  const playTrack = useCallback((t) => {
    if (!ready || !playerRef.current) return;
    setTrack(t);
    setPlayerError(null);
    playerRef.current.loadVideoById(t.videoId);
    playerRef.current.playVideo();
  }, [ready]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying]);

  const closePlayer = useCallback(() => {
    if (playerRef.current) {
      try { playerRef.current.stopVideo(); } catch {}
    }
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const seek = useCallback((sec) => {
    if (playerRef.current) playerRef.current.seekTo(sec, true);
    setCurrentTime(sec);
  }, []);

  const value = {
    ready, track, isPlaying, currentTime, duration, playerError,
    playTrack, togglePlay, closePlayer, seek,
    isCurrent: (videoId) => track?.videoId === videoId,
  };

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
      <MiniPlayer collapsed={collapsed} setCollapsed={setCollapsed} />
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) throw new Error("useMiniPlayer must be used within MiniPlayerProvider");
  return ctx;
}

function fmtTime(s) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r < 10 ? "0" + r : r}`;
}

function MiniPlayer({ collapsed, setCollapsed }) {
  const { track, isPlaying, currentTime, duration, playerError, togglePlay, closePlayer, seek } = useMiniPlayer();
  const [position, setPosition] = useState("bottom"); // 'bottom' | 'top'
  if (!track) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function onProgressClick(e) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    seek((x / rect.width) * duration);
  }

  const positionClass = position === "bottom"
    ? "bottom-0 left-0 right-0"
    : "top-0 left-0 right-0";

  return (
    <div
      data-testid="mini-player"
      className={`fixed ${positionClass} z-30 px-3 pb-3 md:px-6 md:pb-4 pointer-events-none`}
    >
      <div className={`pointer-events-auto max-w-3xl mx-auto rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${collapsed ? "px-4 py-2" : "px-4 py-3"}`}>
        <div className="flex items-center gap-3">
          {/* Album icon */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-inner">
            <Music className="w-5 h-5 text-amber-900" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 text-sm truncate">{track.name}</div>
            <div className="text-xs text-slate-500 truncate">{track.artist}</div>
          </div>

          {/* Play/Pause */}
          <button
            data-testid="mini-player-toggle"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className="shrink-0 w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-105"
          >
            {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
          </button>

          {/* Move */}
          <button
            data-testid="mini-player-move"
            onClick={() => setPosition(position === "bottom" ? "top" : "bottom")}
            aria-label="Mover"
            title={position === "bottom" ? "Mover para o topo" : "Mover para o rodapé"}
            className="hidden sm:flex shrink-0 w-8 h-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 items-center justify-center"
          >
            {position === "bottom" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Collapse */}
          <button
            data-testid="mini-player-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir" : "Recolher"}
            className="hidden sm:flex shrink-0 w-8 h-8 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 items-center justify-center"
          >
            {collapsed ? <SkipForward className="w-4 h-4" /> : <SkipBack className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            data-testid="mini-player-close"
            onClick={closePlayer}
            aria-label="Fechar player"
            className="shrink-0 w-8 h-8 rounded-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {playerError && (
          <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
            {playerError}. Tente outra música da lista.
          </div>
        )}

        {!collapsed && !playerError && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 w-9 text-right">{fmtTime(currentTime)}</span>
            <button
              onClick={onProgressClick}
              className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden cursor-pointer group"
              aria-label="Progresso"
            >
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-200 group-hover:from-amber-500 group-hover:to-amber-700"
                style={{ width: `${progressPct}%` }}
              />
            </button>
            <span className="text-[10px] font-mono text-slate-500 w-9">{fmtTime(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
