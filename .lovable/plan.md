## Goal
On `/ai-demo`, the visitor types a website URL. We crawl it, push the content into the GHL widget's knowledge base, then overlay the trained widget (ID `6a3be0987de81c3360287a78`) inside the iPhone preview. Target ~30–60s with a step-by-step progress UI.

## UX (AiDemoPage)
```
[ https://example.com  ] [ Train widget → ]

Progress (shown after submit):
 ✓ Crawling website
 ✓ Extracting content
 ✓ Training AI on your site
 ✓ Loading live widget
```
On completion, iPhone screen swaps to the trained chat widget overlay (existing widget overlay code, just unhidden + script injected).

## Backend: new edge function `train-ai-demo-widget`
Input: `{ url: string }`. Steps:
1. **Crawl** — fetch `${url}` + `${url}/sitemap.xml` (fallback: parse anchors from homepage), grab up to ~15 pages, strip HTML to text via a lightweight regex/`DOMParser` extraction.
2. **Summarize** — call Lovable AI (`google/gemini-2.5-flash`) with all page text → produce a structured "About / Services / FAQ / Tone" knowledge document (markdown, ≤ ~6k tokens).
3. **Push to GHL** — using `AI_DEMO_PIT` (location PIT for the widget's sub-account), POST the knowledge document to the GHL knowledge-base endpoint for that location, tagged to widget `6a3be0987de81c3360287a78`. Endpoint is implemented against GHL's `/conversations/ai-bot/knowledge-base` style API; if shape differs, returns the upstream error verbatim so we can iterate.
4. Return `{ ok: true, widgetId, knowledgeId, summaryPreview }`.

CORS + Zod validation on input. Public function (no JWT) so anonymous demo visitors can use it; rate-limit ad-hoc by checking a 60s in-memory cache keyed by URL.

## Frontend changes in `src/pages/AiDemoPage.tsx`
- Add a `<form>` above the iPhone with URL input + "Train" button.
- Add `trainingState`: `idle | crawling | extracting | training | loading | ready | error` driving a stepper.
- On submit → `supabase.functions.invoke('train-ai-demo-widget', { body: { url }})`.
- On `ready`, mount the GHL widget script (existing logic) so the iPhone shows the trained widget. Keep the click-to-open behavior already in place.
- Show error toast with upstream message if the function fails.

## Secrets
Request a new secret `AI_DEMO_PIT` via `add_secret` (location PIT for the sub-account that owns widget `6a3be0987de81c3360287a78`). `LOVABLE_API_KEY` already present for AI calls.

## Out of scope
- No DB tables (purely transactional demo).
- No per-visitor isolation — every crawl overwrites the same widget's KB. Acceptable for a demo; flagged so we know.
- No real-time crawl progress streaming; the stepper advances on milestones returned by the function (single response with timings).

## Risks / open items
- GHL's knowledge-base endpoint shape isn't fully publicly documented; first run will likely need a follow-up to adjust the request body once we see GHL's response.
- 30–60s budget assumes ≤15 pages and Gemini Flash. Heavier sites will run longer.