import fitz
import os
import re

pdf_path = "/Users/wangchen/Desktop/gemini cli/biomechanics-book/book.pdf"
out_dir = "/Users/wangchen/Desktop/gemini cli/biomechanics-book/images"
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Regex to find "Fig. 6.1"
fig_pattern = re.compile(r'Fig\.\s*(\d+\.\d+)', re.IGNORECASE)

print("Starting image extraction for Chapters 6-13 (Pages 124-313)...")

total_extracted = 0

for pno in range(123, 313):
    page = doc[pno]
    image_list = page.get_images(full=True)
    if not image_list:
        continue
    
    # Get text blocks to find captions
    text_blocks = page.get_text("blocks")
    fig_captions = []
    for b in text_blocks:
        text = b[4].replace('\n', ' ').strip()
        match = fig_pattern.search(text)
        if match:
            fig_captions.append({'y': b[1], 'num': match.group(1).replace('.', '_')})
            
    fig_captions.sort(key=lambda x: x['y'])
    
    # Filter valid images (skip tiny logos)
    valid_images = [img for img in image_list if img[2] >= 100 and img[3] >= 100]
    
    for img_idx, img in enumerate(valid_images):
        xref = img[0]
        base_image = doc.extract_image(xref)
        image_bytes = base_image["image"]
        image_ext = base_image["ext"]
        
        if fig_captions and img_idx < len(fig_captions):
            fig_num = fig_captions[img_idx]['num']
            img_name = f"fig_{fig_num}.{image_ext}"
        else:
            img_name = f"page_{pno + 1}_img_{img_idx}.{image_ext}"
            
        img_path = os.path.join(out_dir, img_name)
        
        # Don't overwrite if we already mapped it (some PDFs reuse XREFs or have weird structure)
        if not os.path.exists(img_path):
            with open(img_path, "wb") as f:
                f.write(image_bytes)
            print(f"Extracted {img_name}")
            total_extracted += 1

doc.close()
print(f"Done! Extracted {total_extracted} images.")
