import axios from 'axios';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { phoneNumber, message } = await req.json();

  try {
    const response = await axios.post('https://api.semaphore.co/api/v4/messages', {
      apikey: process.env.NEXT_PUBLIC_SEMAPHORE_API_KEY,
      number: phoneNumber,
      message,
    });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: 'Error sending SMS' }, { status: 500 });
  }
}
