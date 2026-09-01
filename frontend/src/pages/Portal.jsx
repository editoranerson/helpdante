import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HeartHandshake, BookOpen, Lock } from "lucide-react";

export default function Portal() {
  const [cfg, setCfg] = useState({ book_site_url: "#", about_text: "", terms_text: "", footer_text: "" });

  useEffect(() => {
    api.get("/portal-config").then((r) => setCfg(r.data)).catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="font-display text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-500 bg-clip-text text-transparent">
          Help, Querido Dante
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-8 md:pt-16 pb-24">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Bem-vindo ao{" "}
          <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
            Help, Querido Dante
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-base md:text-lg text-slate-700 leading-relaxed">
          Um espaço seguro para você encontrar ajuda, apoio e respostas sem nenhum julgamento.
          Como podemos te apoiar hoje?
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/suicidio"
            data-testid="btn-prevention"
            className="group relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border border-amber-200 shadow-sm hover:shadow-2xl transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-300/40 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="rounded-2xl bg-amber-400/30 p-4 group-hover:bg-amber-400/50 transition-colors duration-300">
                <HeartHandshake className="w-9 h-9 text-amber-700 drop-shadow" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Setembro Amarelo</div>
                <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-amber-900">
                  Prevenção ao Suicídio e Apoio Emocional
                </h3>
                <p className="mt-3 text-sm md:text-base text-amber-900/80 leading-relaxed">
                  Recursos, canais de ajuda, playlists, psicólogos e informações para você ou alguém que precisa.
                </p>
              </div>
            </div>
          </Link>

          <a
            href={cfg.book_site_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="btn-book-site"
            className="group relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 border border-purple-200 shadow-sm hover:shadow-2xl transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-fuchsia-300/40 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="rounded-2xl bg-fuchsia-400/30 p-4 group-hover:bg-fuchsia-400/50 transition-colors duration-300">
                <BookOpen className="w-9 h-9 text-fuchsia-700 drop-shadow" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-fuchsia-700">Livro</div>
                <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-purple-900">
                  Ir para o Site Principal do Livro
                </h3>
                <p className="mt-3 text-sm md:text-base text-purple-900/80 leading-relaxed">
                  Conheça mais sobre a obra e a história por trás do projeto.
                </p>
              </div>
            </div>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/60 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p data-testid="footer-text" className="text-sm md:text-base text-slate-700 leading-relaxed max-w-3xl">
            {cfg.footer_text}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" data-testid="btn-about" className="rounded-full">Sobre</Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Sobre</DialogTitle></DialogHeader>
                <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                  {cfg.about_text || "Conteúdo em breve."}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" data-testid="btn-terms" className="rounded-full">Termos de Uso</Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Termos de Uso</DialogTitle></DialogHeader>
                <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                  {cfg.terms_text || "Conteúdo em breve."}
                </div>
              </DialogContent>
            </Dialog>
            <Link
              to="/admin"
              data-testid="btn-admin-login"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
