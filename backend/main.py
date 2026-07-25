import os
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client
from pydantic import BaseModel

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

app = FastAPI(title="Paballong Edu-Care API")

extra_origin = os.getenv("EXTRA_ALLOWED_ORIGIN")
origins = [extra_origin] if extra_origin else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Paballong Edu-Care API"}

@app.get("/health/db")
def db_check():
    return {"supabase_configured": bool(supabase_url and supabase_key)}


def get_current_staff(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        user_response = supabase.auth.get_user(token)
        user = user_response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
    if not profile_response.data:
        raise HTTPException(status_code=403, detail="Not recognized as staff")

    return profile_response.data[0]


def require_principal(staff: dict = Depends(get_current_staff)):
    if staff["role"] != "principal":
        raise HTTPException(status_code=403, detail="Principal access required")
    return staff


class CreateStaffRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str


@app.post("/staff")
def create_staff(payload: CreateStaffRequest, principal: dict = Depends(require_principal)):
    if payload.role not in ("teacher", "registrar", "principal"):
        raise HTTPException(status_code=400, detail="Role must be teacher, registrar, or principal")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    try:
        auth_response = supabase.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not create login: {str(e)}")

    new_user_id = auth_response.user.id

    supabase.table("profiles").insert({
        "id": new_user_id,
        "full_name": payload.full_name,
        "role": payload.role,
    }).execute()

    return {"status": "ok", "id": new_user_id, "role": payload.role}