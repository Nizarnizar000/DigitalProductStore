export async function POST() {
  return Response.json({ error: "Initial setup is disabled." }, { status: 404 });
}
