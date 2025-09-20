#!/usr/bin/env python3
"""
Advanced test cases for improved Local NLP Service
"""

from main import LocalNLPProcessor

def test_time_parsing():
    processor = LocalNLPProcessor()

    time_test_cases = [
        "create a task in #Garden Care for tomorrow at 3pm",
        "schedule meeting at 9:30am tomorrow",
        "add task due friday at 2:15pm",
        "create inspection task at 14:30",
        "schedule maintenance for monday at 8am",
    ]

    print("🕒 Testing Time Parsing")
    print("=" * 50)

    for i, text in enumerate(time_test_cases, 1):
        print(f"\n{i}. Input: '{text}'")
        result = processor.process(text)

        print(f"   Title: '{result.title}'")
        if result.due_date:
            print(f"   Due Date: {result.due_date}")
        if result.entities:
            for entity in result.entities:
                print(f"   Entity: {entity.symbol}{entity.value} ({entity.type})")

def test_entity_parsing():
    processor = LocalNLPProcessor()

    entity_test_cases = [
        "create task in #Garden Care Project for @John Smith",
        "add urgent task for +Website Development due tomorrow",
        "schedule inspection with &Acme Corporation next week",
        "create maintenance task in #Building A for @Jane Doe at 3pm",
    ]

    print("\n🏷️  Testing Entity Parsing")
    print("=" * 50)

    for i, text in enumerate(entity_test_cases, 1):
        print(f"\n{i}. Input: '{text}'")
        result = processor.process(text)

        print(f"   Title: '{result.title}'")
        print(f"   Entities: {len(result.entities)} found")
        for entity in result.entities:
            print(f"     {entity.symbol}{entity.value} ({entity.type})")

if __name__ == "__main__":
    test_time_parsing()
    test_entity_parsing()
    print("\n✅ Advanced tests completed!")