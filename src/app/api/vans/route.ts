import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



export async function POST(req: NextRequest) {
  try {
    const {
      mv_file_no,
      plate_number,
      engine_no,
      chassis_no,
      denomination,
      piston_displacement,
      number_of_cylinders,
      fuel,
      make,
      series,
      body_type,
      body_no,
      year_model,
      gross_weight,
      net_weight,
      shipping_weight,
      net_capacity,
      year_last_registered,
      expiration_date,
    } = await req.json();

    if (!plate_number || !engine_no || !chassis_no) {
      return NextResponse.json(
        { message: 'Plate number, engine number, and chassis number are required' },
        { status: 400 }
      );
    }

    const newVan = await prisma.van.create({
      data: {
        mv_file_no: mv_file_no || null,
        plate_number,
        engine_no,
        chassis_no,
        denomination: denomination || null,
        piston_displacement: piston_displacement || null,
        number_of_cylinders: number_of_cylinders ? parseInt(number_of_cylinders, 10) : null,
        fuel: fuel || null,
        make: make || null,
        series: series || null,
        body_type: body_type || null,
        body_no: body_no || null,
        year_model: year_model ? parseInt(year_model, 10) : null,
        gross_weight: gross_weight ? parseInt(gross_weight, 10) : null,
        net_weight: net_weight ? parseInt(net_weight, 10) : null,
        shipping_weight: shipping_weight ? parseInt(shipping_weight, 10) : null,
        net_capacity: net_capacity ? parseInt(net_capacity, 10) : null,
        year_last_registered: year_last_registered ? parseInt(year_last_registered, 10) : null,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
      },
    });

    return NextResponse.json(newVan, { status: 201 });
  } catch (error: any) {
    console.error("Error creating van:", error);
    return NextResponse.json(
      { message: 'Failed to add van', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const vans = await prisma.van.findMany({
      where: { archived: false },
    });
    return NextResponse.json(vans);
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Failed to retrieve vans', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: 'Van ID is required' },
        { status: 400 }
      );
    }

    const updatedVan = await prisma.van.update({
      where: { id: Number(id) },
      data: { archived: true },
    });

    return NextResponse.json(
      { message: 'Van archived successfully', van: updatedVan },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Failed to archive van', error: error.message },
      { status: 500 }
    );
  }
}