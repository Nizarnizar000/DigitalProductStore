export async function POST() {
  return Response.json({ error: "Customer accounts are disabled." }, { status: 404 });
}
