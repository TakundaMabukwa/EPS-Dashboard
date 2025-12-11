export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const upgradeHeader = req.headers.get('upgrade')
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 })
  }

  return new Response(null, { status: 101 })
}
