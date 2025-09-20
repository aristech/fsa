#!/usr/bin/env python3
"""
Quick test script for Local NLP Service
"""

from main import LocalNLPProcessor

def test_examples():
    processor = LocalNLPProcessor()

    test_cases = [
        "create a task in #Garden Care for tomorrow",
        "add urgent task for @John Doe",
        "schedule task 'Plant watering' due friday",
        "new task for +Maintenance Project 2 hours",
        "create task &Acme Corp inspection",
    ]

    print("🧪 Testing Local NLP Processor")
    print("=" * 50)

    for i, text in enumerate(test_cases, 1):
        print(f"\n{i}. Input: '{text}'")
        result = processor.process(text)

        print(f"   Intent: {result.intent.value}")
        print(f"   Title: '{result.title}'")
        print(f"   Priority: {result.priority.value}")
        print(f"   Confidence: {result.confidence:.2f}")

        if result.entities:
            print(f"   Entities: {len(result.entities)} found")
            for entity in result.entities:
                print(f"     {entity.symbol}{entity.value} ({entity.type})")

        if result.due_date:
            print(f"   Due Date: {result.due_date[:19]}")

        if result.assignees:
            print(f"   Assignees: {', '.join(result.assignees)}")

    print("\n✅ All tests completed!")

if __name__ == "__main__":
    test_examples()