import { PrismaClient, TerminalType } from '@prisma/client'; 
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const vanDriverOperatorId = url.searchParams.get('vanDriverOperatorId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    try {
        if (type === 'vanDriverOperators') {
            const vanDriverOperators = await prisma.vanDriverOperator.findMany({
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
                        },
                    },
                },
            });
            return NextResponse.json(vanDriverOperators);
        } else if (type === 'assignmentHistory' && vanDriverOperatorId) {
            const history = await prisma.assignmentHistory.findMany({
                where: {
                    Assignment: {
                        van_driver_operator_id: parseInt(vanDriverOperatorId),
                        assigned_at: {
                            gte: startDate ? new Date(startDate) : new Date(0),
                            lte: endDate ? new Date(endDate) : new Date(),
                        },
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
                select: {
                    id: true,
                    event: true,
                    timestamp: true,
                    terminal: true,
                },
            });
            return NextResponse.json(history);
        } else {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}