# Public homepage visual enhancement

The landing page now combines the existing interactive graph preview with:

- A subdued immune-cell illustration in the opening band.
- A section navigation strip for biology, tools, evidence and learning.
- An accessible tabbed explorer for cells, mechanisms and disease context.
- Illustrated, fully clickable destination cards for Graph, Ask and Library.
- Teal, warm peach and neutral panels, with boxed evidence principles.
- Visible keyboard focus, arrow/Home/End tab behaviour and reduced-motion support.

The duplicate lower RA mechanism preview was removed to shorten the page: its
interactive relationships remain in the opening graph preview. The new sections
link only to public scientific/learning destinations. The internal test workbench
and protected operational routes are not reintroduced into the public flow.

Images reuse the repository's existing artwork. The biology explorer explicitly
labels its pictures as illustrations, not research images. No image represents
patient data, a new scientific result or a validated model output. Below-fold
images are lazy-loaded, have explicit dimensions and are served locally.

Four browser checks passed across desktop/mobile: topic changes, keyboard
navigation, real graph-concept links, image loading, public navigation and
anonymous denial at protected tools. TypeScript and the production build passed.
Screenshots were inspected for hierarchy, image placement and viewport overflow.
Database readiness and production deployment were not verified by this UI change.
