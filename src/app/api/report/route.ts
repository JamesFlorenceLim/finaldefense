import { PrismaClient } from '@prisma/client'; 
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const vanDriverOperatorId = url.searchParams.get('vanDriverOperatorId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    console.log('Request Parameters:', { type, vanDriverOperatorId, startDate, endDate });

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
            const parsedStartDate = startDate ? new Date(startDate) : new Date(0);
            const parsedEndDate = endDate ? new Date(endDate) : new Date();
            console.log('Parsed Dates:', { parsedStartDate, parsedEndDate });

            const history = await prisma.assignmentHistory.findMany({
                where: {
                    Assignment: {
                        van_driver_operator_id: parseInt(vanDriverOperatorId),
                        assigned_at: {
                            gte: parsedStartDate,
                            lte: parsedEndDate,
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
            console.log('Assignment History:', history); // Log the response data
            return NextResponse.json(history);
        } else if (type === 'recentDrivers') {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const recentDrivers = await prisma.assignmentHistory.findMany({
                where: {
                    timestamp: {
                        gte: tenDaysAgo,
                    },
                },
                include: {
                    Assignment: {
                        include: {
                            VanDriverOperator: {
                                include: {
                                    Driver: true,
                                    Van: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });
            return NextResponse.json(recentDrivers);
        } else if (type === 'terminalStats') {
            const terminalStats = await prisma.assignmentHistory.groupBy({
                by: ['terminal'],
                _count: {
                    terminal: true,
                },
                orderBy: {
                    _count: {
                        terminal: 'desc',
                    },
                },
            });
            return NextResponse.json(terminalStats);
        } else {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}