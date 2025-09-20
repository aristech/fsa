#!/usr/bin/env python3
"""
Local NLP Service for FSA Task Operations (enhanced Greek handling)
No external APIs, no costs, complete independence
"""

import re
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

# If your server isn't in Europe/Athens and you want consistent behavior,
# set a fixed offset here, or wire in pytz/zoneinfo if allowed.
LOCAL_NOW = lambda: datetime.now()  # replace with tz-aware now if needed

class Intent(Enum):
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    UNKNOWN = "unknown"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class EntityMatch:
    type: str
    value: str
    symbol: str
    start: int
    end: int

@dataclass
class TaskOperation:
    intent: Intent
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    assignees: List[str] = None
    work_order: Optional[str] = None
    project: Optional[str] = None
    client: Optional[str] = None
    due_date: Optional[str] = None
    start_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    entities: List[EntityMatch] = None
    confidence: float = 0.0

GREEK_WEEKDAYS = {
    0: ["δευτέρα", "δευτερα", "δευτερά", "δευτερη", "δευτερα"],
    1: ["τρίτη", "τριτη"],
    2: ["τετάρτη", "τεταρτη"],
    3: ["πέμπτη", "πεμπτη"],
    4: ["παρασκευή", "παρασκευη"],
    5: ["σάββατο", "σαββατο"],
    6: ["κυριακή", "κυριακη"],
}

GREEK_NUMBER_WORDS_1_12 = {
    "ένα":1, "ενa":1, "μια":1, "μία":1, "ενός":1, "ενός":1, "έναρξη":None,
    "δύο":2, "δυο":2,
    "τρία":3, "τρεις":3, "τρια":3,
    "τέσσερα":4, "τεσσερα":4,
    "πέντε":5, "πεντε":5,
    "έξι":6, "εξι":6,
    "επτά":7, "εφτά":7, "εφτα":7, "επτα":7,
    "οκτώ":8, "οκτω":8,
    "εννιά":9, "εννια":9,
    "δέκα":10, "δεκα":10,
    "έντεκα":11, "εντεκα":11,
    "δώδεκα":12, "δωδεκα":12,
}
# Keep only integers
GREEK_NUMBER_WORDS_1_12 = {k:v for k,v in GREEK_NUMBER_WORDS_1_12.items() if isinstance(v, int)}

def greek_word_to_hour(w: str) -> Optional[int]:
    return GREEK_NUMBER_WORDS_1_12.get(w.strip().lower())

def next_weekday_delta(target_weekday: int) -> int:
    today = LOCAL_NOW().weekday()
    d = (target_weekday - today) % 7
    return 7 if d == 0 else d

def find_weekday_days_ahead(text_lower: str) -> Optional[int]:
    for idx, variants in GREEK_WEEKDAYS.items():
        for v in variants:
            if re.search(rf'\b{re.escape(v)}\b', text_lower):
                # handle "την άλλη Δευτέρα" / "επόμενη Δευτέρα"
                if re.search(r'(την\s+άλλη|επόμενη)\s+', text_lower):
                    return next_weekday_delta(idx) + 7
                return next_weekday_delta(idx)
    return None

def clamp_time(hour: int, minute: int) -> Optional[dict]:
    if 0 <= hour <= 23 and 0 <= minute <= 59:
        return {"hour": hour, "minute": minute}
    return None

class LocalNLPProcessor:
    def __init__(self):
        # Expanded intent patterns (English + Greek)
        self.create_patterns = [
            # English
            r'\bcreate\s+(?:a\s+)?task\b',
            r'\badd\s+(?:a\s+)?task\b',
            r'\bnew\s+task\b',
            r'\bmake\s+(?:a\s+)?task\b',
            r'\bschedule\s+(?:a\s+)?task\b',
            # Greek (many forms, with/without "εργασία")
            r'\bδημιούργησε(?:\s+(?:μία|μια))?\s*(?:εργασία)?\b',
            r'\bφτιάξε(?:\s+(?:μία|μια))?\s*(?:εργασία)?\b',
            r'\bπρόσθεσε(?:\s+(?:μία|μια))?\s*(?:εργασία)?\b',
            r'\bκαταχώρισε(?:\s+(?:μία|μια))?\s*(?:εργασία)?\b',
            r'\bπρογραμμάτισε(?:\s+(?:μία|μια))?\s*(?:εργασία)?\b',
            r'\bνέα\s+εργασία\b',
            r'\bγράψε\s+εργασία\b',
        ]

        self.update_patterns = [
            # English
            r'\bupdate\s+task\b',
            r'\bmodify\s+task\b',
            r'\bchange\s+task\b',
            r'\bedit\s+task\b',
            # Task ID updates
            r'\bupdate\s+/\d+\b',
            r'\bmodify\s+/\d+\b',
            r'\bchange\s+/\d+\b',
            r'\bedit\s+/\d+\b',
            # Greek
            r'\bενημέρωση\s+εργασίας\b',
            r'\bτροποποίηση\s+εργασίας\b',
            r'\bαλλαγή\s+εργασίας\b',
            r'\bεπεξεργασία\s+εργασίας\b',
            r'\bδιόρθωσ[εη]\s+εργασία\b',
            r'\bάλλαξ[εη]\s+εργασία\b',
            r'\bενημέρωσε\s+την?\s+εργασία\b',
        ]

        self.priority_patterns = {
            Priority.URGENT: [
                r'\burgent\b', r'\basap\b', r'\bimmediately\b', r'\bcritical\b',
                r'\bεπείγον\b', r'\bάμεσα\b', r'\bκρίσιμο\b', r'\bεπειγόντως\b'
            ],
            Priority.HIGH: [
                r'\bhigh\s+priority\b', r'\bimportant\b', r'\bhigh\b',
                r'\bυψηλή\s+προτεραιότητα\b', r'\bσημαντικ[όη]\b', r'\bυψηλ[όή]\b'
            ],
            Priority.MEDIUM: [
                r'\bmedium\s+priority\b', r'\bnormal\b', r'\bmedium\b',
                r'\bμεσαία\s+προτεραιότητα\b', r'\bκανονικ[όή]\b', r'\bμεσαί[οα]\b'
            ],
            Priority.LOW: [
                r'\blow\s+priority\b', r'\blow\b', r'\bwhen\s+possible\b',
                r'\bχαμηλή\s+προτεραιότητα\b', r'\bχαμηλ[όή]\b', r'\bόταν\s+είναι\s+δυνατό\b'
            ],
        }

        # English relative/date words kept from your version; we’ll add Greek below dynamically.
        self.time_24h = re.compile(r'\b(\d{1,2}):(\d{2})\b')
        self.time_12h_ampm = re.compile(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b', re.IGNORECASE)
        self.time_12h_greek = re.compile(r'\b(\d{1,2})(?::(\d{2}))?\s*(?:πμ|μμ)\b', re.IGNORECASE)
        self.time_at_prefix = re.compile(r'\b(?:στις|στη|στο)\s+(\d{1,2})(?::(\d{2}))?\b', re.IGNORECASE)
        self.time_wordy = re.compile(r'\b((?:μία|μια|ένα|ενa|δύο|δυο|τρία|τρεις|τέσσερα|πέντε|έξι|επτά|εφτά|οκτώ|εννιά|δέκα|έντεκα|δώδεκα))\s+(?:η\s+)?ώρα\b', re.IGNORECASE)

        # Part-of-day modifiers (affect hour if ambiguous)
        self.part_of_day = [
            (r'\bξημερώματα\b', (0, 5)),
            (r'\bπρω[ίι]\b', (6, 11)),
            (r'\bμεσημέρι\b', (12, 14)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),  # keep once but multiple is harmless
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bαπόγευμα\b', (15, 18)),
            (r'\bβράδυ\b', (19, 22)),
        ]
        # Deduplicate pattern list (just in case)
        seen = set()
        dedup = []
        for p, rng in self.part_of_day:
            if p not in seen:
                dedup.append((p, rng))
                seen.add(p)
        self.part_of_day = dedup

        # Date expressions
        self.relatives = [
            (r'\bσήμερα\b', 0),
            (r'\bαύριο\b', 1),
            (r'\bαυριο\b', 1),
            (r'\bμεθαύριο\b', 2),
            (r'\bμεθαυριο\b', 2),
            (r'\bπαραμεθαύριο\b', 3),
            (r'\bπαραμεθαυριο\b', 3),
            (r'\bnext\s+week\b', 7),
            (r'\bεπόμενη\s+εβδομάδα\b', 7),
        ]
        self.explicit_eu_date = re.compile(
            r'\b(?P<d>\d{1,2})[\/\-](?P<m>\d{1,2})(?:[\/\-](?P<y>\d{4}))?\b'
        )

    def process(self, text: str) -> TaskOperation:
        text_lower = text.lower().strip()

        intent = self._detect_intent(text_lower)
        entities = self._extract_entities(text)
        title = self._extract_title(text, entities)

        description = self._extract_description(text)
        priority = self._extract_priority(text_lower)
        assignees = self._extract_assignees(entities)
        work_order = self._extract_work_order(entities)
        project = self._extract_project(entities)
        client = self._extract_client(entities)

        # Prefer a single unified date extractor that binds relative date + time
        due_iso = self._extract_datetime_iso(text_lower)
        # Start date: look for “από …” / “from …”
        start_iso = self._extract_datetime_iso(text_lower, start_keywords=True)

        estimated_hours = self._extract_hours(text_lower)

        confidence = self._calculate_confidence(text_lower, intent, entities)

        return TaskOperation(
            intent=intent,
            title=title,
            description=description,
            priority=priority,
            assignees=assignees,
            work_order=work_order,
            project=project,
            client=client,
            due_date=due_iso,
            start_date=start_iso,
            estimated_hours=estimated_hours,
            entities=entities,
            confidence=confidence
        )

    # ---------- Intent ----------

    def _detect_intent(self, text: str) -> Intent:
        # First check if we have a structured task entity with valid MongoDB ObjectId
        # This indicates an update operation regardless of keywords
        task_entity_match = re.search(r'task=\{([^}]+)\}', text)
        if task_entity_match:
            task_id = task_entity_match.group(1)
            # Check if it's a valid MongoDB ObjectId (24 hex chars)
            if re.match(r'^[0-9a-fA-F]{24}$', task_id):
                # Look for update-related keywords
                if any(re.search(pattern, text, re.IGNORECASE) for pattern in self.update_patterns):
                    return Intent.UPDATE_TASK
                # Even without explicit update keywords, if we have title/content changes with a valid task ID, assume update
                if re.search(r'\b(title|τίτλος|name|όνομα)\b', text, re.IGNORECASE):
                    return Intent.UPDATE_TASK
                # If we have an action verb near a task entity, consider it an update
                if re.search(r'\b(change|edit|modify|update|alter|ενημέρωσε|άλλαξε|τροποποίησε)\b', text, re.IGNORECASE):
                    return Intent.UPDATE_TASK

        # Check explicit create patterns
        for pattern in self.create_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return Intent.CREATE_TASK

        # Check explicit update patterns
        for pattern in self.update_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return Intent.UPDATE_TASK

        # Heuristic: task with contextual prepositions suggests creation
        if re.search(r'\btask\b', text) and any(w in text for w in ['for', 'in', 'with', 'about']):
            return Intent.CREATE_TASK

        # Greek heuristic: imperative verbs near domain markers (#, @, +, &, /)
        if re.search(r'(δημιούργησε|φτιάξε|πρόσθεσε|καταχώρισε|προγραμμάτισε)\b', text):
            return Intent.CREATE_TASK

        return Intent.UNKNOWN

    # ---------- Entities ----------

    def _extract_entities(self, text: str) -> List[EntityMatch]:
        entities = []

        # First, check for structured entity={id} format
        structured_pattern = r'(\w+)=\{([^}]+)\}'
        for m in re.finditer(structured_pattern, text):
            entity_type = m.group(1)
            entity_id = m.group(2)

            # Validate entity type
            valid_types = ['task', 'personnel', 'work_order', 'project', 'client']
            if entity_type in valid_types:
                entities.append(EntityMatch(
                    type=entity_type,
                    value=entity_id,
                    symbol='=',  # Special symbol for structured entities
                    start=m.start(),
                    end=m.end()
                ))

        # If no structured entities found, fall back to symbol-based patterns
        if not entities:
            patterns = {
                '@': r'@([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.\_]{0,60}?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|μέχρι|$)|$)',
                '#': r'#([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.\_]{0,60}?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
                '/': r'/([0-9]+)(?=\s|$)',
                '+': r'\+([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.\_]{0,60}?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
                '&': r'&([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.\_]{0,60}?)(?=\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
            }
            entity_types = {'@': 'personnel', '#': 'work_order', '/': 'task', '+': 'project', '&': 'client'}
            for symbol, pattern in patterns.items():
                for m in re.finditer(pattern, text):
                    entities.append(EntityMatch(
                        type=entity_types[symbol],
                        value=m.group(1).strip(),
                        symbol=symbol,
                        start=m.start(),
                        end=m.end()
                    ))

        return entities

    # ---------- Fields ----------

    def _extract_title(self, text: str, entities: List[EntityMatch]) -> str:
        # 1) Quoted string
        q = re.search(r'["“\'‘]([^"”\'’]+)["”\'’]', text)
        if q:
            return q.group(1).strip()

        # 2) Look for "with title" or "title is" patterns
        title_patterns = [
            r'with\s+title\s+(.+?)(?:\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
            r'title\s+is\s+(.+?)(?:\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
            r'title\s*:\s*(.+?)(?:\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',
            r'with\s+title\s+(.+?)$',  # Simple pattern for end of string
            r'title\s+is\s+(.+?)$',    # Simple pattern for end of string
            r'\btitle\s+(.+?)$',       # Simple "title" at end of string
            r'\btitle\s+(.+?)(?:\s+(?:for|in|with|due|at|from|by|από|για|σε|με|μέχρι|στις|στο|στη|έως|ως|$)|$)',  # "title" with context
        ]

        for pattern in title_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                # Clean up the title
                title = re.sub(r'\s+', ' ', title).strip()
                if len(title) > 2:
                    return title

        # 3) Remove entities
        clean = text
        for e in sorted(entities, key=lambda x: x.start, reverse=True):
            clean = clean[:e.start] + clean[e.end():]

        # 4) Strip date/time in both languages
        clean = self._strip_dates_times(clean)

        # 5) Strip common command words (EN/GR)
        stop = r'\b(create|add|new|make|schedule|task|title|for|in|with|about|due|at|on|from|by|a|an|the|' \
               r'δημιούργησε|πρόσθεσε|νέα|κάνε|προγραμμάτισε|φτιάξε|εργασία|για|σε|με|μέχρι|στις|στη|στο|' \
               r'έως|ως|από|τίτλος|καταχώρισε)\b'
        clean = re.sub(stop, ' ', clean, flags=re.IGNORECASE)

        # 6) Normalize whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()

        # 7) If meaningful short phrase remains, keep first 6 words
        if len(clean) > 2 and not re.fullmatch(r'\d+', clean):
            return ' '.join(clean.split()[:6])

        # 8) Fall back to first meaningful entity
        for e in entities:
            if e.type in ['work_order', 'project', 'client'] and len(e.value) > 2:
                return e.value

        return "New Task"

    def _strip_dates_times(self, s: str) -> str:
        patterns = [
            self.time_24h, self.time_12h_ampm, self.time_12h_greek, self.time_at_prefix, self.time_wordy,
            re.compile(r'\b(σήμερα|αύριο|αυριο|μεθαύριο|μεθαυριο|παραμεθαύριο|παραμεθαυριο|today|tomorrow|next\s+week|επόμενη\s+εβδομάδα)\b', re.IGNORECASE),
        ]
        # Part of day words
        for p, _ in self.part_of_day:
            s = re.sub(p, ' ', s, flags=re.IGNORECASE)
        # Weekdays
        wd_words = [w for vs in GREEK_WEEKDAYS.values() for w in vs]
        s = re.sub(r'\b(' + '|'.join(map(re.escape, wd_words)) + r')\b', ' ', s, flags=re.IGNORECASE)
        # Explicit dates
        s = re.sub(self.explicit_eu_date, ' ', s)

        for pat in patterns:
            s = re.sub(pat, ' ', s)
        s = re.sub(r'\b(?:η\s+)?ώρα\b', ' ', s, flags=re.IGNORECASE)
        s = re.sub(r'\s+', ' ', s).strip()
        return s

    def _extract_description(self, text: str) -> Optional[str]:
        m = re.search(r'(?:description|details?|notes?|περιγραφή|σημειώσεις?):\s*["“\'‘]?([^"”\'’]+)', text, re.IGNORECASE)
        return m.group(1).strip() if m else None

    def _extract_priority(self, text: str) -> Priority:
        for pr, pats in self.priority_patterns.items():
            for p in pats:
                if re.search(p, text, re.IGNORECASE):
                    return pr
        return Priority.MEDIUM

    def _extract_assignees(self, entities: List[EntityMatch]) -> List[str]:
        return [e.value for e in entities if e.type == 'personnel']

    def _extract_work_order(self, entities: List[EntityMatch]) -> Optional[str]:
        vals = [e.value for e in entities if e.type == 'work_order']
        return vals[0] if vals else None

    def _extract_project(self, entities: List[EntityMatch]) -> Optional[str]:
        vals = [e.value for e in entities if e.type == 'project']
        return vals[0] if vals else None

    def _extract_client(self, entities: List[EntityMatch]) -> Optional[str]:
        vals = [e.value for e in entities if e.type == 'client']
        return vals[0] if vals else None

    # ---------- Date/Time ----------

    def _extract_datetime_iso(self, text_lower: str, start_keywords: bool = False) -> Optional[str]:
        """
        Extract a single datetime combining relative/weekday/explicit date + time.
        If start_keywords=True, only consider phrases starting with from/από.
        """
        now = LOCAL_NOW()

        # 1) Scope text window if start keywords are required
        scope = text_lower
        if start_keywords:
            m = re.search(r'\b(?:from|από)\b(.*)$', text_lower)
            if not m:
                return None
            scope = m.group(1)

        # 2) Determine base date (relative or weekday or explicit)
        days_ahead = None
        for pat, delta in self.relatives:
            if re.search(pat, scope, re.IGNORECASE):
                days_ahead = delta
                break

        if days_ahead is None:
            days_ahead = find_weekday_days_ahead(scope)

        base_dt = None
        if days_ahead is not None:
            base_dt = now + timedelta(days=days_ahead)
        else:
            # explicit EU date dd/mm(/yyyy) or dd-mm(-yyyy)
            dm = self.explicit_eu_date.search(scope)
            if dm:
                d = int(dm.group('d'))
                m = int(dm.group('m'))
                y = int(dm.group('y')) if dm.group('y') else now.year
                try:
                    base_dt = datetime(y, m, d, now.hour, now.minute, now.second, now.microsecond)
                except ValueError:
                    base_dt = None

        # If still no date keyword found, but time exists, assume today
        extracted_time = self._extract_time(scope)
        if base_dt is None and extracted_time:
            base_dt = now

        if base_dt is None:
            return None

        # 3) Apply time (if any); if time ambiguous and part-of-day present, coerce hour range
        if extracted_time:
            base_dt = base_dt.replace(hour=extracted_time['hour'], minute=extracted_time['minute'], second=0, microsecond=0)
        else:
            # If scope contains part-of-day, set representative hour
            pod_hour = self._infer_part_of_day_hour(scope)
            if pod_hour is not None:
                base_dt = base_dt.replace(hour=pod_hour, minute=0, second=0, microsecond=0)

        return base_dt.isoformat()

    def _infer_part_of_day_hour(self, text: str) -> Optional[int]:
        for pat, (h_start, h_end) in self.part_of_day:
            if re.search(pat, text, re.IGNORECASE):
                # pick a central hour in the range
                return (h_start + h_end) // 2
        return None

    def _extract_time(self, text: str) -> Optional[dict]:
        # 1) 12h with am/pm
        m = self.time_12h_ampm.search(text)
        if m:
            h = int(m.group(1))
            minute = int(m.group(2)) if m.group(2) else 0
            period = m.group(3).lower()
            if h == 12 and period == 'am':
                h = 0
            elif period == 'pm' and h != 12:
                h += 12
            return clamp_time(h, minute)

        # 2) Greek πμ/μμ
        m = self.time_12h_greek.search(text)
        if m:
            h = int(m.group(1))
            minute = int(m.group(2)) if m.group(2) else 0
            # πμ = am, μμ = pm
            # detect token
            token = m.group(0).lower()
            if 'πμ' in token:
                if h == 12:
                    h = 0
            elif 'μμ' in token:
                if h != 12:
                    h += 12
            return clamp_time(h, minute)

        # 3) "στις 10" / "στη 1:30"
        m = self.time_at_prefix.search(text)
        if m:
            h = int(m.group(1))
            minute = int(m.group(2)) if m.group(2) else 0
            # adjust with part-of-day if present
            pod_adj = self._apply_part_of_day_heuristic(text, h)
            return clamp_time(pod_adj['hour'], minute) if pod_adj else clamp_time(h, minute)

        # 4) "10 η ώρα", "δέκα η ώρα"
        m = self.time_wordy.search(text)
        if m:
            word = m.group(1)
            h = greek_word_to_hour(word)
            if h is not None:
                pod_adj = self._apply_part_of_day_heuristic(text, h)
                return clamp_time(pod_adj['hour'], 0) if pod_adj else clamp_time(h, 0)

        # 5) 24h "15:30"
        m = self.time_24h.search(text)
        if m:
            h = int(m.group(1))
            minute = int(m.group(2))
            return clamp_time(h, minute)

        return None

    def _apply_part_of_day_heuristic(self, text: str, hour_12: int) -> Optional[dict]:
        """
        If an hour like 10 is found and part-of-day suggests evening, map 10->22, etc.
        Only applies when 1<=hour<=12 and no explicit am/pm token found.
        """
        if not (1 <= hour_12 <= 12):
            return None
        # detect part-of-day
        for pat, (start, end) in self.part_of_day:
            if re.search(pat, text, re.IGNORECASE):
                # evening -> make post-meridiem if reasonable
                # simple rule: if start >= 12 and hour_12 < 12, add 12
                if start >= 12 and hour_12 < 12:
                    return {"hour": hour_12 + 12, "minute": 0}
                # morning -> keep as is (am)
                return {"hour": hour_12, "minute": 0}
        return None

    def _extract_hours(self, text: str) -> Optional[float]:
        # EN + GR: “8 hours”, “8h”, “8 ώρες”, “8 ω”
        m = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|ώρες?|ω)\b', text, re.IGNORECASE)
        return float(m.group(1)) if m else None

    # ---------- Confidence ----------

    def _calculate_confidence(self, text: str, intent: Intent, entities: List[EntityMatch]) -> float:
        conf = 0.0
        if intent != Intent.UNKNOWN:
            conf += 0.45
        conf += min(0.35, len(entities) * 0.12)
        if re.search(r'\btask\b', text) or re.search(r'\bεργασία\b', text):
            conf += 0.12
        if re.search(r'(create|add|make|schedule|update|modify|δημιούργησε|πρόσθεσε|φτιάξε|προγραμμάτισε|ενημέρωσε)', text):
            conf += 0.08
        return min(1.0, conf)

def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <text>")
        sys.exit(1)

    text = ' '.join(sys.argv[1:])
    processor = LocalNLPProcessor()
    result = processor.process(text)

    output = {
        'intent': result.intent.value,
        'title': result.title,
        'description': result.description,
        'priority': result.priority.value,
        'assignees': result.assignees or [],
        'work_order': result.work_order,
        'project': result.project,
        'client': result.client,
        'due_date': result.due_date,
        'start_date': result.start_date,
        'estimated_hours': result.estimated_hours,
        'entities': [
            {'type': e.type, 'value': e.value, 'symbol': e.symbol}
            for e in (result.entities or [])
        ],
        'confidence': result.confidence
    }
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
