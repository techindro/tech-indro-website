import json
transcript_path = r'C:\Users\LENOVO\.gemini\antigravity-ide\brain\97b99d5a-0394-45a0-a1a4-ca74fad9e36c\.system_generated\logs\transcript_full.jsonl'
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['name'] == 'view_file' and 'index.html' in call['args'].get('AbsolutePath', ''):
                        print(f"view_file index.html: StartLine={call['args'].get('StartLine')}, EndLine={call['args'].get('EndLine')}")
        except:
            pass
