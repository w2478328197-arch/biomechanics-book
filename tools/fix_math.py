import os
import re
import glob

translated_dir = '/Users/wangchen/Desktop/gemini cli/biomechanics-book/translated'
chapters = sorted(glob.glob(os.path.join(translated_dir, '*.md')))

chapters_to_process = [c for c in chapters if re.search(r'(01|02|03|04|05|06|07|08|09|10|11|12|13)_', os.path.basename(c))]

for file_path in chapters_to_process:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pre-process targeted extreme OCR errors before regex matching
    content = content.replace('DL ¼ L ﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃ\n\nL2 vtc 2 r × Dy ð8:4Þ', '\n\n$$ \\Delta L = L - \\sqrt{L^2 - (\\frac{v t_c}{2})^2} + \\Delta y \\quad (8.4) $$\n\n')
    content = content.replace('DL ¼ L ﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃ\n\n$$ L2 vt_c 2 r + \\Delta y \\quad (8.4) $$', '\n\n$$ \\Delta L = L - \\sqrt{L^2 - (\\frac{v t_c}{2})^2} + \\Delta y \\quad (8.4) $$\n\n')
    # Backup replacement in case the exact newlines differ
    content = re.sub(r'DL ¼ L ﬃ+.*?ð8:4Þ', r'\n\n$$ \\Delta L = L - \\sqrt{L^2 - (\\frac{v t_c}{2})^2} + \\Delta y \\quad (8.4) $$\n\n', content, flags=re.DOTALL)
    content = content.replace('L2 vtc 2 r × Dy ð8:4Þ', '\n\n$$ \\Delta L = L - \\sqrt{L^2 - (\\frac{v t_c}{2})^2} + \\Delta y \\quad (8.4) $$\n\n')
    content = content.replace('DL ¼ L ﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃﬃ\n', '')
    content = content.replace('L ¼ 0:53H ð8:5Þ', '\n\n$$ L = 0.53 H \\quad (8.5) $$\n\n')
    content = content.replace('L ¼ 0:53H\nð8:5Þ', '\n\n$$ L = 0.53 H \\quad (8.5) $$\n\n')
    content = content.replace('L ¼ 0:53H', '$$ L = 0.53H $$')

    def repl(m):
        eq = m.group(0)
        # Some things might be matched incorrectly. Only process if it clearly has the OCR errors
        if '¼' not in eq and 'ð' not in eq and 'þ' not in eq:
            return eq
            
        eq = eq.replace('¼', '=')
        eq = eq.replace('þ', '+')
        eq = eq.replace('  ', ' - ')
        
        match_num = re.search(r'ð(\d+:\d+)Þ', eq)
        if match_num:
            eq_num = match_num.group(1).replace(':', '.')
            eq = re.sub(r'ð\d+:\d+Þ', '', eq)
            eq = eq.replace('ð', '(').replace('Þ', ')')
            eq = eq.replace('F(t)', 'F(t)')
            eq = eq.replace('Fmax', 'F_{max}')
            eq = eq.replace('F_{max}:', 'F_{max} \\cdot ')
            eq = eq.replace('kleg', 'k_{leg}')
            eq = eq.replace('kvert', 'k_{vert}')
            eq = eq.replace('Dy 1', '\\Delta y^{-1}')
            eq = eq.replace('DL 1', '\\Delta L^{-1}')
            eq = eq.replace('Dy', '\\Delta y')
            eq = eq.replace('DL', '\\Delta L')
            eq = eq.replace('p2', '\\pi^2')
            eq = eq.replace('tc2', 't_c^2')
            eq = eq.replace('tc', 't_c')
            eq = re.sub(r'\\bta\b', 't_a', eq)
            
            # Additional cleanup for proper spacing
            eq = re.sub(r'\s+', ' ', eq).strip()
            
            return f'\n\n$$ {eq} \\quad ({eq_num}) $$\n\n'
        else:
            eq = eq.replace('ð', '(').replace('Þ', ')')
            # Wrap inline math
            eq = re.sub(r'\s+', ' ', eq).strip()
            return f' ${eq}$ '
            
    # Search for blocks of ASCII characters that contain the broken OCR symbols
    # Often they span multiple spaces and include variable names
    new_content = re.sub(r'([A-Za-z0-9¼þðÞ\:\-\.\s]{15,})', lambda m: repl(m), content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {os.path.basename(file_path)}")

print("Done fixing math.")
