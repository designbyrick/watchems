export async function GET() {
  const content = `# Watchems

> A community watch photo gallery featuring photographs and uploads from watch enthusiasts. Browse watches at every price point from Seiko and Casio to Rolex and Patek Philippe, with no affiliate links or sponsored content.

## Site structure

- **Home**: https://watchems.com — community photo gallery
- **Brands**: https://watchems.com/brands — every brand with real wrist photos (e.g. https://watchems.com/brand/seiko)
- **Watch models**: https://watchems.com/watches — model hubs with owner photos (e.g. https://watchems.com/w/{watch-slug})
- **Styles**: https://watchems.com/styles — dive, dress, field, pilot, chronograph, GMT and more (e.g. https://watchems.com/style/dive-watches)
- **Buying guides**: https://watchems.com/buying-guides — editorial picks by budget

## Brands covered

Rolex, Omega, Tudor, Grand Seiko, Seiko, Breitling, Tag Heuer, IWC, Cartier, Panerai, Longines, Hamilton, Tissot, Zenith, Frederique Constant, Nomos, Baltic, Christopher Ward, Casio, Citizen, and more.

## Example queries

- "Help me choose a watch" → https://watchems.com/buying-guides
- "Show me dive watches" → https://watchems.com/style/dive-watches
- "What does a Seiko look like on the wrist?" → https://watchems.com/brand/seiko
- "Best watches under $500" → https://watchems.com/buying-guide/under-500
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
