import json
transcript_path = r'C:\Users\LENOVO\.gemini\antigravity-ide\brain\97b99d5a-0394-45a0-a1a4-ca74fad9e36c\.system_generated\logs\transcript_full.jsonl'
lines = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '') or data.get('output', '') or ''
            if 'hero-visual' in content and 'class=' in content:
                for l in content.split('\n'):
                    lines.append(l)
        except Exception as e:
            pass

for i, l in enumerate(lines):
    if 'hero-visual' in l and 'class' in l:
        print('--- FOUND ---')
        for j in range(i, min(i+35, len(lines))):
            print(lines[j])
