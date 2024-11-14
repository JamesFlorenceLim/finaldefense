import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop(); // Extract the ID from the URL

  if (!id) {
    return NextResponse.json({ message: 'ID is required' }, { status: 400 });
  }

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

  console.log('Received data:', {
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
  });

  if (!plate_number || !engine_no || !chassis_no) {
    return NextResponse.json(
      { message: 'Plate number, engine number, and chassis number are required' },
      { status: 400 }
    );
  }

  // Validate and parse the weights and capacities
  const parsedGrossWeight = gross_weight ? parseFloat(gross_weight) : null;
  const parsedNetWeight = net_weight ? parseFloat(net_weight) : null;
  const parsedShippingWeight = shipping_weight ? parseFloat(shipping_weight) : null;
  const parsedNetCapacity = net_capacity ? parseFloat(net_capacity) : null;
  const parsedYearLastRegistered = year_last_registered ? parseInt(year_last_registered, 10) : null;

  if (
    (gross_weight && isNaN(parsedGrossWeight ?? NaN)) ||
    (net_weight && isNaN(parsedNetWeight ?? NaN)) ||
    (shipping_weight && isNaN(parsedShippingWeight ?? NaN)) ||
    (net_capacity && isNaN(parsedNetCapacity ?? NaN)) ||
    (year_last_registered && isNaN(parsedYearLastRegistered ?? NaN))
  ) {
    return NextResponse.json({ message: 'Invalid weight, capacity, or year values' }, { status: 400 });
  }

  try {
    const updatedVan = await prisma.van.update({
      where: { id: Number(id) },
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
        gross_weight: parsedGrossWeight,
        net_weight: parsedNetWeight,
        shipping_weight: parsedShippingWeight,
        net_capacity: parsedNetCapacity,
        year_last_registered: parsedYearLastRegistered,
        expiration_date: expiration_date ? new Date(expiration_date) : null,
      },
    });

    return NextResponse.json(updatedVan, { status: 200 });
  } catch (error: any) {
    console.error("Error updating van:", error);
    return NextResponse.json(
      { message: 'Failed to update van', error: error.message },
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