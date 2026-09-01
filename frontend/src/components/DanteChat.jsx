import { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ribbon, Send, X } from "lucide-react";
import { toast } from "sonner";

const LS_LEAD = "dante_lead";
const LS_SESSION = "dante_session";

function uid() { return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function DanteChat() {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_LEAD) || "null"); } catch { return null; }
  });
  const [form, setForm] = useState({ name: "", phone: "", age: "" });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    let s = localStorage.getItem(LS_SESSION);
    if (!s) { s = uid(); localStorage.setItem(LS_SESSION, s); }
    return s;
  });
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function submitLead(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.age.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    try {
      const { data } = await api.post("/dante/lead", form);
      localStorage.setItem(LS_LEAD, JSON.stringify(data));
      setLead(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  async function sendMessage(e) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/dante/chat", {
        session_id: sessionId,
        lead_id: lead?.id,
        message: text,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e));
      setMessages((m) => [...m, { role: "assistant", content: "Desculpe, não consegui responder agora. Se precisar de ajuda imediata, ligue 188 (CVV, gratuito e 24h)." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    // Shift+Enter envia; Enter simples faz quebra de linha
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          data-testid="btn-dante-open"
          onClick={() => setOpen(true)}
          aria-label="Abrir Dante"
          className="dante-trigger group fixed bottom-6 right-6 z-40 flex items-center justify-center transition-transform duration-300 hover:scale-105"
        >
          {/* Outer glow ring */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
          {/* Main circle with gradient */}
          <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500 shadow-2xl ring-4 ring-white/70 dante-float">
            {/* Inner soft highlight */}
            <span className="absolute top-1.5 left-2 w-4 h-4 rounded-full bg-white/50 blur-sm" />
            {/* Ribbon icon */}
            <Ribbon className="relative w-8 h-8 text-amber-900 drop-shadow-md" strokeWidth={2.4} />
            {/* Sparkle */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white shadow-md flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </span>
          </span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div data-testid="dante-modal" className="fixed inset-x-0 bottom-0 md:inset-auto md:bottom-6 md:right-6 z-50 md:w-[400px] md:h-[600px] h-[85vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-amber-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-950">
            <div className="flex items-center gap-2">
              <Ribbon className="w-6 h-6" />
              <div>
                <div className="font-display font-bold leading-tight">Dante — Help</div>
                <div className="text-xs opacity-80">Setembro Amarelo</div>
              </div>
            </div>
            <button data-testid="btn-dante-close" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-black/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!lead ? (
            /* Pre-chat form */
            <form onSubmit={submitLead} className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Ribbon className="w-7 h-7 text-amber-700" />
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-900">Antes de começar</h3>
                <p className="mt-1 text-sm text-slate-600">Precisamos de algumas informações rápidas.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Nome</label>
                <Input data-testid="input-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Telefone / WhatsApp</label>
                <Input data-testid="input-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Idade</label>
                <Input data-testid="input-age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="Ex: 25" className="mt-1" />
              </div>
              <Button data-testid="btn-lead-submit" type="submit" className="rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold">
                Iniciar conversa
              </Button>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seus dados são usados apenas para melhoria do atendimento do portal.
              </p>
            </form>
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-amber-50/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                      <Ribbon className="w-8 h-8 text-amber-700" />
                    </div>
                    <div className="font-display font-bold text-slate-800">Dante — Help</div>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-xs">
                      Dante-Help é um agente de Inteligência Artificial e não oferece apoio emocional
                      nem substitui relacionamentos humanos ou acompanhamento profissional.
                    </p>
                    <p className="mt-4 text-sm text-amber-800">Olá, {lead.name}! Como posso te apoiar hoje?</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-amber-500 text-amber-950 rounded-br-sm"
                            : "bg-white border border-amber-200 text-slate-800 rounded-bl-sm shadow-sm"
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-amber-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-amber-700 text-sm flex items-center gap-2">
                          <span className="dot-bounce"></span><span className="dot-bounce"></span><span className="dot-bounce"></span>
                          <span className="ml-1 italic text-amber-800">Dante está pensando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="border-t border-amber-200 bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    data-testid="input-dante-message"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva sua mensagem... (Enter = quebra de linha, Shift+Enter = enviar)"
                    rows={2}
                    className="flex-1 resize-none rounded-2xl border border-amber-200 focus:border-amber-400 focus:outline-none px-3 py-2 text-sm text-slate-800 bg-white"
                  />
                  <Button data-testid="btn-dante-send" type="submit" disabled={loading || !input.trim()}
                    className="rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 h-11 w-11 p-0 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
