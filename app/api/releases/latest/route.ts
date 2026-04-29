export async function GET() {
  const res = await fetch(
    'https://api.github.com/repos/OctoverianSpark/actimetrics/releases/latest',
    {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      },
      next: { revalidate: 3600 }
    }
  )

  if (!res.ok) return Response.json(null, { status: res.status })

  const data = await res.json()

  const assets: { name: string; url: string }[] = (data.assets ?? [])
    .filter((a: { name: string }) => a.name.endsWith('.exe') || a.name.endsWith('.msi'))
    .map((a: { name: string; browser_download_url: string }) => ({
      name: a.name,
      url: a.browser_download_url,
    }))

  return Response.json({
    tag_name: data.tag_name,
    html_url: data.html_url,
    assets,
  })
}
