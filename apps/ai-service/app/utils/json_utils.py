"""Small helpers for round-tripping JSON through LLM text output.

Real LLM completions occasionally wrap JSON in markdown fences or add a
stray sentence before/after it. These helpers make agent code resilient to
that without every agent re-implementing the same defensive parsing.
"""

from __future__ import annotations

import json
import re

_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)
_INPUT_JSON_RE = re.compile(r"INPUT_JSON:\s*(\{.*\})\s*\Z", re.DOTALL)


def safe_json_loads(text: str) -> dict:
    """Parse `text` as JSON, falling back to extracting the first {...} block."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = _JSON_OBJECT_RE.search(text)
        if not match:
            raise
        return json.loads(match.group(0))


def extract_input_json(prompt: str) -> dict:
    """Pull the structured `INPUT_JSON: {...}` payload back out of a prompt.

    Agent prompts are built as "<task description>\\n\\nINPUT_JSON:\\n<json>" so
    that a real LLM reads the whole prompt as natural language context, while
    MockLLMProvider can cheaply recover the structured fields it needs instead
    of doing actual NLP.
    """
    match = _INPUT_JSON_RE.search(prompt.strip())
    if not match:
        return {}
    return json.loads(match.group(1))
