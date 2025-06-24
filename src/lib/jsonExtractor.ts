export function extractJsonObjects(text: string): any[] {
  const objects: any[] = [];

  // 🔁 Normalize entire input text before scanning
  const normalizedText = text
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/\u200B/g, '');

  const stack: number[] = [];

  for (let i = 0; i < normalizedText.length; i++) {
    if (normalizedText[i] === '{') {
      stack.push(i);
    } else if (normalizedText[i] === '}' && stack.length > 0) {
      const start = stack.pop();
      if (start !== undefined) {
        const snippet = normalizedText.slice(start, i + 1);

        try {
          console.log("SNIPPET TRYING TO PARSE:", snippet);
          const parsed = JSON.parse(snippet);

          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            Array.isArray(parsed.items) &&
            parsed.items.every((item: any) =>
              typeof item === 'object' &&
              'category' in item &&
              'type' in item &&
              ('monthlyAmount' in item || 'yearlyAmount' in item)
            )
          ) {
            objects.push(parsed);
          }
        } catch {
          // Skip malformed JSON blocks
        }
      }
    }
  }

  return objects;
}
