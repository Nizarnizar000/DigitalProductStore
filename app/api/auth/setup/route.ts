export async function POST() {
  return Response.json({ error: "Initial setup is disabled. Seed the Super Admin directly in the database." }, { status: 404 });
}
