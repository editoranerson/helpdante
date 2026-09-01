import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, quickExit } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X, ArrowLeft, Music, Play, Pause, Ear, HandHeart, PhoneCall, MessageSquareX, ShieldOff, EyeOff,
  Heart, Instagram, Mail, Globe, Phone, MessageCircle, Scale, BookMarked, ExternalLink
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useMiniPlayer, extractYouTubeId } from "@/lib/miniPlayer";
import DanteChat from "@/components/DanteChat";

const iconFor = (name) => {
  const C = LucideIcons[name] || Heart;
  return C;
};

function ytEmbed(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

export default function Suicidio() {
  const [playlists, setPlaylists] = useState([]);
  const [videos, setVideos] = useState([]);
  const [actionCards, setActionCards] = useState([]);
  const [channels, setChannels] = useState([]);
  const [psychs, setPsychs] = useState([]);
  const [laws, setLaws] = useState([]);
  const [lawFilter, setLawFilter] = useState("todos");

  useEffect(() => {
    Promise.all([
      api.get("/playlists"),
      api.get("/videos"),
      api.get("/action-cards"),
      api.get("/emergency-channels"),
      api.get("/psychologists"),
      api.get("/laws"),
    ]).then(([p, v, a, c, ps, l]) => {
      setPlaylists(p.data); setVideos(v.data); setActionCards(a.data);
      setChannels(c.data); setPsychs(ps.data); setLaws(l.data);
    }).catch(() => {});
  }, []);

  const playlistCats = useMemo(() => {
    const grouped = {};
    playlists.forEach((s) => { (grouped[s.category] ||= []).push(s); });
    return grouped;
  }, [playlists]);

  const filteredLaws = laws.filter((l) => lawFilter === "todos" || l.kind === lawFilter);

  const fazer = actionCards.filter((c) => c.kind === "fazer");
  const naoFazer = actionCards.filter((c) => c.kind === "nao_fazer");
  const preciso = channels.filter((c) => c.kind === "preciso");
  const alguem = channels.filter((c) => c.kind === "alguem");

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-amber-50 to-yellow-100 text-amber-950">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-yellow-50/70 border-b border-amber-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <Link to="/" data-testid="btn-back-portal" className="inline-flex items-center gap-2 text-amber-900 hover:text-amber-700 font-semibold">
            <ArrowLeft className="w-5 h-5" /> Portal
          </Link>
          <button
            data-testid="btn-quick-exit"
            onClick={quickExit}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold shadow-lg"
          >
            Saída Rápida <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/60 border border-amber-300 px-4 py-1.5 text-xs font-bold text-amber-800 tracking-wider">
            💛 SETEMBRO AMARELO
          </div>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-amber-950 leading-tight">
            Você não está sozinho.
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-amber-900/80 leading-relaxed">
            Este é um espaço de escuta, informação e cuidado. Respire. Você chegou até aqui — e isso já é um passo enorme.
          </p>
        </div>
      </section>

      {/* Sobre */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pb-10">
        <Card className="relative overflow-hidden p-8 md:p-12 rounded-3xl bg-white border-amber-200 shadow-lg">
          <div className="absolute -top-10 -right-10 w-56 h-56 bg-amber-200/50 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <Heart className="w-4 h-4" /> Sobre o Suicídio
            </div>
            <p className="mt-4 text-2xl md:text-3xl font-display font-bold text-amber-950 leading-snug">
              A cada 40 segundos, uma pessoa tira a própria vida no mundo.
            </p>
            <p className="mt-4 text-amber-900/80 leading-relaxed max-w-3xl">
              Falar sobre suicídio de forma responsável salva vidas. Escutar, acolher e orientar para
              ajuda profissional são passos concretos que podemos dar juntos.
            </p>
          </div>
        </Card>
      </section>

      {/* Playlists */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <SectionTitle icon={Music} title="Playlist" subtitle="Músicas que abraçam" />
        <div className="mt-8 space-y-8">
          {Object.entries(playlistCats).map(([cat, songs]) => (
            <div key={cat}>
              <h3 className="font-display text-xl md:text-2xl font-bold text-amber-900 mb-4">{cat}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {songs.map((s) => (
                  <SongCard key={s.id} song={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vídeos */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <SectionTitle icon={BookMarked} title="Citação — Kester Lima" subtitle="Reflexões em vídeo" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {videos.map((v) => (
            <div key={v.id} data-testid={`video-${v.id}`} className="rounded-2xl overflow-hidden bg-white border border-amber-200 shadow-sm">
              <div className="aspect-video bg-black">
                <iframe
                  className="w-full h-full"
                  src={ytEmbed(v.youtube_url)}
                  title={v.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <div className="p-4 font-semibold text-amber-950">{v.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Como Agir */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <SectionTitle icon={HandHeart} title="Como Agir" subtitle="Um guia gentil" />
        <Tabs defaultValue="fazer" className="mt-6">
          <TabsList className="bg-white rounded-full p-1 border border-amber-200 h-auto">
            <TabsTrigger value="fazer" data-testid="tab-fazer" className="rounded-full px-5 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 font-semibold">
              O que fazer
            </TabsTrigger>
            <TabsTrigger value="nao-fazer" data-testid="tab-nao-fazer" className="rounded-full px-5 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 font-semibold">
              O que NÃO fazer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="fazer">
            <ActionGrid cards={fazer} tone="fazer" />
          </TabsContent>
          <TabsContent value="nao-fazer">
            <ActionGrid cards={naoFazer} tone="nao" />
          </TabsContent>
        </Tabs>
      </section>

      {/* Canais de Emergência */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <SectionTitle icon={PhoneCall} title="Canais de Emergência" subtitle="Ajuda imediata" />
        <Tabs defaultValue="preciso" className="mt-6">
          <TabsList className="bg-white rounded-full p-1 border border-amber-200 h-auto">
            <TabsTrigger value="preciso" data-testid="tab-preciso" className="rounded-full px-5 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 font-semibold">
              Preciso de ajuda
            </TabsTrigger>
            <TabsTrigger value="alguem" data-testid="tab-alguem" className="rounded-full px-5 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-950 font-semibold">
              Alguém precisa de ajuda
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preciso"><ChannelGrid items={preciso} /></TabsContent>
          <TabsContent value="alguem"><ChannelGrid items={alguem} /></TabsContent>
        </Tabs>
      </section>

      {/* Psicólogos */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <SectionTitle icon={Heart} title="Vitrine de Psicólogos" subtitle="Profissionais voluntários" />
        <div className="mt-4 rounded-xl bg-amber-100/70 border border-amber-300 px-4 py-3 text-sm text-amber-900 leading-relaxed">
          <strong>Aviso:</strong> Esta vitrine é gratuita. O portal apenas divulga profissionais voluntários — o contato e a decisão sobre atendimento são de responsabilidade das partes envolvidas.
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {psychs.map((p) => (
            <Card key={p.id} data-testid={`psych-${p.id}`} className="p-0 overflow-hidden rounded-3xl bg-white border-amber-200 shadow-sm hover:shadow-xl transition-transform duration-200 hover:-translate-y-1">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-amber-500" />
                </div>
              )}
              <div className="p-6">
                <div className="font-display text-xl font-bold text-amber-950">{p.name}</div>
                <div className="text-sm text-amber-800/70 mt-1">CRP {p.crp}</div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {p.whatsapp && (
                    <a href={`https://wa.me/${p.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  {p.instagram && (
                    <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white px-3 py-1.5 text-sm font-semibold">
                      <Instagram className="w-4 h-4" /> Instagram
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Leis */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-10 pb-24">
        <SectionTitle icon={Scale} title="Leis e Diretrizes" subtitle="Conheça seus direitos" />
        <div className="mt-6 flex gap-2 flex-wrap">
          {["todos", "lei", "diretriz"].map((f) => (
            <Button key={f} data-testid={`filter-${f}`}
              variant={lawFilter === f ? "default" : "outline"}
              onClick={() => setLawFilter(f)}
              className={`rounded-full ${lawFilter === f ? 'bg-amber-500 hover:bg-amber-600 text-amber-950' : 'border-amber-300 text-amber-900 hover:bg-amber-100'}`}>
              {f === "todos" ? "Todos" : f === "lei" ? "Leis" : "Diretrizes de Rede"}
            </Button>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredLaws.map((l) => (
            <Card key={l.id} data-testid={`law-${l.id}`} className="p-6 rounded-2xl bg-white border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${l.kind === 'lei' ? 'bg-blue-100 text-blue-800' : 'bg-fuchsia-100 text-fuchsia-800'}`}>
                  {l.kind === "lei" ? "Lei" : "Diretriz"}
                </span>
                {l.platform && <span className="text-xs text-amber-800/70">• {l.platform}</span>}
              </div>
              <h4 className="font-display text-lg font-bold text-amber-950">{l.title}</h4>
              <p className="mt-2 text-amber-900/80 text-sm leading-relaxed">{l.description}</p>
              {l.link && (
                <a href={l.link} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 text-sm font-semibold">
                  Acessar <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>
      <DanteChat />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-amber-700 font-semibold text-sm">
        <Icon className="w-4 h-4" /> {subtitle}
      </div>
      <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold text-amber-950">{title}</h2>
    </div>
  );
}

function SongCard({ song }) {
  const { playTrack, togglePlay, isCurrent, isPlaying, ready } = useMiniPlayer();
  const videoId = extractYouTubeId(song.youtube_url);
  const active = videoId && isCurrent(videoId);
  const playing = active && isPlaying;

  function handleClick() {
    if (!videoId) return;
    if (active) {
      togglePlay();
    } else {
      playTrack({ videoId, name: song.song_name, artist: song.artist });
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!videoId || !ready}
      data-testid={`playlist-song-${song.id}`}
      className={`group text-left flex items-center gap-4 rounded-2xl p-4 border shadow-sm hover:shadow-lg transition-transform duration-200 hover:-translate-y-0.5 w-full disabled:opacity-60 ${active ? "bg-amber-100 border-amber-400" : "bg-white border-amber-200 hover:border-amber-400"}`}
    >
      <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 group-hover:bg-amber-200"}`}>
        {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-amber-950 truncate">{song.song_name}</div>
        <div className="text-sm text-amber-800/70 truncate">{song.artist}</div>
      </div>
      {active && (
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 shrink-0">
          {playing ? "Tocando" : "Pausado"}
        </div>
      )}
    </button>
  );
}

function ActionGrid({ cards, tone }) {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const Icon = iconFor(c.icon);
        const isDo = tone === "fazer";
        return (
          <Card key={c.id} data-testid={`action-${c.id}`} className={`p-6 rounded-3xl bg-white border ${isDo ? 'border-emerald-200' : 'border-rose-200'} shadow-sm hover:shadow-lg transition-transform duration-200 hover:-translate-y-1`}>
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${isDo ? 'bg-emerald-100' : 'bg-rose-100'} shadow-inner`}>
              <Icon className={`w-7 h-7 ${isDo ? 'text-emerald-700' : 'text-rose-700'} drop-shadow`} />
            </div>
            <h4 className="mt-4 font-display text-xl font-bold text-amber-950">{c.title}</h4>
            <p className="mt-2 text-amber-900/80 text-sm leading-relaxed">{c.text}</p>
          </Card>
        );
      })}
    </div>
  );
}

function ChannelGrid({ items }) {
  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      {items.map((c) => (
        <Card key={c.id} data-testid={`channel-${c.id}`} className="p-6 rounded-3xl bg-white border-amber-200 shadow-sm">
          <div className="font-display text-xl font-bold text-amber-950">{c.name}</div>
          {c.description && <p className="mt-2 text-amber-900/80 text-sm leading-relaxed">{c.description}</p>}
          <div className="mt-4 space-y-2 text-sm">
            {c.phone && <div className="flex items-center gap-2 text-amber-900"><Phone className="w-4 h-4 text-amber-700" /> {c.phone}</div>}
            {c.whatsapp && <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-700 hover:text-emerald-900"><MessageCircle className="w-4 h-4" /> {c.whatsapp}</a>}
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-amber-800 hover:text-amber-900"><Mail className="w-4 h-4" /> {c.email}</a>}
            {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-amber-800 hover:text-amber-900"><Globe className="w-4 h-4" /> {c.website}</a>}
          </div>
        </Card>
      ))}
    </div>
  );
}
