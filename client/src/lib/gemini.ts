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
  const now = new Date();
  const prompt = `As an AI calendar assistant, parse the following text into a calendar event. Extract the following details:
- title (required): A clear, concise event title
- description (optional): Any additional details about the event
- startTime (required): The event's start time, considering the current time is ${format(now, "PPpp")}
- endTime (required): The event's end time (default to 1 hour after start time if not specified)
- location (optional): Where the event takes place

Input text: "${input}"

Format your response as a JSON object with these exact keys:
{
  "title": "string",
  "description": "string or empty",
  "startTime": "ISO datetime string",
  "endTime": "ISO datetime string",
  "location": "string or empty"
}

Respond ONLY with the JSON object, no other text. Ensure all dates are in ISO format.`;

  try {
    console.log("Sending request to Gemini API with input:", input);

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
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as GeminiResponse;

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini API response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    const jsonText = data.candidates[0].content.parts[0].text;
    console.log('Received response from Gemini:', jsonText);

    let parsed: ParsedEvent;
    try {
      parsed = JSON.parse(jsonText.trim()) as ParsedEvent;
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', jsonText);
      throw new Error('Failed to parse Gemini response as JSON');
    }

    // Validate the parsed data
    if (!parsed.title || !parsed.startTime || !parsed.endTime) {
      console.error('Missing required fields in parsed data:', parsed);
      throw new Error('Missing required fields in event data');
    }

    // Ensure dates are valid
    try {
      new Date(parsed.startTime).toISOString();
      new Date(parsed.endTime).toISOString();
    } catch (e) {
      console.error('Invalid date format in parsed data:', parsed);
      throw new Error('Invalid date format in event data');
    }

    // Convert to InsertEvent format
    return {
      title: parsed.title,
      description: parsed.description || "",
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      location: parsed.location || "",
    };
  } catch (error) {
    console.error('Error parsing event with Gemini:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process event with AI');
  }
}