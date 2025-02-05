import { InsertEvent } from "@shared/schema";
import { addHours, parseISO, format } from "date-fns";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface ParsedEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export async function parseEventWithGemini(input: string): Promise<InsertEvent | null> {
  const prompt = `Parse the following text into a calendar event. Extract title, description (optional), start time, end time (assume 1 hour duration if not specified), and location (optional). Format the response as valid JSON with these exact keys: title, description, startTime (ISO string), endTime (ISO string), location. Current date/time is: ${new Date().toISOString()}

Input: "${input}"

Respond ONLY with the JSON, no other text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
        },
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process with Gemini API');
    }

    const data = await response.json() as GeminiResponse;
    const jsonText = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(jsonText) as ParsedEvent;

    // Validate and format the response
    return {
      title: parsed.title,
      description: parsed.description || "",
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      location: parsed.location || "",
    };
  } catch (error) {
    console.error('Error parsing event with Gemini:', error);
    return null;
  }
}
