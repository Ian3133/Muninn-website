# Events and Ongoing Stories: Ruthless Product and Pipeline Review

Updated: 2026-07-25

## Executive verdict

The Events product has the right reason to exist but the public data is not yet
trustworthy enough to carry the full design.

Today answers, "What matters now?" Events should answer, "What changed, what is
still unresolved, and how did we get here?" The old page was too close to a
filterable list of repeated headlines. The new page direction fixes the
presentation hierarchy, but the backend still needs to finish the move from a
flat Event memory to the typed model:

`Story -> Event -> Storyline`

The public label for `storyline` remains **Ongoing Story**.

The current artifact makes the migration problem concrete:

- `tracked_event_count` is 118, while only 29 records are published.
- Only 15 of those 29 records contain at least two public developments and are
  eligible for the Events page.
- Almost every eligible record is labeled Developing Event. Only one record
  reaches the legacy `timeline` stage used as the Ongoing Story fallback.
- Iran War and FIFA World Cup coverage are fragmented across multiple records.
- At the same time, one Iran War record combines military action, congressional
  war-powers action, Red Sea escalation, and oil prices. Those developments
  belong to one broad Storyline, but not necessarily one bounded Event.
- Images are not owned by Event or Storyline records. The page can only borrow
  an image from a matching Story in the current daily digest.

This is not a cosmetic problem. The page will feel coherent only when the data
model can say which object is a bounded Event, which is an Ongoing Story, which
updates belong to each, and which visual permanently represents that object.

## What the Events page must do

1. Lead with meaningful change, not container names.
2. Keep the Event or Ongoing Story identity visible on every card.
3. Make "latest update" and "story so far" visibly different.
4. Let people move horizontally through a large set without creating an
   exhausting wall of cards.
5. Keep search and filters useful without making the page look like an admin
   database.
6. Show only confirmed tracked coverage. A predicted follow-up is not an Event.
7. Preserve a stable public title, URL, visual, summary, and identity even when
   daily Stories change.
8. State dates honestly. "First reported by Muninn" is not the same as "the
   Event happened on this date."
9. Make the absence of an image intentional and replaceable.
10. Give every card a clear next action: open the record, not merely read
    another duplicated headline.

## Ruthless review of the previous UI

### Information hierarchy

- The old page began immediately with cards and did not explain why Events was
  different from Today.
- Event identity and newest development had similar visual weight, so users
  could not tell whether a headline named the container or the update.
- "Developing Event" appeared on nearly everything. A label with no contrast
  stops carrying meaning.
- "Newest Events" and "Latest developments" could look like duplicate sections
  because the same records appeared in both without a different editorial
  treatment.
- The vertical directory turned a context product into a database export.
- The category matrix occupied substantial space before the user saw results.
- Search, category, activity, stage, and type concepts were not clearly
  separated.
- Counts were presented without explaining whether they counted Stories,
  developments, sources, Events, or candidates.

### Cards and imagery

- Cards depended on a same-day Story match for artwork. An Event could have an
  image today and lose it after the digest changed.
- Missing images changed card geometry instead of using one stable layout.
- A generic gradient is safer than an inaccurate photo, but it should look like
  a deliberate Event file, not an error state.
- The visual did not have a durable credit, role, focal point, or replacement
  contract at the Event level.
- Images were treated as decoration even when they should establish place,
  person, or physical stakes.
- There was no distinction between documentary photography, locator graphics,
  data graphics, and AI editorial illustration.

### Browsing and interaction

- Horizontal swiping appeared only at narrower viewports even though desktop
  users also face a large catalog.
- There were no explicit previous/next controls for mouse and keyboard users.
- The directory did not show that it was sorted, and it could not switch
  between newest update, newest container, and most-developed coverage.
- Type filtering was missing, which will become a serious problem once
  Storylines are published.
- Category buttons were dense and visually competed with the actual coverage.
- A filter result could include an Ongoing Story and a child Event without
  explaining their relationship.

### Copy and language

- "Everything has a home" is too absolute while the organization layer is still
  shadow-only.
- "Recently confirmed" implies an editorial state that the legacy public
  artifact does not explicitly store.
- "Timeline" leaks a presentation concept into the content taxonomy.
- "Open timeline" describes a page component; "Story so far" describes the
  user's goal.
- Long autogenerated titles frequently repeat the newest Story instead of
  naming the durable Event.

## UI now implemented

- A compact tracking snapshot explains the purpose of the page.
- Three statistics show public tracked containers, updates today, and total
  meaningful developments.
- Latest developments use wide cards with text on the left and supporting art
  on the right, echoing Top News.
- The Event/Ongoing Story name is the card title; the newest Story is explicitly
  labeled "What changed."
- Latest, newly tracked, and all-coverage sections are horizontally swipeable at
  desktop, tablet, and mobile sizes.
- Each rail includes previous/next controls and remains keyboard focusable.
- Event visuals prefer an explicit Event image, then an Event presentation
  image, then a matching current Story image.
- Records without art render a stable editorial Event-file placeholder.
- Explore All Coverage supports text search, Event/Ongoing Story filtering,
  category filtering, and three sort orders.
- Cards retain the existing quiet gray category and amber tracked-coverage
  labels.
- Missing, loading, empty, and no-result states remain present.
- Responsive styles switch wide feature cards to image-over-text cards on
  narrow screens.
- Reduced-motion preferences remove card and image transitions.

## Required public data contract

The frontend should eventually consume one public coverage artifact rather than
reverse-engineering typed meaning from legacy Event fields.

```json
{
  "schema_version": 1,
  "generated_at": "2026-07-25T12:00:00Z",
  "coverage": [
    {
      "id": "storyline_iran_war",
      "coverage_type": "storyline",
      "public_label": "Ongoing Story",
      "slug": "iran-war",
      "title": "Iran War",
      "short_title": "Iran War",
      "dek": "Military, diplomatic, political, and economic consequences.",
      "status": "active",
      "editorial_state": "confirmed",
      "started_at": "2026-06-01",
      "last_meaningful_update_at": "2026-07-25T10:15:00Z",
      "date_basis": "source_stated",
      "primary_category": "World",
      "topic_ids": ["topic_iran"],
      "child_event_ids": [
        "event_hormuz_shipping_attacks",
        "event_us_iran_strikes",
        "event_us_war_powers_vote"
      ],
      "latest_development": {
        "story_id": "story_example",
        "title": "House passes resolution limiting military action",
        "summary": "A concise, source-grounded description of what changed.",
        "reported_at": "2026-07-25T10:15:00Z",
        "occurred_at": "2026-07-25T09:40:00Z",
        "date_basis": "source_stated",
        "independent_source_count": 4
      },
      "presentation": {
        "rank_score": 0.91,
        "development_count": 24,
        "event_count": 5,
        "unresolved_questions": [
          "Whether shipping restrictions will be lifted"
        ]
      },
      "image": {
        "url": "/coverage/iran-war/hero.jpg",
        "alt": "Cargo ships moving through the Strait of Hormuz",
        "credit": "Publisher or Muninn",
        "license": "licensed",
        "role": "documentary",
        "focal_x": 0.56,
        "focal_y": 0.45,
        "safe_to_crop": true,
        "semantic_confidence": 0.94,
        "updated_at": "2026-07-25T11:00:00Z"
      }
    }
  ]
}
```

## Backend and pipeline changes

### P0: Stop publishing misleading organization

1. Publish explicit `coverage_type`; stop inferring Ongoing Story from
   `presentation.stage === "timeline"`.
2. Give every public container a stable ID and slug that survives title edits.
3. Separate Event identity from Storyline identity in public output.
4. Keep Topics out of same-Event matching.
5. Do not use matching `topic_label` as positive proof of Event identity.
6. Raise or replace the legacy deterministic threshold that currently permits
   broad merges around a score of 0.38.
7. Treat `same_story`, `new_development_in_event`, and
   `new_event_in_storyline` as different decisions with different evidence.
8. Add negative evidence: conflicting location, different named victim,
   different case number, different election, different storm, or different
   causal chain.
9. Add an explicit `needs_review` relationship state instead of forcing a
   merge-or-separate result.
10. Measure false merges before recall. One false Event can corrupt every
    future match.
11. Create canonical Storylines for Iran War, Ukraine War, and 2026 FIFA World
    Cup as controlled evaluation fixtures.
12. Reparent their bounded child Events without deleting any Story IDs.
13. Merge exact duplicate containers only through audited editorial actions.
14. Preserve redirect aliases when a public container is merged or renamed.
15. Prevent a one-Story candidate from entering the public Events artifact.

### P0: Make the artifact honest

16. Replace the ambiguous `tracked_event_count` with explicit counts:
    `story_candidate_count`, `event_candidate_count`, `public_event_count`,
    `public_storyline_count`, and `archived_count`.
17. Emit `first_reported_at`, `occurred_at`, and `date_basis` separately.
18. Emit `last_seen_at` separately from `last_meaningful_update_at`.
19. Define a meaningful update as a state change, not another article or
    rewritten summary.
20. Keep repeated wire copies as one evidence lineage.
21. Count independent reporting organizations, not URLs.
22. Mark Google News as a discovery route, not an independent publisher.
23. Emit source lineage and syndication keys.
24. Publish integrity state and suppress records with unresolved critical
    review flags.
25. Include the exact latest public development object; do not make the
    frontend sort and select raw timeline entries.
26. Include public Event and Storyline summaries written for durable identity,
    not copied from the first or latest Story.
27. Include unresolved questions and expected milestones only when
    source-grounded or explicitly editorial.
28. Version the public schema and provide a migration window.

### P1: Finish typed organization

29. Run the typed organizer over at least 30 valid historical editions.
30. Build a labeled replay set with correct same-Story, Event, Storyline, Topic,
    and unrelated decisions.
31. Report precision and recall separately for every relationship class.
32. Track false merge, false split, late promotion, premature promotion,
    incorrect archive reopen, and classification reversal rates.
33. Add editorial locks so reviewed identities and relationships are not
    silently overwritten.
34. Add merge, split, reparent, close, reopen, rename, and alias actions.
35. Add expected-milestone protection with an expiration and source.
36. Add a persistent organization review queue.
37. Store the candidates considered for each decision.
38. Store positive evidence, negative evidence, confidence, model, prompt
    version, and decision timestamp.
39. Make every mutation reversible.
40. Distinguish auto-generated summaries from editor-approved summaries.
41. Require a higher publication threshold than the private candidate
    threshold.
42. Add a quarantine path for high-interest but low-confidence coverage.
43. Do not let popularity or source volume compensate for weak identity.
44. Compare the typed output against the legacy output daily before migration.

### P1: Lifecycle and archive

45. Keep lifecycle state separate from editorial confirmation state.
46. Close bounded Events when the causal episode ends, even if the broader
    Storyline continues.
47. Let a Storyline cool without implying it is resolved.
48. Emit `resolved`, `closed`, `cooling`, `dormant`, and `archived` with clear
    product definitions.
49. Create compact archive capsules with stable evidence pointers.
50. Verify that every condensed development can be reconstructed from cold
    Story and source storage.
51. Keep public archive search separate from hot matching.
52. Reopen only on strong identity evidence or editorial action.
53. Prevent a reused person, country, or generic topic from reopening an
    unrelated Event.
54. Add lifecycle tests around court dates, elections, storms, tournaments,
    investigations, and wars.

### P1: Event-specific image pipeline

55. Make the image belong to the Event or Storyline, not to today's Story.
56. Store a permanent hero image and an optional newest-development image.
57. Keep documentary images, maps, data graphics, and AI editorial
    illustrations as explicit roles.
58. Require subject/entity agreement before assigning a person-focused image.
59. Reject incidental people and ambiguous group photos.
60. Store alt text, credit, source URL, license, crop permission, focal point,
    semantic confidence, and review state.
61. Never silently reuse a Story image when its subject is narrower than the
    parent Storyline.
62. Refresh a Storyline visual only for a deliberate reason; avoid daily visual
    churn.
63. Create safe desktop-wide and mobile-tall crops.
64. Keep the CSS Event-file placeholder until a reviewed image is available.
65. Add an admin preview showing the image beside container title, latest
    development, entities, and intended role.
66. Audit images after container merges and reparenting.

### P2: Product depth

67. Add a "Start here" three-sentence orientation for long Storylines.
68. Add a "What changed since your last visit" state stored locally first.
69. Add child Event navigation inside Storyline pages.
70. Add a compact unresolved-questions panel.
71. Add milestone navigation for long records.
72. Let users follow an Event without forcing newsletter signup.
73. Add archive browsing by month and status.
74. Add related Topics as secondary navigation, never as implied chronology.
75. Add a transparent correction and relationship-change log.
76. Add shareable links to a specific development.
77. Add a text-only low-bandwidth mode.
78. Add event-page structured metadata for search without exposing private
    candidates.
79. Add analytics for rail depth, filter usage, search success, timeline opens,
    and immediate back-outs.
80. Use those measurements to tune ranking, not identity matching.

## Frontend follow-up backlog

1. Split the Events view out of `LegacyHome.jsx`.
2. Create typed `CoverageCard`, `CoverageRail`, `CoverageFilters`, and
   `CoverageArtwork` components.
3. Remove the disabled legacy Events markup after the new view is accepted.
4. Add component tests for missing images, malformed dates, missing
   developments, and unknown types.
5. Add tests for search across titles, entities, latest development, and
   aliases.
6. Add tests for every sort order.
7. Add tests ensuring category filtering never changes identity.
8. Add keyboard tests for rail controls and card focus order.
9. Add right-to-left-safe logical scrolling if the product localizes.
10. Add live scroll-position state so arrow buttons can become disabled at the
    beginning and end.
11. Preserve rail position when a user returns from a timeline page.
12. Put active filters in the URL for shareable searches.
13. Add a compact filter drawer only if mobile data shows the current controls
    are too long.
14. Add a list view as an accessibility preference, not as the default.
15. Avoid infinite scroll; use archive boundaries and explicit continuation.
16. Add skeletons that match the final card geometry.
17. Add stale-artifact messaging when `generated_at` is older than expected.
18. Add an integrity-safe hidden state rather than rendering malformed records.
19. Make source counts explainable on hover/focus or on the detail page.
20. Keep public confidence scores off the card face unless the product explains
    how to interpret them.

## Initial image briefs for current public coverage

These are direction briefs, not final prompts. Every generated or selected
image still needs entity and editorial review.

1. **Iran War / Ongoing Story** — Wide regional locator view centered on the
   Strait of Hormuz and Red Sea shipping routes, restrained navy/amber palette,
   no invented explosions, no portrait montage.
2. **U.S.-Saudi Nuclear Deal / Event** — Documentary-style signing table with
   U.S. and Saudi visual identifiers and civilian nuclear-energy context; avoid
   reactor-disaster imagery.
3. **Tropical Storms / Event** — Satellite-style Gulf weather system with a
   clearly legible coast silhouette; no fake forecast cone unless sourced.
4. **Netanyahu Arrest Warrant / Event** — Civic/legal visual joining New York
   city jurisdiction and international-court context; avoid implying an arrest
   occurred.
5. **Arizona Governor Race / Event** — Arizona state outline and election-night
   reporting environment; do not fabricate vote totals.
6. **U.S.-Canada Trade Dispute / Event** — Border freight corridor, trucks, and
   tariff paperwork; avoid generic handshake stock art.
7. **Tate Brothers Arrest / Event** — Miami courthouse or law-enforcement
   perimeter; use identifiable people only with verified licensed imagery.
8. **U.K. Prime Minister Transition / Event** — Downing Street arrival or
   handover symbolism; do not imply a specific ceremony without evidence.
9. **Ukraine Conflict / Ongoing Story** — Geographic or infrastructure context
   tied to the latest bounded child Event; avoid generic battlefield spectacle.
10. **Cockroach Movement Protests / Event** — Verified protest location and
    crowd signage when available; otherwise an editorial street-map treatment.
11. **Yemen Conflict / Ongoing Story** — Red Sea maritime map or verified port
    infrastructure; distinguish it visually from the broader Iran Storyline.
12. **2026 FIFA World Cup / Ongoing Story** — Stadium-wide tournament identity
    with neutral match context; avoid using a specific team image for the whole
    Storyline.
13. **Election Security Claims / Event** — Ballot-processing environment and
    verification documentation; avoid visual language that validates an
    unproven claim.
14. **U.S.-Lebanon Relations / Event** — Beirut airport or diplomatic arrival
    context with verified location cues; avoid generic Middle East skyline art.
15. **Congo Ebola Outbreak / Event** — Public-health response, clinic logistics,
    or region map; protect patient dignity and avoid sensational close-ups.

## Acceptance criteria before typed publication

- At least 95% precision for automatic `new_development_in_event` links on the
  labeled replay set.
- At least 98% precision for automatic `new_event_in_storyline` links.
- Zero public candidates with only one Story unless explicitly editor-approved.
- Zero same-Event decisions based only on Topic equality.
- Every public container has a stable slug, explicit type, durable summary, and
  source-grounded latest development.
- Every image has a role, provenance, license state, alt text, and semantic
  review state.
- Every displayed date has a declared basis.
- Every merge, split, reparent, close, and reopen is auditable and reversible.
- The public payload can be rebuilt from stored Stories and evidence.
- Desktop, tablet, and mobile layouts have no page-level horizontal overflow;
  only the rails scroll horizontally.
- Keyboard users can reach cards and operate every rail.
- Empty, loading, stale, malformed, image-missing, and no-result states are
  verified.

## Bottom line

The new UI can now scale visually, but the product should not confuse a cleaner
card system with solved information architecture. The highest-value work is
backend precision, explicit typed publication, durable Event/Storyline images,
and editorial repair tools. Until those exist, the frontend should stay
conservative: show confirmed multi-development coverage, preserve source
grounding, label dates honestly, and never invent relationships just to fill a
rail.
