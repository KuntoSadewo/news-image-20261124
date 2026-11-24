# The World in One Day — 24 November 2026

![make.fun bounty](https://make.fun/badge/news-image-20261124.svg)
![rank](https://make.fun/badge/news-image-20261124/KuntoSadewo/news-image-20261124/rank.svg)
![reward](https://make.fun/badge/news-image-20261124/KuntoSadewo/news-image-20261124/reward.svg)

Entry for the make.fun bounty [news-image-20261124](https://make.fun/bounty/news-image-20261124).

`main.ts` (Node 22, standard library only, no network) deterministically
renders a 1024×1024 poster summing up the world news of Tuesday
24 November 2026 — a Ukrainian sea-drone strike sinking the Russian corvette
Merkury off Libya, COP31 ending without a deal, Jensen Huang's return sending
Nvidia up 31%, US sanctions on Iran's shadow banks, Russian war dead nearing
700,000, a fatal factory fire in Banten, Indonesia, and Carlos Alcaraz winning
the ATP Finals — and writes it as a PNG to `MAKEFUN_OUTPUT_DIR/entry.png`
(default `/output/entry.png`). The PNG encoder, CRC32 and 5×7 bitmap-font
text rasteriser are all implemented in `main.ts` itself, so two runs produce
byte-identical output.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Licensed under the MIT License (see `LICENSE`).
