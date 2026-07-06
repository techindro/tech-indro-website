import os

with open('index_recovered_537.html', 'r', encoding='utf-8') as f:
    recovered = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    current = f.read()

# Find the start and end of the content to copy from recovered
start_rec = recovered.find('</header>') + len('</header>')
end_rec = recovered.rfind('</footer>') + len('</footer>')

# Find the start and end of the content to replace in current
start_cur = current.find('</header>') + len('</header>')
end_cur = current.rfind('</footer>') + len('</footer>')

# Make the replacement
new_content = current[:start_cur] + recovered[start_rec:end_rec] + current[end_cur:]

# Write it back to index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement complete. Let's verify lengths.")
print("Original length:", len(current))
print("New length:", len(new_content))
