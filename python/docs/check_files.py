import os

# Get the directory where this script is located
current_dir = os.path.dirname(os.path.abspath(__file__))

expected_files = [
    "index.md",
    "core_abstraction.md",
    "paradigm.md",
    "preparation.md",
    "node.md",
    "flow.md",
    "llm.md",
    "mapreduce.md",
    "memory.md",
    "rag.md"
]

print("Checking files in:", current_dir)
print("\nFiles status:")
print("-" * 50)

for file in expected_files:
    file_path = os.path.join(current_dir, file)
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
            has_content = len(content.strip()) > 0
            print(f"✓ {file:<20} {'(has content)' if has_content else '(empty)'}")
    else:
        print(f"✗ {file:<20} (missing)")

print("\nActual files in directory:")
print("-" * 50)
for file in os.listdir(current_dir):
    if file.endswith('.md'):
        print(file) 