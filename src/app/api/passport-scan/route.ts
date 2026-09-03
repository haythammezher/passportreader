import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { LLMClient } from '@rocketnew/llm-sdk';

const PASSPORT_EXTRACTION_PROMPT = `You are an expert passport data extraction system. Analyze this passport image and extract all visible fields.

Return ONLY a valid JSON object with these exact keys (use null for fields not visible):
{
  "documentType": "P" or "PD" or "PS" or "PC" (single letter or two-letter code),
  "issuingCountry": "3-letter ISO country code (e.g. SAU, GBR, USA)",
  "holderName": "Full name as shown (Given names + Surname)",
  "passportNumber": "Passport/document number (alphanumeric, no spaces)",
  "nationality": "3-letter ISO nationality code",
  "dateOfBirth": "YYYY-MM-DD format",
  "sex": "M" or "F" or "X",
  "expiryDate": "YYYY-MM-DD format",
  "issueDate": "YYYY-MM-DD format",
  "placeOfBirth": "Place of birth if visible",
  "issuingAuthority": "Issuing authority if visible",
  "personalNumber": "Personal number if visible",
  "mrzLine1": "First MRZ line (44 chars) if visible",
  "mrzLine2": "Second MRZ line (44 chars) if visible"
}

Rules:
- Return ONLY the JSON object, no markdown, no explanation
- For dates, convert to YYYY-MM-DD format
- For country codes, use 3-letter ISO 3166-1 alpha-3 codes
- For passport numbers, remove spaces and special characters
- If MRZ lines are visible, include them exactly as printed
- If a field is not visible or cannot be determined, use null`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const client = new LLMClient({ provider: 'GEMINI', apiKey });

    const result = await client.chatCompletion({
      model: 'gemini/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PASSPORT_EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = result?.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response', raw: content }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Clean up null values
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = String(value);
      }
    }

    return NextResponse.json({ fields: cleaned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Passport scan error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
