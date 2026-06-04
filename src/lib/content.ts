// Reads the Keystatic JSON entries (src/content/tech/*.json) at build time and
// rebuilds the exact data shape the design's recall.js consumes:
//   window.RECALL_ORDER  = ['javascript', ...]   (by `order` field)
//   window.RECALL_CONTENT[id] = { name, blurb, topics[], book[] }
// Keystatic stores question/answer; recall.js expects q/a — so we map back.

type RawCard = { question: string; answer: string; long?: boolean; tag?: string };
type RawSub = { id: string; name: string; cards?: RawCard[] };
type RawTopic = { id: string; name: string; subtopics?: RawSub[] };
type RawBook = { id: string; title: string; html: string };
type RawTech = {
  name: string;
  blurb?: string;
  order?: number;
  updated?: string;
  topics?: RawTopic[];
  book?: RawBook[];
};

const modules = import.meta.glob<{ default: RawTech }>('../content/tech/*.json', { eager: true });

function toCard(c: RawCard) {
  const card: Record<string, unknown> = { q: c.question, a: c.answer };
  if (c.long) card.long = true;
  if (c.tag) card.tag = c.tag;
  return card;
}

export function getRecallData() {
  const byId: Record<string, { data: RawTech; order: number }> = {};
  for (const path in modules) {
    const id = path.split('/').pop()!.replace(/\.json$/, '');
    const data = modules[path].default;
    byId[id] = { data, order: data.order ?? 0 };
  }

  const order = Object.keys(byId).sort((a, b) => byId[a].order - byId[b].order);

  const content: Record<string, unknown> = {};
  for (const id of order) {
    const t = byId[id].data;
    content[id] = {
      name: t.name,
      blurb: t.blurb ?? '',
      ...(t.updated ? { updated: t.updated } : {}),
      topics: (t.topics ?? []).map((tp) => ({
        id: tp.id,
        name: tp.name,
        subtopics: (tp.subtopics ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          cards: (s.cards ?? []).map(toCard),
        })),
      })),
      book: (t.book ?? []).map((b) => ({ id: b.id, title: b.title, html: b.html })),
    };
  }

  return { order, content };
}
