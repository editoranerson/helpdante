from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import logging
import uuid
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from google import genai

# ---------------- Mongo ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------- App ----------------
app = FastAPI(title="Help, Querido Dante API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

# ---------------- Utils ----------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False

def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def require_admin(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        admin = await db.admin_users.find_one({"username": username}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin inválido")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ---------------- Models ----------------
class LoginBody(BaseModel):
    username: str
    password: str

class CredentialsUpdate(BaseModel):
    current_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None

class PortalConfig(BaseModel):
    book_site_url: str = "https://example.com"
    about_text: str = ""
    terms_text: str = ""
    footer_text: str = "Precisa falar com alguém agora? Ligue 188 (CVV - Gratuito e 24h) ou acesse cvv.org.br"

class Playlist(BaseModel):
    id: str = Field(default_factory=new_id)
    category: str
    song_name: str
    artist: str
    youtube_url: str

class Video(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    youtube_url: str

class ActionCard(BaseModel):
    id: str = Field(default_factory=new_id)
    kind: Literal["fazer", "nao_fazer"]
    icon: str = "Heart"
    title: str
    text: str

class EmergencyChannel(BaseModel):
    id: str = Field(default_factory=new_id)
    kind: Literal["preciso", "alguem"]
    name: str
    description: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""

class Psychologist(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    crp: str
    whatsapp: Optional[str] = ""
    instagram: Optional[str] = ""
    photo_url: Optional[str] = ""

class LawItem(BaseModel):
    id: str = Field(default_factory=new_id)
    kind: Literal["lei", "diretriz"]
    title: str
    description: str
    platform: Optional[str] = ""
    link: Optional[str] = ""

class DanteConfig(BaseModel):
    system_prompt: str = ""

class LeadCreate(BaseModel):
    name: str
    phone: str
    age: str

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    session_id: str
    lead_id: Optional[str] = None
    message: str

# ---------------- Auth Routes ----------------
@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.admin_users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    token = create_token(body.username)
    return {"token": token, "username": body.username}

@api.get("/auth/me")
async def me(username: str = Depends(require_admin)):
    return {"username": username}

@api.put("/auth/credentials")
async def update_credentials(body: CredentialsUpdate, username: str = Depends(require_admin)):
    user = await db.admin_users.find_one({"username": username})
    if not user or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    update = {}
    new_username = username
    if body.new_username and body.new_username != username:
        exists = await db.admin_users.find_one({"username": body.new_username})
        if exists:
            raise HTTPException(status_code=400, detail="Nome de usuário já existe")
        update["username"] = body.new_username
        new_username = body.new_username
    if body.new_password:
        update["password_hash"] = hash_password(body.new_password)
    if update:
        await db.admin_users.update_one({"username": username}, {"$set": update})
    return {"username": new_username, "token": create_token(new_username)}

# ---------------- Portal Config ----------------
@api.get("/portal-config")
async def get_portal_config():
    cfg = await db.portal_config.find_one({"_id": "singleton"}, {"_id": 0})
    if not cfg:
        return PortalConfig().model_dump()
    return cfg

@api.put("/portal-config")
async def update_portal_config(body: PortalConfig, _: str = Depends(require_admin)):
    await db.portal_config.update_one(
        {"_id": "singleton"},
        {"$set": body.model_dump()},
        upsert=True,
    )
    return body.model_dump()

# ---------------- Generic CRUD helpers ----------------
def build_crud(prefix: str, coll_name: str, model_cls, allow_public_get: bool = True):
    @api.get(f"/{prefix}")
    async def list_all():
        items = await db[coll_name].find({}, {"_id": 0}).to_list(2000)
        return items

    @api.post(f"/{prefix}")
    async def create(body: model_cls, _: str = Depends(require_admin)):
        doc = body.model_dump()
        doc["created_at"] = now_iso()
        await db[coll_name].insert_one(doc)
        doc.pop("_id", None)
        return doc

    @api.put(f"/{prefix}/{{item_id}}")
    async def update(item_id: str, body: model_cls, _: str = Depends(require_admin)):
        data = body.model_dump()
        data["id"] = item_id
        await db[coll_name].update_one({"id": item_id}, {"$set": data}, upsert=False)
        return data

    @api.delete(f"/{prefix}/{{item_id}}")
    async def delete(item_id: str, _: str = Depends(require_admin)):
        await db[coll_name].delete_one({"id": item_id})
        return {"ok": True}

    list_all.__name__ = f"list_{coll_name}"
    create.__name__ = f"create_{coll_name}"
    update.__name__ = f"update_{coll_name}"
    delete.__name__ = f"delete_{coll_name}"

build_crud("playlists", "playlists", Playlist)
build_crud("videos", "videos", Video)
build_crud("action-cards", "action_cards", ActionCard)
build_crud("emergency-channels", "emergency_channels", EmergencyChannel)
build_crud("psychologists", "psychologists", Psychologist)
build_crud("laws", "laws", LawItem)

# ---------------- Dante Config ----------------
DEFAULT_DANTE_PROMPT = """Você é Dante, um agente de Inteligência Artificial acolhedor do portal "Help, Querido Dante".

IMPORTANTE - Aviso Legal (mencione se relevante):
Você é uma IA e NÃO oferece apoio emocional real, nem substitui relacionamentos humanos ou acompanhamento profissional. Sempre oriente a pessoa a buscar ajuda humana (CVV 188, psicólogos, familiares, amigos).

Seu papel:
- Ouvir com empatia, sem julgamento
- Orientar sobre os recursos disponíveis no portal (canais de emergência, playlists, psicólogos, leis)
- Em qualquer sinal de risco iminente, oriente IMEDIATAMENTE a ligar 188 (CVV, gratuito e 24h) ou procurar uma emergência médica
- Nunca dê conselhos médicos ou psicológicos específicos
- Use linguagem gentil, respeitosa e em português do Brasil

Recursos do portal que você pode indicar:
- CVV: 188 (24h, gratuito) - cvv.org.br
- SAMU: 192 | Polícia: 190 | Bombeiros: 193
- Vitrine de psicólogos voluntários disponível no portal
- Playlists de músicas reflexivas e de esperança
- Leis e diretrizes sobre saúde mental

Se a pessoa estiver em crise, priorize acolher e direcionar para ajuda profissional imediata."""

@api.get("/dante-config")
async def get_dante_config(_: str = Depends(require_admin)):
    cfg = await db.dante_config.find_one({"_id": "singleton"}, {"_id": 0})
    if not cfg:
        return {"system_prompt": DEFAULT_DANTE_PROMPT}
    return cfg

@api.put("/dante-config")
async def update_dante_config(body: DanteConfig, _: str = Depends(require_admin)):
    await db.dante_config.update_one(
        {"_id": "singleton"},
        {"$set": body.model_dump()},
        upsert=True,
    )
    return body.model_dump()

# ---------------- Dante Chat ----------------
@api.post("/dante/lead")
async def create_lead(body: LeadCreate):
    lead = {
        "id": new_id(),
        "name": body.name.strip(),
        "phone": body.phone.strip(),
        "age": body.age.strip(),
        "created_at": now_iso(),
    }
    await db.dante_leads.insert_one(lead)
    lead.pop("_id", None)
    return lead

@api.get("/dante/leads")
async def list_leads(_: str = Depends(require_admin)):
    leads = await db.dante_leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return leads

@api.get("/dante/chats")
async def list_chats(_: str = Depends(require_admin)):
    chats = await db.dante_chats.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return chats

async def load_page_context() -> str:
    """Build a context string from all /suicidio content for Dante"""
    parts = []
    playlists = await db.playlists.find({}, {"_id": 0}).to_list(500)
    if playlists:
        parts.append("PLAYLISTS DISPONÍVEIS:")
        for p in playlists:
            parts.append(f"- [{p.get('category','')}] {p.get('song_name','')} — {p.get('artist','')} ({p.get('youtube_url','')})")
    videos = await db.videos.find({}, {"_id": 0}).to_list(200)
    if videos:
        parts.append("\nVÍDEOS (Kester Lima):")
        for v in videos:
            parts.append(f"- {v.get('title','')} ({v.get('youtube_url','')})")
    actions = await db.action_cards.find({}, {"_id": 0}).to_list(200)
    if actions:
        parts.append("\nCOMO AGIR:")
        for a in actions:
            k = "O QUE FAZER" if a.get("kind") == "fazer" else "O QUE NÃO FAZER"
            parts.append(f"- [{k}] {a.get('title','')}: {a.get('text','')}")
    emergencies = await db.emergency_channels.find({}, {"_id": 0}).to_list(200)
    if emergencies:
        parts.append("\nCANAIS DE EMERGÊNCIA:")
        for e in emergencies:
            k = "Preciso de ajuda" if e.get("kind") == "preciso" else "Alguém precisa de ajuda"
            info = " | ".join([x for x in [e.get('phone',''), e.get('whatsapp',''), e.get('email',''), e.get('website','')] if x])
            parts.append(f"- [{k}] {e.get('name','')} — {e.get('description','')} — {info}")
    psychs = await db.psychologists.find({}, {"_id": 0}).to_list(200)
    if psychs:
        parts.append("\nVITRINE DE PSICÓLOGOS (gratuita):")
        for p in psychs:
            parts.append(f"- {p.get('name','')} (CRP {p.get('crp','')}) — WhatsApp {p.get('whatsapp','')} — Instagram {p.get('instagram','')}")
    laws = await db.laws.find({}, {"_id": 0}).to_list(200)
    if laws:
        parts.append("\nLEIS E DIRETRIZES:")
        for lw in laws:
            k = "Lei" if lw.get("kind") == "lei" else "Diretriz"
            parts.append(f"- [{k}] {lw.get('title','')} — {lw.get('description','')} — {lw.get('platform','')} {lw.get('link','')}")
    return "\n".join(parts) if parts else "(Sem dados adicionais no portal ainda.)"

@api.post("/dante/chat")
async def dante_chat(body: ChatRequest):
    # Load system prompt
    cfg = await db.dante_config.find_one({"_id": "singleton"}, {"_id": 0})
    system_prompt = cfg["system_prompt"] if cfg else DEFAULT_DANTE_PROMPT

    # Enrich system prompt with portal data
    context = await load_page_context()
    full_system = f"{system_prompt}\n\n=== CONTEÚDO ATUAL DO PORTAL /suicidio ===\n{context}"

    # Load existing chat
    chat_doc = await db.dante_chats.find_one({"session_id": body.session_id}, {"_id": 0})
    messages: List[dict] = chat_doc["messages"] if chat_doc else []
    messages.append({"role": "user", "content": body.message})

    # Build API messages
    api_messages = [{"role": "system", "content": full_system}] + [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]

    xai_key = os.environ.get("XAI_API_KEY", "")
    xai_model = os.environ.get("XAI_MODEL", "grok-3-mini")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")

    reply = None
    last_error = None

    # Priority 1: Google Gemini AI Studio (direct)
    if gemini_key and reply is None:
        try:
            # Build Gemini format contents
            gemini_contents = []
            for m in messages:
                role = "user" if m["role"] == "user" else "model"
                gemini_contents.append({"role": role, "parts": [{"text": m["content"]}]})
            payload = {
                "contents": gemini_contents,
                "systemInstruction": {"parts": [{"text": full_system}]},
                "generationConfig": {"temperature": 0.7},
            }
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent"
            async with httpx.AsyncClient(timeout=45.0) as hc:
                resp = await hc.post(
                    url,
                    params={"key": gemini_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
            if resp.status_code < 400:
                data = resp.json()
                candidates = data.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    reply = "".join([p.get("text", "") for p in parts]).strip() or None
                if reply is None:
                    last_error = f"Gemini empty response: {str(data)[:200]}"
                    logging.warning(last_error)
            else:
                last_error = f"Gemini {resp.status_code}: {resp.text[:300]}"
                logging.warning(last_error)
        except Exception as e:
            last_error = f"Gemini exception: {e}"
            logging.warning(last_error)

    # Priority 2: xAI Grok (if key looks valid)
    if reply is None and xai_key.startswith("xai-") and len(xai_key) > 20:
        try:
            async with httpx.AsyncClient(timeout=45.0) as hc:
                resp = await hc.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {xai_key}", "Content-Type": "application/json"},
                    json={"model": xai_model, "messages": api_messages, "temperature": 0.7},
                )
            if resp.status_code < 400:
                reply = resp.json()["choices"][0]["message"]["content"]
            else:
                last_error = f"xAI {resp.status_code}: {resp.text[:200]}"
                logging.warning(last_error)
        except Exception as e:
            last_error = f"xAI exception: {e}"
            logging.warning(last_error)

    # Priority 3: Emergent Universal Key (fallback)
    if reply is None:
        emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
        provider = os.environ.get("LLM_PROVIDER", "openai")
        model = os.environ.get("LLM_MODEL", "gpt-5.4-mini")
        if not emergent_key:
            raise HTTPException(status_code=500, detail=f"Nenhum provider LLM configurado. {last_error or ''}")
        try:
            chat_llm = LlmChat(
                api_key=emergent_key,
                session_id=body.session_id,
                system_message=full_system,
            ).with_model(provider, model)
            resp = await chat_llm.send_message(UserMessage(text=body.message))
            reply = resp if isinstance(resp, str) else str(resp)
        except Exception as e:
            logging.exception("Fallback LLM error")
            raise HTTPException(status_code=502, detail=f"Erro no serviço Dante: {last_error or str(e)[:200]}")

    messages.append({"role": "assistant", "content": reply})

    await db.dante_chats.update_one(
        {"session_id": body.session_id},
        {"$set": {
            "session_id": body.session_id,
            "lead_id": body.lead_id,
            "messages": messages,
            "updated_at": now_iso(),
        }, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )

    return {"reply": reply}

# ---------------- Seed ----------------
async def seed_admin():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "dante@2026")
    existing = await db.admin_users.find_one({"username": username})
    if not existing:
        await db.admin_users.insert_one({
            "username": username,
            "password_hash": hash_password(password),
            "created_at": now_iso(),
        })

async def seed_examples():
    if await db.playlists.count_documents({}) == 0:
        await db.playlists.insert_many([
            {"id": new_id(), "category": "Reflexivas", "song_name": "Trem-Bala", "artist": "Ana Vilela", "youtube_url": "https://www.youtube.com/watch?v=EnYWKzp2PhU"},
            {"id": new_id(), "category": "Reflexivas", "song_name": "1930", "artist": "Charlie Brown Jr.", "youtube_url": "https://www.youtube.com/watch?v=g1SYRxN6D0k"},
            {"id": new_id(), "category": "Gospel / Esperança", "song_name": "Deus Cuida de Mim", "artist": "Kleber Lucas", "youtube_url": "https://www.youtube.com/watch?v=xr8j-o-Xf5A"},
            {"id": new_id(), "category": "Gospel / Esperança", "song_name": "Ninguém Explica Deus", "artist": "Preto no Branco", "youtube_url": "https://www.youtube.com/watch?v=w7iZk2mCiA0"},
        ])
    if await db.videos.count_documents({}) == 0:
        await db.videos.insert_many([
            {"id": new_id(), "title": "Kester Lima - Reflexão sobre a Vida", "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
            {"id": new_id(), "title": "Kester Lima - Você Importa", "youtube_url": "https://www.youtube.com/watch?v=ScMzIvxBSi4"},
        ])
    if await db.action_cards.count_documents({}) == 0:
        await db.action_cards.insert_many([
            {"id": new_id(), "kind": "fazer", "icon": "Ear", "title": "Ouvir com atenção", "text": "Escute sem interromper e sem julgar. Estar presente já é um enorme apoio."},
            {"id": new_id(), "kind": "fazer", "icon": "HandHeart", "title": "Levar a sério", "text": "Toda menção ao suicídio deve ser tratada com seriedade e cuidado."},
            {"id": new_id(), "kind": "fazer", "icon": "PhoneCall", "title": "Buscar ajuda profissional", "text": "Encoraje a pessoa a procurar um psicólogo, psiquiatra ou ligar para o CVV 188."},
            {"id": new_id(), "kind": "nao_fazer", "icon": "MessageSquareX", "title": "Não minimizar", "text": "Evite frases como 'isso é frescura' ou 'todo mundo passa por isso'."},
            {"id": new_id(), "kind": "nao_fazer", "icon": "ShieldOff", "title": "Não julgar", "text": "Julgamentos afastam a pessoa e podem piorar o sofrimento."},
            {"id": new_id(), "kind": "nao_fazer", "icon": "EyeOff", "title": "Não ignorar sinais", "text": "Mudanças de comportamento, isolamento e falas de despedida merecem atenção imediata."},
        ])
    if await db.emergency_channels.count_documents({}) == 0:
        await db.emergency_channels.insert_many([
            {"id": new_id(), "kind": "preciso", "name": "CVV - Centro de Valorização da Vida", "description": "Apoio emocional 24h, gratuito e sigiloso.", "phone": "188", "whatsapp": "", "email": "atendimento@cvv.org.br", "website": "https://cvv.org.br"},
            {"id": new_id(), "kind": "preciso", "name": "SAMU", "description": "Serviço de Atendimento Móvel de Urgência", "phone": "192", "whatsapp": "", "email": "", "website": ""},
            {"id": new_id(), "kind": "alguem", "name": "CAPS - Centro de Atenção Psicossocial", "description": "Atendimento em saúde mental pelo SUS, próximo à sua região.", "phone": "136", "whatsapp": "", "email": "", "website": "https://www.gov.br/saude"},
            {"id": new_id(), "kind": "alguem", "name": "Disque Direitos Humanos", "description": "Denúncias e orientação sobre direitos.", "phone": "100", "whatsapp": "", "email": "", "website": ""},
        ])
    if await db.psychologists.count_documents({}) == 0:
        await db.psychologists.insert_many([
            {"id": new_id(), "name": "Dra. Amanda Ribeiro", "crp": "06/123456", "whatsapp": "5511999990001", "instagram": "@dra.amandaribeiro", "photo_url": "https://images.unsplash.com/photo-1714976694756-28bf07af3758?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHw0fHxmcmllbmRseSUyMHBzeWNob2xvZ2lzdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4ODIwNTU4MXww&ixlib=rb-4.1.0&q=85"},
            {"id": new_id(), "name": "Dr. Bruno Martins", "crp": "01/654321", "whatsapp": "5511999990002", "instagram": "@dr.brunomartins", "photo_url": "https://images.unsplash.com/photo-1714976694810-85add1a29c96?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxmcmllbmRseSUyMHBzeWNob2xvZ2lzdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4ODIwNTU4MXww&ixlib=rb-4.1.0&q=85"},
        ])
    if await db.laws.count_documents({}) == 0:
        await db.laws.insert_many([
            {"id": new_id(), "kind": "lei", "title": "Lei 13.819/2019", "description": "Institui a Política Nacional de Prevenção da Automutilação e do Suicídio.", "platform": "", "link": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13819.htm"},
            {"id": new_id(), "kind": "diretriz", "title": "Diretrizes de conteúdo sensível", "description": "Regras e recursos de segurança para conteúdos sobre suicídio.", "platform": "Instagram", "link": "https://help.instagram.com/553490043118064"},
            {"id": new_id(), "kind": "diretriz", "title": "Recursos de bem-estar", "description": "Ferramentas de apoio ao usuário em risco.", "platform": "YouTube", "link": "https://support.google.com/youtube/answer/2802245"},
        ])
    if await db.portal_config.count_documents({}) == 0:
        await db.portal_config.insert_one({
            "_id": "singleton",
            **PortalConfig().model_dump(),
        })
    if await db.dante_config.count_documents({}) == 0:
        await db.dante_config.insert_one({
            "_id": "singleton",
            "system_prompt": DEFAULT_DANTE_PROMPT,
        })

@app.on_event("startup")
async def on_startup():
    await seed_admin()
    await seed_examples()
    # Write test credentials
    try:
        mem_dir = Path("/app/memory")
        mem_dir.mkdir(parents=True, exist_ok=True)
        (mem_dir / "test_credentials.md").write_text(
            "# Test Credentials\n\n"
            "## Admin\n"
            f"- URL: /admin\n"
            f"- Username: {os.environ.get('ADMIN_USERNAME','admin')}\n"
            f"- Password: {os.environ.get('ADMIN_PASSWORD','dante@2026')}\n\n"
            "## Auth endpoints\n"
            "- POST /api/auth/login\n"
            "- GET  /api/auth/me\n"
            "- PUT  /api/auth/credentials\n"
        )
    except Exception:
        pass

# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
