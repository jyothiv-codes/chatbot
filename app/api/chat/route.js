import { NextResponse } from 'next/server';

export async function POST(req) {
  const data = await req.json(); // Parse the JSON body of the incoming request

  // Get the user's message from the last element in the array
  const userMessage = data[data.length - 1].content;

  try {
    // Send the user's message to the external API (Fast API)
    const externalApiResponse = await fetch(
      `https://bd76-34-19-111-194.ngrok-free.app/answer_questions?question=${encodeURIComponent(userMessage)}`,
      {
        method: 'GET',
      }
    );

    
    if (!externalApiResponse.ok) {
      throw new Error('Failed to fetch from external API');
    }

    // Parse the JSON response
    const jsonResponse = await externalApiResponse.json();

    // Extract the 'response' field from the JSON object
    const assistantResponse = jsonResponse.response;

    // Convert the extracted response text to a stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const text = encoder.encode(assistantResponse);
        controller.enqueue(text);
        controller.close();
      },
    });

    // Return the stream as the response
    return new NextResponse(stream);

  } catch (err) {
    console.error('Error:', err);
    return new NextResponse('Error communicating with the external API', { status: 500 });
  }
}
