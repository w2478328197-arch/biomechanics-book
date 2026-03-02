const fs = require('fs');
const path = require('path');

// Note: I will pass the key via env when running
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable");
    process.exit(1);
}

const rawDir = path.join(__dirname, '../chapters_raw');
const translatedDir = path.join(__dirname, '../translated');

const SYSTEM_INSTRUCTION = `
You are an expert bilingual translator specializing in sports science, biomechanics, and academic texts.
Translate the following English book chapter into professional, fluent Chinese (Simplified).

Formatting Rules:
1. Output MUST be formatted as Markdown.
2. Keep the original chapter title as a Markdown Heading 1 (e.g., "# 第6章：跳跃中测量下肢刚度的简单方法 (A Simple Method for Measuring Lower Limb Stiffness in Hopping)").
3. For sections, use Heading 2 and Heading 3 appropriately based on the English text structure (e.g. 6.1 Introduction -> "## 6.1 引言").
4. Maintain academic terminology accurately.
5. Translate math formulas and equations carefully if they appear. 
6. Do NOT include any filler responses. Only output the translated Markdown content.
7. Merge hyphenated words across lines if they were broken in the raw text (e.g. "locomo-\\ntion" -> "locomotion").
`;

async function translateText(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const payload = {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0.2 }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Unexpected response format");
}

async function translateFile(filename) {
    const inputPath = path.join(rawDir, filename);
    const content = fs.readFileSync(inputPath, 'utf-8');

    console.log(` Translating ${filename}... (${content.length} chars)`);

    const translatedText = await translateText("Here is the raw chapter text:\n\n" + content);

    const chapterNum = filename.substring(0, 2);
    const outFilename = `${chapterNum}_第${parseInt(chapterNum)}章.md`;
    const outputPath = path.join(translatedDir, outFilename);

    fs.writeFileSync(outputPath, translatedText);
    console.log(` ✅ Saved to ${outFilename}`);
}

async function run() {
    const files = fs.readdirSync(rawDir)
        .filter(f => f.endsWith('.txt'))
        .sort();

    const filesToTranslate = files.filter(f => {
        const num = parseInt(f.substring(0, 2));
        return num >= 6 && num <= 13;
    });

    console.log(`Found ${filesToTranslate.length} chapters to translate.`);

    for (const file of filesToTranslate) {
        try {
            await translateFile(file);
        } catch (err) {
            console.error(` ❌ Error translating ${file}:`, err);
        }
    }

    console.log("All translations completed.");
}

run();
