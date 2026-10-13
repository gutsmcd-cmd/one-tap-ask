// How each assistant accepts a prompt (checked Oct 2026):
// - Grok:       https://grok.com/?q=            prefills and sends on load
// - ChatGPT:    https://chatgpt.com/?q=          prefills the box
// - Perplexity: https://www.perplexity.ai/search?q=  runs the search
// - Claude:     claude.ai/new?q= was removed (~Oct 2025) -> copy + open, user pastes
// - Gemini:     no prefill parameter            -> copy + open, user pastes
export type AiId = 'grok' | 'chatgpt' | 'claude' | 'gemini' | 'perplexity'
export type Ai = { id: AiId; name: string; prefill: boolean; url: (p: string) => string; auto?: boolean }

export const AIS: Ai[] = [
  { id: 'grok', name: 'Grok', prefill: true, auto: true, url: (p) => `https://grok.com/?q=${encodeURIComponent(p)}` },
  { id: 'chatgpt', name: 'ChatGPT', prefill: true, url: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { id: 'claude', name: 'Claude', prefill: false, url: () => 'https://claude.ai/new' },
  { id: 'gemini', name: 'Gemini', prefill: false, url: () => 'https://gemini.google.com/app' },
  { id: 'perplexity', name: 'Perplexity', prefill: true, auto: true, url: (p) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` },
]
