from __future__ import annotations

from pydantic import BaseModel, Field


class Lifestyle(BaseModel):
    smoker: bool = False
    alcohol: str = "none"
    exerciseFrequency: str = "none"
    sleepHoursAvg: float | None = None


class HealthProfileIn(BaseModel):
    ageRange: str | None = None
    heightCm: float | None = None
    weightKg: float | None = None
    cycleLengthDays: int | None = None
    lastPeriodStart: str | None = None
    knownConditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    lifestyle: Lifestyle = Field(default_factory=Lifestyle)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    healthProfile: HealthProfileIn | None = None
    history: list[ChatMessage] = Field(default_factory=list)
