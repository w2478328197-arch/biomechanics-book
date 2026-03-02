const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const BATCH_SIZE = 15;
const rawDir = path.join(__dirname, '../chapters_raw');
const translatedDir = path.join(__dirname, '../translated');

async function translateChapter(filename) {
    const inputPath = path.join(rawDir, filename);
    let originalText = fs.readFileSync(inputPath, 'utf8');

    // 1. Reflow and Clean Text
    let lines = originalText.split('\n');
    let paragraphs = [];
    let currentPara = [];

    const isGarbage = (line) => {
        return line.match(/^<!--.*-->$/) ||
            line.match(/^Chapter \d+$/) ||
            line.match(/^© Springer/) ||
            line.match(/^J\.-B\. Morin/) ||
            line.match(/^https:\/\/doi/) ||
            line.match(/^\d+$/) ||
            line.match(/T\. Caderby/i) ||
            line.match(/G\. Dalleau/i) ||
            line.match(/P\. Samozino/i) ||
            line.match(/J\.-B\. Morin/i) ||
            line.match(/E\. Saez de Villarreal/i) ||
            line.match(/A\. J\. Coutts/i) ||
            line.match(/M\. Buchheit/i);
    };

    for (let line of lines) {
        line = line.trim();
        if (isGarbage(line)) continue;

        if (!line) {
            if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
            }
        } else {
            // Check if line is a short heading (e.g., "6.1", "Introduction")
            // If it is, and we already have text in currentPara, flush currentPara.
            if (line.length < 50 && line.match(/^(?:(?:\d+\.)+\d*|[A-Z].*[^.?!:;,\-])$/) && currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [line];
            } else {
                currentPara.push(line);
            }
        }
    }
    if (currentPara.length > 0) paragraphs.push(currentPara.join(' '));

    // Handle hyphenations
    paragraphs = paragraphs.map(p => p.replace(/-\s+/g, ''));

    let translatedParagraphs = [];
    console.log(`> Translating ${filename} (${paragraphs.length} refined paragraphs)...`);

    for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
        const batch = paragraphs.slice(i, i + BATCH_SIZE);
        try {
            const res = await translate(batch, { to: 'zh-CN' });
            const batchTranslated = Array.isArray(res) ? res.map(r => r.text) : [res.text];

            batch.forEach((origText, idx) => {
                let tText = batchTranslated[idx] || origText;

                // Format headings
                if (/^(?:\d+\.)+\d*/.test(origText) && origText.length < 80) {
                    tText = '## ' + tText;
                } else if (/^\d+\s/.test(origText) && origText.length < 60) {
                    tText = '# ' + tText;
                }

                // Inject images
                const figMatch = origText.match(/Fig(?:ure)?\.?\s*(\d+\.\d+)/i);
                if (figMatch) {
                    const figNum = figMatch[1];
                    const imgName = `fig_${figNum.replace('.', '_')}.jpeg`;
                    tText += `\n\n![图 ${figNum}](../images/${imgName})`;
                }

                translatedParagraphs.push(tText);
            });
            process.stdout.write(`.`);
        } catch (e) {
            console.error(`\n[!] Error matching batch ${i}: ${e.message}.`);
            batch.forEach(o => translatedParagraphs.push(o));
        }
    }
    console.log('\n');

    const chapterNum = filename.substring(0, 2);
    const outFilename = `${chapterNum}_第${parseInt(chapterNum)}章.md`;
    fs.writeFileSync(path.join(translatedDir, outFilename), translatedParagraphs.join('\n\n'));
    console.log(`[+] Exported Cleaned ${outFilename}`);
}

async function run() {
    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.txt')).sort();
    const filesToTranslate = files.filter(f => {
        const num = parseInt(f.substring(0, 2));
        return num >= 1 && num <= 13;
    });

    for (const file of filesToTranslate) {
        await translateChapter(file);
    }
    console.log("All clean full-text chapters successfully completed.");
}

run();
