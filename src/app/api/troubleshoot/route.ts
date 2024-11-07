// app/api/assignment-history/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assignmentHistories = await prisma.assignmentHistory.findMany({
      include: {
        Assignment: {
          include: {
            Schedule: true,
            VanDriverOperator: {
              include: {
                Driver: true,
                Operator: true,
                Van: true,
              },
            },
            Driver: true,
            AssignmentHistory: true,
            Queue: true,
          },
        },
        Driver: true,
      },
    });
    return NextResponse.json(assignmentHistories);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}