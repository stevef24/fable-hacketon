# F3 · Shophouses with rooflines instead of plain boxes

**Owner:** @1320group (P4) · **Priority:** 4

`City.tsx` instances bare boxes for buildings. Real Chiang Mai shophouses have pitched roofs, balconies, shopfront awnings, and vary in width along a terrace.

Keep using drei `<Instances>` — we need hundreds of these and the frame budget matters. Two or three prefab silhouettes randomised along the road will read far better than one box with a random scale. A temple roof and a chedi silhouette inside the moat would sell the skyline from anywhere on the lap.

**Done when:** the horizon reads as a city rather than as a bar chart.
