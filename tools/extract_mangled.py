import os
import glob
import re

translated_dir = '/Users/wangchen/Desktop/gemini cli/biomechanics-book/translated'
chapters = sorted(glob.glob(os.path.join(translated_dir, '*.md')))

for c in chapters:
    with open(c, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if re.search(r'[¼ðÞﬃ]', line):
                print(f"[{os.path.basename(c)}:{i+1}] {line.strip()}")
