// app/api/debug-env/route.ts
export async function GET() {
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
  return new Response("Check your terminal");
}
