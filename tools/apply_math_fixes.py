import os
import glob
import re

book_file = '/Users/wangchen/Desktop/Biomechanics_Book_Full.md'
translated_dir = '/Users/wangchen/Desktop/gemini cli/biomechanics-book/translated'

def fix_content(content):
    # Fix already translated but badly formatted SMM math like the user's screenshot
    # k_{vert} = F_{max}:\\Delta y 1 -> k_{vert} = F_{max} \\cdot \\Delta y^{-1}
    # and the un-replaced variables
    
    # Existing replaced ones
    content = content.replace("F_{max}:\\Delta y 1", "F_{max} \\cdot \\Delta y^{-1}")
    content = content.replace("F_{max}:\\Delta L 1", "F_{max} \\cdot \\Delta L^{-1}")
    content = content.replace("F_{max} : \\Delta y 1", "F_{max} \\cdot \\Delta y^{-1}")
    content = content.replace("F_{max} : \\Delta L 1", "F_{max} \\cdot \\Delta L^{-1}")

    content = content.replace("kvert 1/4 Fmax:Dy 1", "k_{vert} = F_{max} \\cdot \\Delta y^{-1}")
    content = content.replace("kleg 1/4 Fmax:DL 1", "k_{leg} = F_{max} \\cdot \\Delta L^{-1}")
    content = content.replace("kvert ¼ Fmax:Dy 1", "k_{vert} = F_{max} \\cdot \\Delta y^{-1}")
    content = content.replace("kleg ¼ Fmax:DL 1", "k_{leg} = F_{max} \\cdot \\Delta L^{-1}")
    
    # Catching generic OCR garbage from the remaining occurrences that fix_math missed
    def robust_repl(m):
        eq = m.group(0)
        if '¼' not in eq and 'ð' not in eq and 'þ' not in eq and 'ﬃ' not in eq:
            return eq
            
        eq = eq.replace('¼', '=')
        eq = eq.replace('þ', '+')
        eq = eq.replace('ð', '(').replace('Þ', ')')
        eq = eq.replace('ﬃ', '') # Just remove ligatures for readability instead of ugly symbols
        
        match_num = re.search(r'\((\d+:\d+)\)', eq)
        if match_num:
            eq_num = match_num.group(1).replace(':', '.')
            eq = re.sub(r'\(\d+:\d+\)', '', eq)
            eq = re.sub(r'\s+', ' ', eq).strip()
            return f'\n\n$$ {eq} \\quad ({eq_num}) $$\n\n'
        else:
            eq = re.sub(r'\s+', ' ', eq).strip()
            return f' ${eq}$ '

    content = re.sub(r'([A-Za-z0-9¼þðÞ\:\-\.\sﬃ]{15,})', lambda m: robust_repl(m), content)

    # Cleanups
    content = content.replace("$$ k_{vert} = F_{max} \cdot \Delta y^{-1} \quad (8.3) $$", "$$ k_{vert} = F_{max} \cdot \\Delta y^{-1} \quad (8.3) $$")
    content = content.replace("$$k_{vert} = F_{max} \\cdot \\Delta y 1 \\quad (8.3)$$", "$$ k_{vert} = F_{max} \\cdot \\Delta y^{-1} \\quad (8.3) $$")
    content = content.replace("F_{max}:\\Delta", "F_{max} \\cdot \\Delta")
    content = content.replace("\\Delta y 1", "\\Delta y^{-1}")
    content = content.replace("\\Delta L 1", "\\Delta L^{-1}")

    return content

files = [book_file] + glob.glob(os.path.join(translated_dir, '*.md'))

for file_path in files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = fix_content(content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {os.path.basename(file_path)}")
    except Exception as e:
        print(f"Failed on {file_path}: {e}")

print("Done targeted fixes.")
