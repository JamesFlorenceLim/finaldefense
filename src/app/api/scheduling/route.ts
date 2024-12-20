import { PrismaClient, TerminalType, AssignmentStatus } from '@prisma/client'; 
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const url = new URL(request.url);
    const terminal = url.searchParams.get('terminal') as TerminalType | null; 
    const status = url.searchParams.get('status');

    if (!terminal || !(terminal === 'terminal1' || terminal === 'terminal2')) { 
        return NextResponse.json({ error: 'Valid terminal parameter is required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const schedule = await prisma.schedule.findUnique({
            where: { date: today },
        });

        if (!schedule) {
            return NextResponse.json({ error: 'No schedule found for today' }, { status: 404 });
        }

        const whereClause: any = { terminal, schedule_id: schedule.id };
        if (status) whereClause.status = status;

        const assignments = await prisma.assignment.findMany({
            where: whereClause,
            orderBy: {
                order: 'asc',
            },
            include: {
                VanDriverOperator: {
                    include: {
                        Van: {
                            select: {
                                plate_number: true,
                            },
                        },
                        Driver: {
                            select: {
                                firstname: true,
                                lastname: true,
                                contact: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(assignments);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const body = await request.json();
    const { id, status, terminal, order, arrivalTime, departureTime } = body;

    if (typeof id !== 'number' || !status || !terminal) {
        return NextResponse.json({ error: 'ID, status, and terminal are required and must be valid' }, { status: 400 });
    }

    if (!['terminal1', 'terminal2'].includes(terminal)) {
        return NextResponse.json({ error: 'Invalid terminal type' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const schedule = await prisma.schedule.findUnique({
            where: { date: today },
        });

        if (!schedule) {
            return NextResponse.json({ error: 'No schedule found for today' }, { status: 404 });
        }

        let newTerminal: TerminalType | undefined;

        const updateData: any = { status, terminal: newTerminal, order };

        if (status === 'queued') {
            updateData.queued_at = new Date();
            updateData.departureTime = null;
            const lastAssignment = await prisma.assignment.findFirst({
                where: { terminal, status: 'queued', schedule_id: schedule.id },
                orderBy: { order: 'desc' },
            });
            const nextOrder = lastAssignment ? lastAssignment.order + 1 : 1;
            updateData.order = nextOrder;

            newTerminal = terminal; // Keep the terminal the same for queued status

        } else if (status === 'departed') {
            const firstInQueue = await prisma.assignment.findFirst({
                where: { terminal, status: 'queued', schedule_id: schedule.id },
                orderBy: { order: 'asc' },
            });

            if (!firstInQueue || firstInQueue.id !== id) {
                return NextResponse.json({ error: 'Only the first van in the queue can be marked as departed.' }, { status: 400 });
            }

            newTerminal = terminal === 'terminal1' ? 'terminal2' : 'terminal1';
            updateData.terminal = newTerminal;
            updateData.departureTime = new Date();
            updateData.arrivalTime = null;

        } else if (status === 'arrived' || status === 'idle') {
            updateData.arrivalTime = new Date();
            newTerminal = terminal === 'terminal1' ? 'terminal2' : 'terminal1'; // Update terminal to the opposite terminal for arrived or idle status
        }

        const updatedAssignment = await prisma.assignment.update({
            where: { id },
            data: updateData,
        });

        // Log the event to AssignmentHistory
        await prisma.assignmentHistory.create({
            data: {
                assignment_id: id,
                event: status,
                terminal: updatedAssignment.terminal, // Record the terminal from the updated assignment
                temporary_driver_id: updatedAssignment.temporary_driver_id, // Record the temporary driver if available
            },
        });

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('Update failed:', error);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const body = await request.json();
    const { id, status, terminal } = body;

    if (typeof id !== 'number' || !status || !terminal) {
        return NextResponse.json({ error: 'ID, status, and terminal are required and must be valid' }, { status: 400 });
    }

    if (!['terminal1', 'terminal2'].includes(terminal)) {
        return NextResponse.json({ error: 'Invalid terminal type' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const schedule = await prisma.schedule.findUnique({
            where: { date: today },
        });

        if (!schedule) {
            return NextResponse.json({ error: 'No schedule found for today' }, { status: 404 });
        }

        const updateData: any = { status, terminal };

        if (status === 'idle') {
            updateData.arrivalTime = new Date();
            updateData.order = 0; // Set order to 0 to be on top
        }

        const updatedAssignment = await prisma.assignment.update({
            where: { id },
            data: updateData,
        });

        // Log the event to AssignmentHistory
        await prisma.assignmentHistory.create({
            data: {
                assignment_id: id,
                event: status,
                terminal: updatedAssignment.terminal,
                temporary_driver_id: updatedAssignment.temporary_driver_id,
            },
        });

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        console.error('Update failed:', error);
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
}