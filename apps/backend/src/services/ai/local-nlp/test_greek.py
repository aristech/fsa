#!/usr/bin/env python3
"""
Test Greek language support for Local NLP Service
"""

from main import LocalNLPProcessor

def test_greek_language():
    processor = LocalNLPProcessor()

    greek_test_cases = [
        "δημιούργησε μία εργασία",
        "δημιούργησε μία εργασία στον #Κήπο Φροντίδα για αύριο",
        "προσθήκη επείγουσας εργασίας για @Γιάννης Παπαδόπουλος",
        "νέα εργασία για +Έργο Συντήρησης μέχρι παρασκευή",
        "κάνε εργασία &Εταιρεία ACME επιθεώρηση",
        "προγραμμάτισε εργασία για δευτέρα υψηλή προτεραιότητα",
        "φτιάξε μία εργασία 'Πότισμα φυτών' για αύριο στις 3μμ",
    ]

    print("🇬🇷 Testing Greek Language Support")
    print("=" * 60)

    for i, text in enumerate(greek_test_cases, 1):
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

    print("\n✅ Greek language tests completed!")

def test_mixed_language():
    processor = LocalNLPProcessor()

    mixed_test_cases = [
        "create task στον #Κήπος for tomorrow",
        "δημιούργησε εργασία in #Garden Care for @John",
        "add urgent εργασία για @Μαρία Κωνσταντίνου",
    ]

    print("\n🌍 Testing Mixed Language Support")
    print("=" * 60)

    for i, text in enumerate(mixed_test_cases, 1):
        print(f"\n{i}. Input: '{text}'")
        result = processor.process(text)

        print(f"   Intent: {result.intent.value}")
        print(f"   Title: '{result.title}'")
        print(f"   Confidence: {result.confidence:.2f}")

        if result.entities:
            for entity in result.entities:
                print(f"   Entity: {entity.symbol}{entity.value} ({entity.type})")

    print("\n✅ Mixed language tests completed!")

if __name__ == "__main__":
    test_greek_language()
    test_mixed_language()