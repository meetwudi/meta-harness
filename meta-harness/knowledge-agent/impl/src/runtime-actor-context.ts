// Generated file. Do not edit directly; update the Spec first.
// Supports storage.resource-actor-governance: carries active actor sets into runtime storage.
// Supports knowledge-agent.project-config-selection: keeps project actor identity available in selected project runs.
// Harness-Requirement: storage.resource-actor-governance

export type RuntimeActorContext = {
  actorUri: string;
  actorUris: string[];
  defaultReadActors?: string[];
  defaultUpdateActors?: string[];
  conversationLibraryRootPath?: string;
  memoryLibraryRootPath?: string;
};

const actorUriEnv = "META_HARNESS_ACTIVE_ACTOR_URI";
const actorUrisEnv = "META_HARNESS_ACTIVE_ACTOR_URIS";
const defaultReadActorsEnv = "META_HARNESS_DEFAULT_READ_ACTORS";
const defaultUpdateActorsEnv = "META_HARNESS_DEFAULT_UPDATE_ACTORS";
const conversationLibraryRootEnv = "META_HARNESS_CONVERSATION_LIBRARY_ROOT_PATH";
const memoryLibraryRootEnv = "META_HARNESS_MEMORY_LIBRARY_ROOT_PATH";

export function resolveRuntimeActorContext(
  projectActorUri: string,
): RuntimeActorContext {
  const actorUri = optionalActorUri(process.env[actorUriEnv], actorUriEnv) ??
    projectActorUri;
  const actorUris = uniqueActors([
    actorUri,
    ...actorList(process.env[actorUrisEnv], actorUrisEnv),
  ]);
  return {
    actorUri,
    actorUris,
    defaultReadActors: optionalActorList(
      process.env[defaultReadActorsEnv],
      defaultReadActorsEnv,
    ),
    defaultUpdateActors: optionalActorList(
      process.env[defaultUpdateActorsEnv],
      defaultUpdateActorsEnv,
    ),
    conversationLibraryRootPath: optionalRootPath(
      process.env[conversationLibraryRootEnv],
      conversationLibraryRootEnv,
    ),
    memoryLibraryRootPath: optionalRootPath(
      process.env[memoryLibraryRootEnv],
      memoryLibraryRootEnv,
    ),
  };
}

function optionalActorUri(value: string | undefined, label: string): string | undefined {
  if (value === undefined || !value.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("actor://")) {
    throw new Error(`${label} must use actor://`);
  }
  return trimmed;
}

function optionalActorList(
  value: string | undefined,
  label: string,
): string[] | undefined {
  if (value === undefined || !value.trim()) {
    return undefined;
  }
  return actorList(value, label);
}

function actorList(value: string | undefined, label: string): string[] {
  if (value === undefined || !value.trim()) {
    return [];
  }
  const actors = value
    .split(/[\n,]/g)
    .map((actor) => actor.trim())
    .filter(Boolean);
  for (const actor of actors) {
    if (!actor.startsWith("actor://")) {
      throw new Error(`${label} entries must use actor://`);
    }
  }
  return uniqueActors(actors);
}

function uniqueActors(actors: string[]): string[] {
  return actors.filter((actor, index, all) => all.indexOf(actor) === index);
}

function optionalRootPath(value: string | undefined, label: string): string | undefined {
  if (value === undefined || !value.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error(`${label} must be an absolute runtime storage path`);
  }
  return trimmed;
}
