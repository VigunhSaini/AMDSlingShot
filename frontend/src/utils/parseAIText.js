// Utility to parse AI explanation text and extract the suggestions section

const EMOJI_RE = /\p{Emoji}/gu;

function stripMarkup(text) {
    return text
        .replace(EMOJI_RE, '')
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
        .trim();
}

// Split raw AI text into sections by # headings.
// Returns an array of { heading: string|null, body: string[] }
function parseSections(raw) {
    const lines = (raw || '').split('\n');
    const sections = [];
    let current = { heading: null, body: [] };

    for (const line of lines) {
        const headingMatch = line.match(/^\s*#{1,6}\s+(.+)/);
        if (headingMatch) {
            sections.push(current);
            current = { heading: headingMatch[1].trim(), body: [] };
        } else {
            current.body.push(line);
        }
    }
    sections.push(current);
    return sections;
}

// Extract numbered items from body lines (e.g. "1. Do this", "2. Do that")
function parseNumberedItems(bodyLines) {
    const text = bodyLines.join('\n');
    const items = [];
    const re = /\d+\.\s*([\s\S]+?)(?=\n\d+\.|\s*$)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const item = stripMarkup(m[1].replace(/\n/g, ' ').trim());
        if (item) items.push(item);
    }
    return items;
}

// Extract numbered suggestion items WITH percentages from the "suggest" section
function parseNumberedItemsWithPercentage(bodyLines) {
    const text = bodyLines.join('\n');
    const items = [];
    const re = /\d+\.\s*([\s\S]+?)(?=\n\d+\.|\s*$)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const fullText = m[1].trim();
        
        // Look for "increase = +X%" pattern
        const percentMatch = fullText.match(/increase\s*=\s*\+(\d+)%/i);
        const percentage = percentMatch ? parseInt(percentMatch[1], 10) : 0;
        
        // Remove the percentage line from the suggestion text
        const suggestionText = stripMarkup(
            fullText
                .replace(/increase\s*=\s*\+\d+%/gi, '')
                .replace(/\n/g, ' ')
                .trim()
        );
        
        if (suggestionText) {
            items.push({
                text: suggestionText,
                increase: percentage
            });
        }
    }
    return items;
}

// Extract numbered suggestion items from the "suggest" section of AI text
export function extractAISuggestions(raw) {
    if (!raw) return [];
    const sections = parseSections(raw);
    const suggestSection = sections.find(
        s => s.heading && /suggest/i.test(s.heading)
    );
    if (!suggestSection) return [];
    return parseNumberedItemsWithPercentage(suggestSection.body);
}

// Return AI text with the suggestions section removed, emojis and bold stripped
export function cleanAIText(raw) {
    if (!raw) return '';
    const sections = parseSections(raw);

    const kept = sections
        .filter(s => !s.heading || !/suggest/i.test(s.heading))
        .map(s => {
            const heading = s.heading ? `## ${s.heading}` : null;
            const body = s.body.join('\n').trim();
            return [heading, body].filter(Boolean).join('\n');
        })
        .filter(Boolean)
        .join('\n\n');

    return kept
        .replace(EMOJI_RE, '')
        .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
