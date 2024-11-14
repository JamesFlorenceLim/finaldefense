import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TerminalType } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const vanDriverOperators = await prisma.vanDriverOperator.findMany({
      select: {
        id: true,
        Van: {
          select: {
            plate_number: true,
          },
        },
      },
    });
    return NextResponse.json(vanDriverOperators);
  } catch (error: any) {
    console.error('Error retrieving van driver operators:', error);
    return NextResponse.json({ message: 'Failed to retrieve van driver operators', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vanDriverOperatorIds, scheduleId, terminal, temporaryDrivers } = await req.json();

    if (!vanDriverOperatorIds || !scheduleId || !terminal) {
      return NextResponse.json({ message: 'vanDriverOperatorIds, scheduleId, and terminal are required' }, { status: 400 });
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: parseInt(scheduleId, 10) },
    });

    if (!schedule) {
      return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
    }

    const assignments = await Promise.all(
      vanDriverOperatorIds.map(async (vanDriverOperatorId: string) => {
        const existingAssignment = await prisma.assignment.findFirst({
          where: {
            van_driver_operator_id: parseInt(vanDriverOperatorId, 10),
            Schedule: {
              date: schedule.date,
            },
          },
        });

        if (existingAssignment) {
          if (existingAssignment.terminal !== terminal) {
            throw new Error(`Van with ID ${vanDriverOperatorId} is already assigned to a different terminal on this day.`);
          }
          return null; // Skip creating a duplicate assignment
        }

        return prisma.assignment.create({
          data: {
            van_driver_operator_id: parseInt(vanDriverOperatorId, 10),
            schedule_id: parseInt(scheduleId, 10),
            terminal: terminal as TerminalType,
            temporary_driver_id: temporaryDrivers[vanDriverOperatorId] ? parseInt(temporaryDrivers[vanDriverOperatorId], 10) : null,
          },
        });
      })
    );

    const createdAssignments = assignments.filter(assignment => assignment !== null);

    return NextResponse.json(createdAssignments, { status: 201 });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ message: 'Failed to create assignment', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const vanDriverOperatorId = url.searchParams.get('vanDriverOperatorId');
    const scheduleId = url.searchParams.get('scheduleId');

    if (!vanDriverOperatorId || !scheduleId) {
      return NextResponse.json({ message: 'vanDriverOperatorId and scheduleId are required' }, { status: 400 });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        van_driver_operator_id: parseInt(vanDriverOperatorId as string, 10),
        schedule_id: parseInt(scheduleId as string, 10),
      },
    });

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });
    }

    await prisma.assignment.delete({
      where: { id: assignment.id },
    });

    return NextResponse.json({ message: 'Assignment deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ message: 'Failed to delete assignment', error: error.message }, { status: 500 });
  }
}