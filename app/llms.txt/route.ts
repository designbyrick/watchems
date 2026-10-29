// Static content: keep it prerendered (Next 15 no longer caches GET handlers by default)
export const dynamic = 'force-static'

export async function GET() {
  const content = `# Watchems

> A community watch photo gallery featuring photographs and uploads from watch enthusiasts. Browse watches at every price point from Seiko and Casio to Rolex and Patek Philippe, with no affiliate links or sponsored content.

## Site structure

- **Home**: https://watchems.com — community photo gallery
- **Quiz**: https://watchems.com/quiz — interactive watch finder quiz

## Brands covered

Rolex, Omega, Tudor, Grand Seiko, Seiko, Breitling, Tag Heuer, IWC, Cartier, Panerai, Longines, Hamilton, Tissot, Zenith, Frederique Constant, Nomos, Baltic, Christopher Ward, Casio, Citizen, and more.

## Example queries

- "Help me choose a watch" → https://watchems.com/quiz
- "Show me dive watches" → https://watchems.com — search/filter gallery
- "Best beginner watches" → https://watchems.com — explore community photos
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
