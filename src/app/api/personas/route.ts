import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const persons = await prisma.person.findMany({ include: { program: true }, orderBy: { id: "asc" } })
    return NextResponse.json(persons)
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json()
        const person = await prisma.person.create({
            data: {
                ...data,
                programId: data.programId ? parseInt(data.programId) : null,
            }
        })
        return NextResponse.json(person, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Error al crear la persona" }, { status: 400 })
    }
}
