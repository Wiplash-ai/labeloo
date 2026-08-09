# Specialty Label Template Roadmap

Labeloo currently supports 13 verified rectangular US Letter layouts.

## Next release target

**Target: Labeloo v0.5.0.** The next template release is reserved for
non-standard and specialty stock. It should add shape-aware square, round,
oval, and business-card families without weakening print alignment. These
templates are backlog targets, not currently supported layouts.

## Verified next families

| Family | Canonical template | Size | Per sheet | Compatibility strategy |
| --- | --- | --- | ---: | --- |
| Square | Avery 22806 | 2 x 2 in | 12 | One geometry record plus compatible product aliases |
| Square | Avery 22805 | 1.5 x 1.5 in | 24 | Separate geometry record |
| Round | Avery 22807 | 2 in diameter | 12 | One geometry record plus listed aliases |
| Round | Avery 22830 | 2.5 in diameter | 9 | Separate geometry record |
| Oval | Avery 22804 | 1.5 x 2.5 in | 18 | One geometry record plus listed aliases |
| Oval | Avery 22820 | 2 x 3.333 in | 8 | Separate geometry record |
| Business card | Avery 5371 | 2 x 3.5 in | 10 | One geometry record plus listed aliases |

Official catalog pages confirm dimensions and per-sheet counts, but those two
values are not enough to print accurately. Each geometry record must also be
verified against the manufacturer's blank PDF for page size, top and left
margins, horizontal and vertical pitch, row ordering, and any staggered slots.

## Model changes

1. Add `shape` to templates: `rectangle`, `square`, `round`, or `oval`.
2. Keep width, height, margins, and pitch as the print source of truth.
3. Apply shape only to screen preview and print clipping. Text remains inside
   the shape's safe bounding box.
4. Map equivalent stock numbers to one canonical geometry. Do not duplicate a
   geometry just because material, finish, adhesive, or pack size differs.
5. Add optional explicit slot coordinates before supporting staggered,
   assorted-size, or mixed-shape sheets.
6. Add custom page dimensions before supporting A4 or continuous-roll stock.

## Verification gate

Every added template must pass:

- Geometry bounds test: every slot fits its declared page.
- Exact count and row-order test.
- Browser PDF at 100% scaling compared against the official blank PDF.
- First, middle, and last slot print calibration on plain paper.
- Alias review against the manufacturer's compatibility list.

## Sources

- https://www.avery.com/templates/category/square-labels
- https://www.avery.com/templates/category/round-labels
- https://www.avery.com/templates/category/oval-labels
- https://www.avery.com/templates/22804
- https://www.avery.com/templates/22807
- https://www.avery.com/templates/5371

Labeloo is not affiliated with or endorsed by Avery Products Corporation.
