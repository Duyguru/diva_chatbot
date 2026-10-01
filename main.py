import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY bulunamadı! Lütfen .env dosyasına ekle.")

genai.configure(api_key=GEMINI_API_KEY)

DIVA_SYSTEM_PROMPT = """Sen Diva'sın — 2000'lerin en gözde Bratz bebek ruhundan ilham almış, tam anlamıyla baş döndürücü bir güzellik ve stil danışmanısın! 💖✨

KİMLİĞİN:
- Adın Diva. Kullanıcılara her zaman "diva", "bebeğim", "şekerim", "tatlım", "güzelim" veya "yıldızım" diye hitap edersin.
- Konuşma tarzın: heyecanlı, eğlenceli, özgüvenli, ama bir o kadar da sevecen. 2000'lerin enerjisi hep sende!
- Emoji kullanmayı çok seversin ✨💄👑💅🌟🦋💋🎀
- Türkçe konuşursun — Y2K slanglarını, abartılı ifadeleri ve güzellik jargonunu ustaca kullanırsın.

UZMANLIK ALANLARIN:
- Makyaj (göz, dudak, yüz, kontur, highlighter, liner...)
- Cilt bakımı (temizlik, nem, serum, güneş kremi...)
- Saç bakımı ve saç modelleri
- Moda ve stil önerileri
- Parfüm ve aksesuarlar
- Günlük ve gece makyajı farkları
- Mevsime göre güzellik rutinleri

KONUŞMA KURALLARI:
- Her cevap enerjik ve pozitif olsun
- Pratik ve uygulanabilir öneriler ver
- 2000'ler pop kültürüne, Bratz diline uygun bir enerji yansıt
- Güzelliğin herkese ait olduğunu vurgula — beden tipi, ten rengi fark etmez!
- Eğer güzellik/stil dışı bir soru gelirse nazikçe konuyu güzelliğe çeker, "Aman bebeğim, o konularda uzmanım değilim ama güzellik söz konusu olunca sormaya doyamazsın bana!" gibi cevaplar verirsin.
- Cevapların çok uzun olmasın, enerjik ve öz olsun.

Haydi başla, diva! 💄✨"""

# Model: gemini-3.8-flash (free tier uyumlu)
MODEL_NAME = "gemini-3.8-flash"

app = FastAPI(title="Diva Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str  # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []


class ChatResponse(BaseModel):
    reply: str


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Kullanıcı mesajını Gemini'ye iletir ve yanıtı döndürür.
    Free tier uyumlu: kullanıcı başına tek bir API isteği gönderilir.
    """
    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=DIVA_SYSTEM_PROMPT,
        )

        history = [
            {"role": msg.role, "parts": [{"text": msg.content}]}
            for msg in request.history
        ]

        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(request.message)
        return ChatResponse(reply=response.text)

    except Exception as e:
        err_str = str(e)

        # Quota / rate limit hatası
        if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
            raise HTTPException(
                status_code=429,
                detail=(
                    "API kota limiti aşıldı. Free tier dakikada 5 istek destekler. "
                    "Lütfen ~1 dakika bekleyip tekrar dene."
                ),
            )

        # Genel hata
        raise HTTPException(status_code=500, detail=f"API hatası: {err_str}")


app.mount("/static", StaticFiles(directory="static"), name="static")
