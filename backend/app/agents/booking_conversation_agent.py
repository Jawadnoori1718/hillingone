"""Agent 3: Booking Conversation Agent.

Multi-turn Gemini dialogue that processes a resident's natural language
conversation, asks clarifying questions, and extracts a structured booking
intent. Triggered when a resident's search is ambiguous or returns no results.
"""
import json
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import AgentRun
from app.config import settings


SYSTEM_PROMPT = """You are Atrium, Hillingdon Council's intelligent booking assistant.

Your role: understand a resident's needs through their conversation, then extract a structured booking intent.

Given a conversation thread, analyse ALL messages together and produce a structured JSON booking intent.

Always respond with ONLY this JSON (no other text):
{
  "intent_extracted": true,
  "location": "ward or area name, e.g. Hayes",
  "capacity": 25,
  "purpose": "brief description, e.g. weekly after-school club",
  "date_preference": "e.g. Tuesday evenings, or specific date",
  "accessibility_required": false,
  "kitchen_required": false,
  "summary": "1-sentence natural language description of what they need",
  "confidence": "high|medium|low",
  "missing_info": ["list of anything still unclear, empty if complete"]
}"""


class BookingConversationAgent:
    """Agent 3: Multi-turn booking dialogue using Gemini 2.5 Flash."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._client = None

    def _get_client(self):
        if self._client:
            return self._client
        if not settings.gemini_api_key or settings.gemini_api_key.startswith("paste_"):
            return None
        try:
            from google import genai
            self._client = genai.Client(api_key=settings.gemini_api_key)
            return self._client
        except ImportError:
            return None

    async def run(self, messages: list[dict] | None = None) -> dict:
        """Run the booking conversation agent on a message thread.

        messages: list of {"role": "user"|"assistant", "content": "..."}.
        If None, runs a realistic demo conversation.
        """
        if messages is None:
            messages = [
                {"role": "user", "content": "I run an after-school club for about 20 kids in Hayes"},
                {"role": "assistant", "content": "That sounds great! What day and time do you usually meet?"},
                {"role": "user", "content": "Every Tuesday from 4pm to 6pm"},
                {"role": "assistant", "content": "Do you need a kitchen, and is wheelchair access important?"},
                {"role": "user", "content": "Yes we cook snacks so kitchen is essential, and yes wheelchair access please"},
            ]

        steps = []

        # Log conversation turns as steps
        for i, msg in enumerate(messages):
            steps.append({
                "step": i + 1,
                "type": "tool_call" if msg["role"] == "user" else "tool_result",
                "tool": "dialogue_turn",
                "content": msg["content"],
                "timestamp": datetime.utcnow().isoformat(),
            })

        result = await self._extract_intent(messages, steps)

        run = AgentRun(
            id=uuid.uuid4(),
            agent_name="booking_conversation",
            goal=f"Extract booking intent from {len(messages)}-turn resident conversation",
            steps=steps,
            final_outcome="intent_extracted" if result.get("intent_extracted") else "incomplete",
        )
        self.db.add(run)
        await self.db.commit()

        return result

    async def _extract_intent(self, messages: list[dict], steps: list) -> dict:
        client = self._get_client()
        if client is None:
            return self._fallback(messages, steps)

        try:
            from google.genai import types

            # Build conversation transcript for the model
            transcript = "\n".join(
                f"{m['role'].upper()}: {m['content']}"
                for m in messages
            )

            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=f"Analyse this booking conversation and extract the intent:\n\n{transcript}",
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            intent = json.loads(response.text)
            steps.append({
                "step": len(messages) + 1,
                "type": "agent_thought",
                "content": f"Extracted intent: {intent.get('summary', '')}",
                "timestamp": datetime.utcnow().isoformat(),
            })
            return intent

        except Exception:
            return self._fallback(messages, steps)

    def _fallback(self, messages: list[dict], steps: list) -> dict:
        # Simple keyword extraction from conversation
        full_text = " ".join(m["content"].lower() for m in messages if m["role"] == "user")

        location = "Hayes"
        for ward in ["uxbridge", "hayes", "ruislip", "yiewsley", "hillingdon", "northwood", "ickenham"]:
            if ward in full_text:
                location = ward.title()
                break

        capacity = 20
        for word in full_text.split():
            if word.isdigit():
                n = int(word)
                if 2 <= n <= 500:
                    capacity = n
                    break

        kitchen = any(w in full_text for w in ["kitchen", "cook", "snack", "food", "catering"])
        accessibility = any(w in full_text for w in ["wheelchair", "accessible", "access", "disability"])

        intent = {
            "intent_extracted": True,
            "location": location,
            "capacity": capacity,
            "purpose": "community/group booking",
            "date_preference": "flexible",
            "accessibility_required": accessibility,
            "kitchen_required": kitchen,
            "summary": f"Space for {capacity} people in {location}" + (" with kitchen" if kitchen else "") + (" with wheelchair access" if accessibility else ""),
            "confidence": "medium",
            "missing_info": [],
        }

        steps.append({
            "step": len(messages) + 1,
            "type": "agent_thought",
            "content": f"Intent extracted (fallback): {intent['summary']}",
            "timestamp": datetime.utcnow().isoformat(),
        })
        return intent
