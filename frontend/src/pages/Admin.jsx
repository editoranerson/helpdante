import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Save, Pencil, KeyRound } from "lucide-react";

const ICON_OPTIONS = ["Ear", "HandHeart", "PhoneCall", "MessageSquareX", "ShieldOff", "EyeOff", "Heart", "Shield", "Users", "Sun", "Moon", "Sparkles"];

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("admin_token"));

  useEffect(() => {
    if (authed) {
      api.get("/auth/me").catch(() => { localStorage.removeItem("admin_token"); setAuthed(false); });
    }
  }, [authed]);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { localStorage.removeItem("admin_token"); setAuthed(false); }} />;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      localStorage.setItem("admin_token", data.token);
      onLogin();
      toast.success("Bem-vindo!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 rounded-3xl bg-white shadow-xl">
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wider uppercase">Painel</div>
          <h1 className="mt-3 font-display text-3xl font-bold text-slate-900">Help, Querido Dante</h1>
          <p className="mt-1 text-sm text-slate-500">Acesso administrativo</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Usuário</Label>
            <Input data-testid="input-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input data-testid="input-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button data-testid="btn-login" type="submit" disabled={loading} className="w-full rounded-full bg-slate-900 hover:bg-slate-800">Entrar</Button>
        </form>
      </Card>
    </div>
  );
}

function Dashboard({ onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-purple-600 font-bold">Admin</div>
            <div className="font-display text-xl font-bold text-slate-900">Help, Querido Dante</div>
          </div>
          <div className="flex items-center gap-2">
            <CredentialsDialog />
            <Button data-testid="btn-logout" onClick={onLogout} variant="outline" className="rounded-full">
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <Tabs defaultValue="portal">
          <TabsList className="bg-white border border-slate-200 rounded-full p-1 h-auto">
            <TabsTrigger value="portal" data-testid="tab-portal" className="rounded-full px-6 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Portal (Início)</TabsTrigger>
            <TabsTrigger value="categorias" data-testid="tab-categorias" className="rounded-full px-6 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white">Categorias (Prevenção)</TabsTrigger>
          </TabsList>
          <TabsContent value="portal" className="mt-6"><PortalTab /></TabsContent>
          <TabsContent value="categorias" className="mt-6"><CategoriasTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CredentialsDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current_password: "", new_username: "", new_password: "" });

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/credentials", form);
      localStorage.setItem("admin_token", data.token);
      toast.success("Credenciais atualizadas!");
      setOpen(false);
      setForm({ current_password: "", new_username: "", new_password: "" });
    } catch (e) { toast.error(formatApiError(e)); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="btn-credentials" variant="outline" className="rounded-full">
          <KeyRound className="w-4 h-4 mr-2" /> Credenciais
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader><DialogTitle>Alterar credenciais</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Senha atual</Label><Input type="password" required value={form.current_password} onChange={(e) => setForm({...form, current_password: e.target.value})} /></div>
          <div><Label>Novo usuário (opcional)</Label><Input value={form.new_username} onChange={(e) => setForm({...form, new_username: e.target.value})} placeholder="Deixe vazio para manter" /></div>
          <div><Label>Nova senha (opcional)</Label><Input type="password" value={form.new_password} onChange={(e) => setForm({...form, new_password: e.target.value})} placeholder="Deixe vazio para manter" /></div>
          <Button type="submit" className="w-full rounded-full bg-slate-900 hover:bg-slate-800">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PortalTab() {
  const [cfg, setCfg] = useState({ book_site_url: "", about_text: "", terms_text: "", footer_text: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/portal-config").then((r) => setCfg(r.data)); }, []);

  async function save() {
    setLoading(true);
    try { await api.put("/portal-config", cfg); toast.success("Salvo!"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl bg-white">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Configurações do Portal</h3>
        <div className="space-y-4">
          <div><Label>URL do Site do Livro</Label><Input data-testid="input-book-url" value={cfg.book_site_url} onChange={(e) => setCfg({...cfg, book_site_url: e.target.value})} placeholder="https://..." /></div>
          <div><Label>Texto do rodapé (aviso)</Label><Textarea data-testid="input-footer" rows={3} value={cfg.footer_text} onChange={(e) => setCfg({...cfg, footer_text: e.target.value})} /></div>
          <div><Label>Página &quot;Sobre&quot;</Label><Textarea data-testid="input-about" rows={6} value={cfg.about_text} onChange={(e) => setCfg({...cfg, about_text: e.target.value})} /></div>
          <div><Label>Termos de Uso</Label><Textarea data-testid="input-terms" rows={6} value={cfg.terms_text} onChange={(e) => setCfg({...cfg, terms_text: e.target.value})} /></div>
          <Button data-testid="btn-save-portal" onClick={save} disabled={loading} className="rounded-full bg-slate-900 hover:bg-slate-800"><Save className="w-4 h-4 mr-2" /> Salvar</Button>
        </div>
      </Card>
    </div>
  );
}

function CategoriasTab() {
  return (
    <Tabs defaultValue="playlists" orientation="vertical" className="flex flex-col md:flex-row gap-6">
      <TabsList className="bg-white border border-slate-200 rounded-2xl p-2 h-auto flex md:flex-col gap-1 flex-wrap md:w-56 md:shrink-0">
        {[
          ["playlists","Playlists"],
          ["videos","Vídeos (Kester)"],
          ["actions","Como Agir"],
          ["channels","Canais"],
          ["psychs","Psicólogos"],
          ["laws","Leis/Diretrizes"],
          ["dante","Dante & Leads"],
        ].map(([v,l]) => (
          <TabsTrigger key={v} value={v} data-testid={`subtab-${v}`} className="w-full justify-start rounded-xl px-4 py-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900">{l}</TabsTrigger>
        ))}
      </TabsList>
      <div className="flex-1">
        <TabsContent value="playlists"><CrudSection kind="Playlist" endpoint="/playlists" fields={[
          {key:"category", label:"Categoria", placeholder:"Ex: Reflexivas"},
          {key:"song_name", label:"Nome da música"},
          {key:"artist", label:"Cantor"},
          {key:"youtube_url", label:"Link YouTube"},
        ]} title={(x) => `${x.song_name} — ${x.artist}`} subtitle={(x) => x.category} /></TabsContent>
        <TabsContent value="videos"><CrudSection kind="Vídeo" endpoint="/videos" fields={[
          {key:"title", label:"Título"}, {key:"youtube_url", label:"Link YouTube"},
        ]} title={(x) => x.title} subtitle={(x) => x.youtube_url} /></TabsContent>
        <TabsContent value="actions"><CrudSection kind="Card" endpoint="/action-cards" fields={[
          {key:"kind", label:"Tipo", type:"select", options:[["fazer","O que fazer"],["nao_fazer","O que NÃO fazer"]]},
          {key:"icon", label:"Ícone", type:"select", options: ICON_OPTIONS.map((i)=>[i,i])},
          {key:"title", label:"Título"},
          {key:"text", label:"Texto", type:"textarea"},
        ]} defaults={{kind:"fazer", icon:"Heart"}} title={(x) => x.title} subtitle={(x) => x.kind === "fazer" ? "O que fazer" : "O que NÃO fazer"} /></TabsContent>
        <TabsContent value="channels"><CrudSection kind="Canal" endpoint="/emergency-channels" fields={[
          {key:"kind", label:"Tipo", type:"select", options:[["preciso","Preciso de ajuda"],["alguem","Alguém precisa"]]},
          {key:"name", label:"Nome"},
          {key:"description", label:"Descrição", type:"textarea", optional:true},
          {key:"phone", label:"Telefone", optional:true},
          {key:"whatsapp", label:"WhatsApp", optional:true},
          {key:"email", label:"E-mail", optional:true},
          {key:"website", label:"Site", optional:true},
        ]} defaults={{kind:"preciso"}} title={(x) => x.name} subtitle={(x) => x.kind === "preciso" ? "Preciso de ajuda" : "Alguém precisa"} /></TabsContent>
        <TabsContent value="psychs"><CrudSection kind="Psicólogo" endpoint="/psychologists" fields={[
          {key:"name", label:"Nome"},
          {key:"crp", label:"CRP"},
          {key:"whatsapp", label:"WhatsApp", optional:true},
          {key:"instagram", label:"Instagram", optional:true},
          {key:"photo_url", label:"URL da foto", optional:true},
        ]} title={(x) => x.name} subtitle={(x) => `CRP ${x.crp}`} /></TabsContent>
        <TabsContent value="laws"><CrudSection kind="Lei/Diretriz" endpoint="/laws" fields={[
          {key:"kind", label:"Tipo", type:"select", options:[["lei","Lei"],["diretriz","Diretriz de Rede Social"]]},
          {key:"title", label:"Título"},
          {key:"description", label:"Descrição", type:"textarea"},
          {key:"platform", label:"Rede/App", optional:true},
          {key:"link", label:"Link oficial", optional:true},
        ]} defaults={{kind:"lei"}} title={(x) => x.title} subtitle={(x) => x.kind === "lei" ? "Lei" : `Diretriz — ${x.platform || ""}`} /></TabsContent>
        <TabsContent value="dante"><DanteAdmin /></TabsContent>
      </div>
    </Tabs>
  );
}

function CrudSection({ kind, endpoint, fields, title, subtitle, defaults = {} }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get(endpoint).then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  function openNew() {
    const init = { ...defaults };
    fields.forEach((f) => { if (!(f.key in init)) init[f.key] = ""; });
    setEditing(init);
    setOpen(true);
  }

  function openEdit(item) { setEditing({...item}); setOpen(true); }

  async function save() {
    try {
      if (editing.id) await api.put(`${endpoint}/${editing.id}`, editing);
      else await api.post(endpoint, editing);
      toast.success("Salvo!");
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e)); }
  }

  async function del(id) {
    if (!confirm("Confirma excluir?")) return;
    try { await api.delete(`${endpoint}/${id}`); toast.success("Removido"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  }

  return (
    <Card className="p-6 rounded-2xl bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-slate-900">{kind}s ({items.length})</h3>
        <Button data-testid={`btn-add-${kind}`} onClick={openNew} className="rounded-full bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{title(it)}</div>
              <div className="text-xs text-slate-500 truncate">{subtitle(it)}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => openEdit(it)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => del(it.id)} className="text-rose-600 hover:text-rose-700"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">Nenhum item ainda.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} — {kind}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}{f.optional && <span className="text-slate-400"> (opcional)</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea rows={4} value={editing[f.key] || ""} onChange={(e) => setEditing({...editing, [f.key]: e.target.value})} />
                  ) : f.type === "select" ? (
                    <Select value={editing[f.key] || ""} onValueChange={(v) => setEditing({...editing, [f.key]: v})}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {f.options.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={editing[f.key] || ""} onChange={(e) => setEditing({...editing, [f.key]: e.target.value})} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              <Button onClick={save} className="w-full rounded-full bg-slate-900 hover:bg-slate-800"><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DanteAdmin() {
  const [prompt, setPrompt] = useState("");
  const [leads, setLeads] = useState([]);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/dante-config").then((r) => setPrompt(r.data.system_prompt || ""));
    api.get("/dante/leads").then((r) => setLeads(r.data));
    api.get("/dante/chats").then((r) => setChats(r.data));
  }, []);

  async function savePrompt() {
    try { await api.put("/dante-config", { system_prompt: prompt }); toast.success("Prompt salvo!"); }
    catch (e) { toast.error(formatApiError(e)); }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 rounded-2xl bg-white">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Base de Conhecimento (Prompt do Dante)</h3>
        <p className="text-sm text-slate-500 mb-4">Este texto orienta o comportamento da IA. O conteúdo do portal (/suicidio) é anexado automaticamente.</p>
        <Textarea data-testid="input-dante-prompt" rows={12} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button data-testid="btn-save-dante-prompt" onClick={savePrompt} className="mt-3 rounded-full bg-slate-900 hover:bg-slate-800"><Save className="w-4 h-4 mr-2" /> Salvar prompt</Button>
      </Card>

      <Card className="p-6 rounded-2xl bg-white">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Leads coletados ({leads.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr><th className="py-2 pr-4">Nome</th><th className="py-2 pr-4">Telefone</th><th className="py-2 pr-4">Idade</th><th className="py-2">Data</th></tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-900">{l.name}</td>
                  <td className="py-2 pr-4">{l.phone}</td>
                  <td className="py-2 pr-4">{l.age}</td>
                  <td className="py-2 text-slate-500">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Nenhum lead ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl bg-white">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Histórico de conversas ({chats.length})</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 space-y-2 max-h-96 overflow-y-auto">
            {chats.map((c) => (
              <button key={c.session_id} onClick={() => setSelected(c)} className={`w-full text-left rounded-xl px-3 py-2 border ${selected?.session_id === c.session_id ? 'bg-purple-50 border-purple-300' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="text-xs text-slate-500 truncate">{c.session_id}</div>
                <div className="text-sm text-slate-700">{c.messages?.length || 0} mensagens</div>
                <div className="text-xs text-slate-400">{c.updated_at ? new Date(c.updated_at).toLocaleString('pt-BR') : ""}</div>
              </button>
            ))}
            {chats.length === 0 && <div className="text-sm text-slate-500">Sem conversas.</div>}
          </div>
          <div className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-4 max-h-96 overflow-y-auto">
            {!selected ? <div className="text-slate-500 text-sm">Selecione uma conversa.</div> : (
              <div className="space-y-2">
                {selected.messages?.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-purple-500 text-white" : "bg-white border"}`}>{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
