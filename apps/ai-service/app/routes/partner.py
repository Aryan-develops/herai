from __future__ import annotations

import os
import re
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.agents.partner_guidance import PartnerGuidanceAgent
from app.config import settings
from app.llm.factory import get_llm_provider

router = APIRouter(prefix="/partner", tags=["partner"])

# Mirrors the gateway's filter: the model output is untrusted until it passes.
_BANNED = re.compile(
    r"diagnos|prescri|medicine|medication|dosage|\bpill\b|pregnan|guarantee|disorder|syndrome|PCOS|endometriosis|PMDD|\bcure\b",
    re.IGNORECASE,
)


class GuidanceRequest(BaseModel):
    phase: Literal["menstrual", "cramps", "follicular", "ovulation", "luteal", "pms"]
    mood: Literal["great", "good", "okay", "low", "irritable", "anxious", "sad"] | None = None
    language: Literal["en", "hi"] = "en"


def _valid(result: dict) -> bool:
    lists = [result.get("do"), result.get("say"), result.get("avoid")]
    if not all(isinstance(x, list) and 2 <= len(x) <= 4 and all(isinstance(t, str) and 0 < len(t) <= 240 for t in x) for x in lists):
        return False
    return not any(_BANNED.search(t) for x in lists for t in x)


@router.post("/guidance")
async def guidance(body: GuidanceRequest, x_internal_token: str | None = Header(default=None)):
    """Rewords partner tips for a (phase, mood, language). Only labels arrive here, never her data.

    The gateway is the only intended caller; when INTERNAL_API_TOKEN is set it must present it.
    """
    expected = os.getenv("INTERNAL_API_TOKEN")
    if expected and x_internal_token != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if settings.llm_provider == "mock":
        # The mock can't write real tips; the gateway falls back to its curated bank.
        raise HTTPException(status_code=501, detail="No language model configured")

    agent = PartnerGuidanceAgent(get_llm_provider())
    result = await agent.run({"phase": body.phase, "mood": body.mood, "language": body.language})
    if not isinstance(result, dict) or not _valid(result):
        raise HTTPException(status_code=502, detail="Model output failed the safety check")
    return {"do": result["do"], "say": result["say"], "avoid": result["avoid"]}
