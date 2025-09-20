#!/usr/bin/env python3
"""
Local NLP Service for FSA Task Operations
No external APIs, no costs, complete independence
"""

import re
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

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

class LocalNLPProcessor:
    def __init__(self):
        # Intent patterns for task creation (English + Greek)
        self.create_patterns = [
            # English patterns
            r'create\s+(?:a\s+)?task',
            r'add\s+(?:a\s+)?task',
            r'new\s+task',
            r'make\s+(?:a\s+)?task',
            r'schedule\s+(?:a\s+)?task',
            # Greek patterns
            r'δημιούργησε\s+(?:μία\s+|μια\s+)?εργασία',
            r'προσθήκη\s+(?:μίας\s+|μιας\s+)?εργασίας',
            r'νέα\s+εργασία',
            r'κάνε\s+(?:μία\s+|μια\s+)?εργασία',
            r'προγραμμάτισε\s+(?:μία\s+|μια\s+)?εργασία',
            r'φτιάξε\s+(?:μία\s+|μια\s+)?εργασία',
        ]

        # Intent patterns for task updates (English + Greek)
        self.update_patterns = [
            # English patterns
            r'update\s+task',
            r'modify\s+task',
            r'change\s+task',
            r'edit\s+task',
            # Greek patterns
            r'ενημέρωση\s+εργασίας',
            r'τροποποίηση\s+εργασίας',
            r'αλλαγή\s+εργασίας',
            r'επεξεργασία\s+εργασίας',
        ]

        # Priority patterns (English + Greek)
        self.priority_patterns = {
            Priority.URGENT: [
                # English
                r'urgent', r'asap', r'immediately', r'critical',
                # Greek
                r'επείγον', r'άμεσα', r'κρίσιμο', r'επειγόντως'
            ],
            Priority.HIGH: [
                # English
                r'high\s+priority', r'important', r'high',
                # Greek
                r'υψηλή\s+προτεραιότητα', r'σημαντικό', r'υψηλό'
            ],
            Priority.MEDIUM: [
                # English
                r'medium\s+priority', r'normal', r'medium',
                # Greek
                r'μεσαία\s+προτεραιότητα', r'κανονικό', r'μεσαίο'
            ],
            Priority.LOW: [
                # English
                r'low\s+priority', r'low', r'when\s+possible',
                # Greek
                r'χαμηλή\s+προτεραιότητα', r'χαμηλό', r'όταν\s+είναι\s+δυνατό'
            ],
        }

        # Date patterns (English + Greek)
        self.date_patterns = {
            # English
            'today': 0,
            'tomorrow': 1,
            'monday': self._get_next_weekday(0),
            'tuesday': self._get_next_weekday(1),
            'wednesday': self._get_next_weekday(2),
            'thursday': self._get_next_weekday(3),
            'friday': self._get_next_weekday(4),
            'saturday': self._get_next_weekday(5),
            'sunday': self._get_next_weekday(6),
            'next week': 7,
            'next monday': 7 + self._get_next_weekday(0),
            # Greek
            'σήμερα': 0,
            'αύριο': 1,
            'δευτέρα': self._get_next_weekday(0),
            'τρίτη': self._get_next_weekday(1),
            'τετάρτη': self._get_next_weekday(2),
            'πέμπτη': self._get_next_weekday(3),
            'παρασκευή': self._get_next_weekday(4),
            'σάββατο': self._get_next_weekday(5),
            'κυριακή': self._get_next_weekday(6),
            'επόμενη εβδομάδα': 7,
            'επόμενη δευτέρα': 7 + self._get_next_weekday(0),
        }

        # Time patterns for parsing specific times
        self.time_patterns = [
            r'(\d{1,2}):(\d{2})\s*(am|pm)',  # 3:00 pm, 11:30 am
            r'(\d{1,2})\s*(am|pm)',         # 3pm, 11am
            r'(\d{1,2}):(\d{2})',           # 15:30, 09:00 (24h format)
        ]

    def _get_next_weekday(self, weekday: int) -> int:
        """Get days until next occurrence of weekday (0=Monday, 6=Sunday)"""
        today = datetime.now().weekday()
        days_ahead = weekday - today
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
        return days_ahead

    def process(self, text: str) -> TaskOperation:
        """Main processing function"""
        text_lower = text.lower().strip()

        # Detect intent
        intent = self._detect_intent(text_lower)

        # Extract entities
        entities = self._extract_entities(text)

        # Extract task details
        task_op = TaskOperation(
            intent=intent,
            title=self._extract_title(text, entities),
            description=self._extract_description(text),
            priority=self._extract_priority(text_lower),
            assignees=self._extract_assignees(entities),
            work_order=self._extract_work_order(entities),
            project=self._extract_project(entities),
            client=self._extract_client(entities),
            due_date=self._extract_date(text_lower, 'due', 'by', 'deadline'),
            start_date=self._extract_date(text_lower, 'start', 'begin', 'from'),
            estimated_hours=self._extract_hours(text_lower),
            entities=entities,
            confidence=self._calculate_confidence(text_lower, intent, entities)
        )

        return task_op

    def _detect_intent(self, text: str) -> Intent:
        """Detect user intent from text"""
        # Check for create patterns
        for pattern in self.create_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return Intent.CREATE_TASK

        # Check for update patterns
        for pattern in self.update_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return Intent.UPDATE_TASK

        # If contains task-related keywords, assume create
        if re.search(r'\btask\b', text) and any(word in text for word in ['for', 'in', 'with', 'about']):
            return Intent.CREATE_TASK

        return Intent.UNKNOWN

    def _extract_entities(self, text: str) -> List[EntityMatch]:
        """Extract entities with symbols (@, #, /, +, &)"""
        entities = []

        # Improved symbol patterns - support Greek and English text
        patterns = {
            '@': r'@([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.]{0,30}?)(?=\s+(?:for|in|with|due|at|για|σε|με|μέχρι|στις|$)|$)',  # Personnel
            '#': r'#([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.]{0,30}?)(?=\s+(?:for|in|with|due|at|για|σε|με|μέχρι|στις|$)|$)',  # Work Orders
            '/': r'/([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.]{0,30}?)(?=\s+(?:for|in|with|due|at|για|σε|με|μέχρι|στις|$)|$)',  # Tasks
            '+': r'\+([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.]{0,30}?)(?=\s+(?:for|in|with|due|at|για|σε|με|μέχρι|στις|$)|$)', # Projects
            '&': r'&([A-Za-zΑ-Ωα-ω0-9][A-Za-zΑ-Ωα-ω0-9\s\-\.]{0,30}?)(?=\s+(?:for|in|with|due|at|για|σε|με|μέχρι|στις|$)|$)',  # Clients
        }

        entity_types = {
            '@': 'personnel',
            '#': 'work_order',
            '/': 'task',
            '+': 'project',
            '&': 'client'
        }

        for symbol, pattern in patterns.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                entities.append(EntityMatch(
                    type=entity_types[symbol],
                    value=match.group(1).strip(),
                    symbol=symbol,
                    start=match.start(),
                    end=match.end()
                ))

        return entities

    def _extract_title(self, text: str, entities: List[EntityMatch]) -> str:
        """Extract task title from text"""
        # Extract quoted strings first (highest priority)
        quoted = re.search(r'["\']([^"\']+)["\']', text)
        if quoted:
            return quoted.group(1).strip()

        # Remove entity references to get clean title
        clean_text = text
        for entity in sorted(entities, key=lambda e: e.start, reverse=True):
            clean_text = clean_text[:entity.start] + clean_text[entity.end:]

        # Remove time references
        clean_text = re.sub(r'\s+at\s+\d{1,2}:?\d{0,2}\s*(am|pm)?', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+\d{1,2}\s*(am|pm)', '', clean_text, flags=re.IGNORECASE)

        # Remove date references (English + Greek)
        clean_text = re.sub(r'\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+week|σήμερα|αύριο|δευτέρα|τρίτη|τετάρτη|πέμπτη|παρασκευή|σάββατο|κυριακή|επόμενη\s+εβδομάδα)\b', '', clean_text, flags=re.IGNORECASE)

        # Remove common command words and prepositions (English + Greek)
        clean_text = re.sub(r'\b(create|add|new|make|schedule|task|title|for|in|with|about|due|at|on|a|an|the|δημιούργησε|προσθήκη|νέα|κάνε|προγραμμάτισε|φτιάξε|εργασία|για|σε|με|μέχρι|στις|μία|μια|ένα|το|η|ο)\b', '', clean_text, flags=re.IGNORECASE)

        # Clean up extra spaces
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()

        # If we have meaningful content, return it
        if len(clean_text) > 2 and not re.match(r'^\d+$', clean_text):
            # Take up to first 5 words for a reasonable title
            words = clean_text.split()[:5]
            title = ' '.join(words).strip()
            if title:
                return title

        # Special case: if no meaningful title found but we have entity values, use them
        if entities:
            # Use the first entity value as title if it makes sense
            for entity in entities:
                if entity.type in ['work_order', 'project', 'client'] and len(entity.value) > 2:
                    return entity.value

        # Fallback: look for any meaningful noun or action
        words = text.split()
        stop_words = ['create', 'task', 'add', 'new', 'make', 'schedule', 'for', 'in', 'with', 'about', 'due', 'at', 'on', 'the', 'and',
                     'δημιούργησε', 'εργασία', 'προσθήκη', 'νέα', 'κάνε', 'προγραμμάτισε', 'φτιάξε', 'για', 'σε', 'με', 'μέχρι', 'στις', 'μία', 'μια', 'ένα', 'το', 'η', 'ο', 'και']

        for word in words:
            if (len(word) > 3 and
                word.lower() not in stop_words and
                not word.startswith(('@', '#', '/', '+', '&')) and
                not re.match(r'^\d+:?\d*\s*(am|pm)?$', word, re.IGNORECASE)):
                return word

        return "New Task"

    def _extract_description(self, text: str) -> Optional[str]:
        """Extract task description"""
        # Look for description patterns
        desc_match = re.search(r'(?:description|details?|notes?):\s*["\']?([^"\']+)["\']?', text, re.IGNORECASE)
        if desc_match:
            return desc_match.group(1).strip()

        return None

    def _extract_priority(self, text: str) -> Priority:
        """Extract priority from text"""
        for priority, patterns in self.priority_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    return priority
        return Priority.MEDIUM

    def _extract_assignees(self, entities: List[EntityMatch]) -> List[str]:
        """Extract assignees from entities"""
        return [e.value for e in entities if e.type == 'personnel']

    def _extract_work_order(self, entities: List[EntityMatch]) -> Optional[str]:
        """Extract work order from entities"""
        work_orders = [e.value for e in entities if e.type == 'work_order']
        return work_orders[0] if work_orders else None

    def _extract_project(self, entities: List[EntityMatch]) -> Optional[str]:
        """Extract project from entities"""
        projects = [e.value for e in entities if e.type == 'project']
        return projects[0] if projects else None

    def _extract_client(self, entities: List[EntityMatch]) -> Optional[str]:
        """Extract client from entities"""
        clients = [e.value for e in entities if e.type == 'client']
        return clients[0] if clients else None

    def _extract_date(self, text: str, *keywords) -> Optional[str]:
        """Extract date from text using keywords, with time support"""
        # Extract time first
        extracted_time = self._extract_time(text)

        for keyword in keywords:
            # Look for keyword followed by date and optional time
            pattern = rf'{keyword}\s+(\w+(?:\s+\w+)?(?:\s+at\s+[\d:apm\s]+)?)'
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                full_match = match.group(1).lower()
                # Split date part from time part
                date_part = re.sub(r'\s+at\s+[\d:apm\s]+', '', full_match).strip()
                if date_part in self.date_patterns:
                    days_ahead = self.date_patterns[date_part]
                    target_date = datetime.now() + timedelta(days=days_ahead)
                    if extracted_time:
                        target_date = target_date.replace(
                            hour=extracted_time['hour'],
                            minute=extracted_time['minute'],
                            second=0,
                            microsecond=0
                        )
                    return target_date.isoformat()

        # Look for standalone date keywords with optional time
        for date_text, days_ahead in self.date_patterns.items():
            if re.search(rf'\b{re.escape(date_text)}\b', text, re.IGNORECASE):
                target_date = datetime.now() + timedelta(days=days_ahead)
                if extracted_time:
                    target_date = target_date.replace(
                        hour=extracted_time['hour'],
                        minute=extracted_time['minute'],
                        second=0,
                        microsecond=0
                    )
                return target_date.isoformat()

        return None

    def _extract_time(self, text: str) -> Optional[dict]:
        """Extract time from text (3pm, 15:30, etc.)"""
        for pattern in self.time_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if len(match.groups()) == 2:  # Simple format like "3pm"
                    hour = int(match.group(1))
                    minute = 0
                    period = match.group(2).lower() if match.group(2) else None
                elif len(match.groups()) == 3:  # Format like "3:30pm"
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    period = match.group(3).lower() if match.group(3) else None
                else:  # 24h format like "15:30"
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    period = None

                # Convert 12h to 24h format
                if period:
                    if period == 'pm' and hour != 12:
                        hour += 12
                    elif period == 'am' and hour == 12:
                        hour = 0

                # Validate time
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return {'hour': hour, 'minute': minute}

        return None

    def _extract_hours(self, text: str) -> Optional[float]:
        """Extract estimated hours from text"""
        # Pattern for hours
        hour_pattern = r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b'
        match = re.search(hour_pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass

        return None

    def _calculate_confidence(self, text: str, intent: Intent, entities: List[EntityMatch]) -> float:
        """Calculate confidence score"""
        confidence = 0.0

        # Base confidence for intent detection
        if intent != Intent.UNKNOWN:
            confidence += 0.4

        # Bonus for entities
        confidence += min(0.3, len(entities) * 0.1)

        # Bonus for clear task indicators
        if re.search(r'\btask\b', text):
            confidence += 0.2

        # Bonus for action words
        action_words = ['create', 'add', 'make', 'schedule', 'update', 'modify']
        if any(word in text for word in action_words):
            confidence += 0.1

        return min(1.0, confidence)

def main():
    """Main function for CLI usage"""
    if len(sys.argv) < 2:
        print("Usage: python main.py <text>")
        sys.exit(1)

    text = ' '.join(sys.argv[1:])
    processor = LocalNLPProcessor()
    result = processor.process(text)

    # Convert to JSON for output
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
            {
                'type': e.type,
                'value': e.value,
                'symbol': e.symbol
            } for e in (result.entities or [])
        ],
        'confidence': result.confidence
    }

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()