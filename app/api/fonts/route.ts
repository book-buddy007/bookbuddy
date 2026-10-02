import { NextResponse } from 'next/server';

export async function GET() {
    const googleFonts = [
        { family: "Inter", styles: ["400", "500", "600", "700"] },
        { family: "Roboto", styles: ["400", "500", "700"] },
        { family: "Outfit", styles: ["400", "600", "800"] },
        { family: "Open Sans", styles: ["400", "600", "700"] },
        { family: "Lato", styles: ["400", "700"] },
        { family: "Montserrat", styles: ["400", "600", "700"] }
    ];
    return NextResponse.json(googleFonts);
}
