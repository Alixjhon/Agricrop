// Using Groq API for free chat
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const SYSTEM_PROMPT = `You are an expert agricultural AI assistant. Provide helpful, accurate advice about farming, crops, soil management, pest control, and sustainable agriculture practices.

IMPORTANT: Keep responses SIMPLE and CONCISE. Answer directly in 2-4 sentences when possible. Use short paragraphs and bullet points only when necessary. Avoid lengthy explanations.`;

export const generateFarmingAdvice = async (question: string): Promise<string> => {
  try {
    console.log('Generating farming advice for:', question.substring(0, 100) + '...');
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        temperature: 0.5,
        max_tokens: 300,
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API request failed: ${response.status}`);
    }

    const data = (await response.json()) as GroqResponse;
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('Groq response received:', aiResponse ? 'success' : 'empty');

    return (
      aiResponse ||
      "I apologize, but I couldn't generate a response at this time. Please try again."
    );
  } catch (error) {
    console.error('Error generating farming advice:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      const status = Reflect.get(error, 'status');
      if (typeof status === 'number') {
        console.error('API Status:', status);
      }
    }
    throw error; 
  }
};
