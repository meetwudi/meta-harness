// Generated file. Do not edit directly; update the Spec first.
// Supports knowledge-agent.youtube-transcript-toolspec-implementation: fetches YouTube transcripts for ToolSpec-created tools.

export type FetchYouTubeTranscriptInput = {
  url?: string;
  videoUrl?: string;
  video_id?: string;
  videoId?: string;
  language?: string;
};

export type TranscriptSegment = {
  startMs: number;
  durationMs: number;
  text: string;
};

export type FetchYouTubeTranscriptResult = {
  videoId: string;
  url: string;
  language: string;
  trackName: string;
  retrievedAt: string;
  source: string;
  segmentCount: number;
  text: string;
  segments: TranscriptSegment[];
};

/**
 * Executes this module through the generic ToolSpec implementation resolver.
 */
export async function executeToolSpec(
  input: Record<string, unknown>,
): Promise<FetchYouTubeTranscriptResult> {
  return fetchYouTubeTranscript({
    url: typeof input.url === "string" ? input.url : undefined,
    videoUrl: typeof input.videoUrl === "string" ? input.videoUrl : undefined,
    video_id: typeof input.video_id === "string" ? input.video_id : undefined,
    videoId: typeof input.videoId === "string" ? input.videoId : undefined,
    language: typeof input.language === "string" ? input.language : undefined,
  });
}

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> };
};

const fetchTimeoutMs = 12_000;
const androidClientVersion = "20.10.38";
const androidUserAgent = `com.google.android.youtube/${androidClientVersion} (Linux; U; Android 14)`;
const webUserAgent = "Mozilla/5.0 MetaHarnessKnowledgeAgent/1.0";

/**
 * Fetches transcript text and timestamped segments for a YouTube video.
 */
export async function fetchYouTubeTranscript(
  input: FetchYouTubeTranscriptInput,
): Promise<FetchYouTubeTranscriptResult> {
  const rawVideo = input.url ?? input.videoUrl ?? input.video_id ?? input.videoId ?? "";
  const videoId = extractYouTubeVideoId(rawVideo);
  const language = (input.language ?? "en").trim() || "en";
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const androidTracks = await fetchAndroidCaptionTracks(videoId);
  const tracks = androidTracks.length > 0
    ? androidTracks
    : captionTracksFromPlayerResponse(await fetchPlayerResponse(watchUrl));
  const track = chooseCaptionTrack(tracks, language);
  if (!track) {
    const fallbackTrack = await fetchTrackFromTimedTextList(videoId, language);
    if (!fallbackTrack) {
      throw new Error(`No transcript track is available for YouTube video ${videoId}.`);
    }
    return fetchTranscriptFromTrack(videoId, watchUrl, fallbackTrack, language);
  }
  return fetchTranscriptFromTrack(videoId, watchUrl, track, language);
}

async function fetchAndroidCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      "content-type": "application/json",
      "user-agent": androidUserAgent,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: androidClientVersion,
        },
      },
      videoId,
    }),
  });
  if (!response.ok) {
    return [];
  }
  const data = await response.json() as Record<string, unknown>;
  return captionTracksFromPlayerResponse(data);
}

function extractYouTubeVideoId(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("YouTube transcript input must include a YouTube URL or 11-character video id.");
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return validateVideoId(id);
  }
  if (host.endsWith("youtube.com")) {
    const watchId = parsed.searchParams.get("v");
    if (watchId) {
      return validateVideoId(watchId);
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(parts[0] ?? "") && parts[1]) {
      return validateVideoId(parts[1]);
    }
  }
  throw new Error("YouTube transcript input must include a youtube.com or youtu.be video URL.");
}

function validateVideoId(value: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(value)) {
    throw new Error(`Invalid YouTube video id: ${value}`);
  }
  return value;
}

async function fetchPlayerResponse(watchUrl: string): Promise<Record<string, unknown>> {
  const html = await fetchText(watchUrl, webUserAgent);
  const json = extractBalancedJsonAfterMarker(html, "ytInitialPlayerResponse");
  if (!json) {
    throw new Error("YouTube watch page did not include player response metadata.");
  }
  return JSON.parse(json) as Record<string, unknown>;
}

function captionTracksFromPlayerResponse(playerResponse: Record<string, unknown>): CaptionTrack[] {
  const captions = objectRecord(playerResponse.captions);
  const renderer = objectRecord(captions.playerCaptionsTracklistRenderer);
  const tracks = renderer.captionTracks;
  return Array.isArray(tracks) ? tracks.filter(isCaptionTrack) : [];
}

function chooseCaptionTrack(tracks: CaptionTrack[], language: string): CaptionTrack | undefined {
  return tracks.find((track) => track.languageCode === language)
    ?? tracks.find((track) => track.languageCode?.startsWith(`${language}-`))
    ?? tracks.find((track) => track.languageCode === "en")
    ?? tracks.find((track) => track.languageCode?.startsWith("en-"))
    ?? tracks[0];
}

async function fetchTrackFromTimedTextList(
  videoId: string,
  language: string,
): Promise<CaptionTrack | undefined> {
  const listUrl = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const xml = await fetchText(listUrl, webUserAgent);
  const tracks = [...xml.matchAll(/<track\b([^>]*)>/g)].map((match) => {
    const attrs = parseXmlAttributes(match[1] ?? "");
    return {
      languageCode: attrs.lang_code,
      baseUrl: timedTextUrl(videoId, attrs.lang_code ?? "", attrs.name),
      name: { simpleText: attrs.name || attrs.lang_original || attrs.lang_translated || "" },
    };
  }).filter(isCaptionTrack);
  return chooseCaptionTrack(tracks, language);
}

function timedTextUrl(videoId: string, language: string, name?: string): string {
  const url = new URL("https://video.google.com/timedtext");
  url.searchParams.set("v", videoId);
  url.searchParams.set("lang", language);
  url.searchParams.set("fmt", "json3");
  if (name) {
    url.searchParams.set("name", name);
  }
  return url.toString();
}

async function fetchTranscriptFromTrack(
  videoId: string,
  watchUrl: string,
  track: CaptionTrack,
  preferredLanguage: string,
): Promise<FetchYouTubeTranscriptResult> {
  if (!track.baseUrl) {
    throw new Error(`Transcript track for YouTube video ${videoId} has no fetch URL.`);
  }
  const transcriptText = await fetchTranscriptText(track.baseUrl);
  const segments = parseTranscript(transcriptText);
  if (segments.length === 0) {
    throw new Error(`Transcript for YouTube video ${videoId} did not contain text segments.`);
  }
  const text = normalizeTranscriptText(segments.map((segment) => segment.text).join(" "));
  return {
    videoId,
    url: watchUrl,
    language: track.languageCode ?? preferredLanguage,
    trackName: captionTrackName(track),
    retrievedAt: new Date().toISOString(),
    source: "youtube-captions",
    segmentCount: segments.length,
    text,
    segments,
  };
}

async function fetchTranscriptText(baseUrl: string): Promise<string> {
  const direct = await fetchText(baseUrl, androidUserAgent);
  if (direct.trim()) {
    return direct;
  }
  return fetchText(withJsonFormat(baseUrl), androidUserAgent);
}

function withJsonFormat(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("fmt", "json3");
  return url.toString();
}

function parseTranscript(raw: string): TranscriptSegment[] {
  try {
    return parseJson3Transcript(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return parseXmlTranscript(raw);
  }
}

function parseJson3Transcript(data: Record<string, unknown>): TranscriptSegment[] {
  const events = Array.isArray(data.events) ? data.events : [];
  return events.flatMap((event) => {
    const record = objectRecord(event);
    const text = Array.isArray(record.segs)
      ? normalizeTranscriptText(record.segs.map((segment) => objectRecord(segment).utf8 ?? "").join(""))
      : "";
    if (!text) {
      return [];
    }
    return [{
      startMs: numberValue(record.tStartMs),
      durationMs: numberValue(record.dDurationMs),
      text,
    }];
  });
}

function parseXmlTranscript(raw: string): TranscriptSegment[] {
  const srv3 = parseSrv3Transcript(raw);
  if (srv3.length > 0) {
    return srv3;
  }
  return [...raw.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].flatMap((match) => {
    const attrs = parseXmlAttributes(match[1] ?? "");
    const text = normalizeTranscriptText(decodeHtmlEntities(match[2] ?? ""));
    if (!text) {
      return [];
    }
    return [{
      startMs: Math.round(Number(attrs.start ?? 0) * 1000),
      durationMs: Math.round(Number(attrs.dur ?? 0) * 1000),
      text,
    }];
  });
}

function parseSrv3Transcript(raw: string): TranscriptSegment[] {
  return [...raw.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].flatMap((match) => {
    const attrs = parseXmlAttributes(match[1] ?? "");
    const inner = match[2] ?? "";
    const textFromSegments = [...inner.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/g)]
      .map((segmentMatch) => segmentMatch[1] ?? "")
      .join("");
    const text = normalizeTranscriptText(
      textFromSegments || inner.replace(/<[^>]+>/g, ""),
    );
    if (!text) {
      return [];
    }
    return [{
      startMs: Math.round(Number(attrs.t ?? 0)),
      durationMs: Math.round(Number(attrs.d ?? 0)),
      text,
    }];
  });
}

async function fetchText(url: string, userAgent: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(fetchTimeoutMs),
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent": userAgent,
    },
  });
  if (!response.ok) {
    throw new Error(`Transcript fetch failed with HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function extractBalancedJsonAfterMarker(html: string, marker: string): string {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }
  const braceStart = html.indexOf("{", markerIndex);
  if (braceStart < 0) {
    return "";
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = braceStart; index < html.length; index += 1) {
    const char = html[index] ?? "";
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(braceStart, index + 1);
      }
    }
  }
  return "";
}

function parseXmlAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(/([:\w-]+)="([^"]*)"/g)) {
    attrs[match[1] ?? ""] = decodeHtmlEntities(match[2] ?? "");
  }
  return attrs;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeTranscriptText(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function captionTrackName(track: CaptionTrack): string {
  return track.name?.simpleText
    ?? track.name?.runs?.map((run) => run.text ?? "").join("").trim()
    ?? "";
}

function isCaptionTrack(value: unknown): value is CaptionTrack {
  const record = objectRecord(value);
  return typeof record.languageCode === "string" || typeof record.baseUrl === "string";
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
