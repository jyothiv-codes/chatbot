import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const data = await req.json();
    const { kg_query } = data;

    if (!kg_query) {
      return NextResponse.json({ error: 'Query parameter is missing' }, { status: 400 });
    }

    // // Send the user's query to the external API (Fast API)
    const apiUrl = `https://07a9-34-75-24-62.ngrok-free.app/generate_knowledge_graph?kg_query=${encodeURIComponent(kg_query)}`;

    // Make the request to the external API
    const response = await fetch(apiUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error('Failed to fetch data from external API');
    }

    const jsonResponse = await response.json();
    
    // Return the data to the client
    return NextResponse.json(jsonResponse);

  } catch (error) {
    console.error('Error generating knowledge graph:', error);
    return NextResponse.json({ error: 'Error generating knowledge graph' }, { status: 500 });
  }
}
