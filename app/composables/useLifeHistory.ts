/**
 * L'état de la frise, et son unique lieu de stockage : le document texte (§5), écrit
 * tel quel dans le `localStorage` de ce navigateur. Rien d'autre n'est enregistré —
 * ni identifiants, ni préférences d'affichage.
 */

import type {
  LifeDocument,
  LifeEvent,
  MergeReport,
} from "~/utils/life-document";

export const STORAGE_KEY = "life-history:document";

export type ImportMode = "replace" | "merge";

function emptyDocument(): LifeDocument {
  return { events: [], header: [], trailing: [], issues: [] };
}

export function useLifeHistory() {
  const doc = useState<LifeDocument>("life-history:document", emptyDocument);
  const loaded = useState<boolean>("life-history:loaded", () => false);
  const savedAt = useState<number | null>("life-history:saved-at", () => null);
  const lastDeleted = useState<LifeEvent | null>(
    "life-history:last-deleted",
    () => null,
  );

  const events = computed(() => doc.value.events);
  const issues = computed(() => doc.value.issues);
  const isEmpty = computed(
    () => doc.value.events.length === 0 && doc.value.issues.length === 0,
  );

  /** Le document tel qu'il est stocké — c'est aussi, à l'octet près, ce qui est exporté. */
  const text = computed(() => serializeDocument(doc.value));

  function read(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      // Navigation privée ou stockage bloqué : on repart d'une frise vide plutôt que
      // d'empêcher l'usage de l'application.
      return "";
    }
  }

  function persist() {
    try {
      const serialized = serializeDocument(doc.value);
      if (serialized) localStorage.setItem(STORAGE_KEY, serialized);
      else localStorage.removeItem(STORAGE_KEY);
      savedAt.value = Date.now();
    } catch {
      savedAt.value = null;
    }
  }

  function load() {
    if (loaded.value || import.meta.server) return;
    doc.value = parseDocument(read());
    loaded.value = true;
  }

  function addEvent(fields: Omit<LifeEvent, "id">): LifeEvent {
    const event = createEvent(fields);
    doc.value.events = [...doc.value.events, event].sort(compareEvents);
    persist();
    return event;
  }

  function updateEvent(id: string, fields: Omit<LifeEvent, "id">) {
    doc.value.events = doc.value.events
      .map((event) =>
        event.id === id ? { ...createEvent(fields), id } : event,
      )
      .sort(compareEvents);
    persist();
  }

  function removeEvent(id: string) {
    lastDeleted.value =
      doc.value.events.find((event) => event.id === id) ?? null;
    doc.value.events = doc.value.events.filter((event) => event.id !== id);
    persist();
  }

  /**
   * Remplace tout ce qui porte ces catégories. C'est ainsi que les années d'école se
   * refont : l'application retire ce qu'elle avait posé, puis repose le parcours
   * corrigé — sans toucher à ce que le patient a écrit lui-même.
   */
  function replaceCategories(
    categories: string[],
    fields: Omit<LifeEvent, "id">[],
  ): { removed: number; added: number } {
    const retired = new Set(categories);
    const kept = doc.value.events.filter(
      (event) => !event.category || !retired.has(event.category),
    );
    const removed = doc.value.events.length - kept.length;
    doc.value.events = [...kept, ...fields.map(createEvent)].sort(
      compareEvents,
    );
    persist();
    return { removed, added: fields.length };
  }

  /** Rattrape la dernière suppression, tant qu'une autre n'a pas eu lieu (A3). */
  function undoRemove() {
    const event = lastDeleted.value;
    if (!event) return;
    doc.value.events = [...doc.value.events, event].sort(compareEvents);
    lastDeleted.value = null;
    persist();
  }

  /** Retire un bloc incompris que le patient a choisi d'abandonner. */
  function dismissIssue(issue: LifeDocument["issues"][number]) {
    const abandoned = new Set(issue.block);
    doc.value.header = doc.value.header.filter((line) => !abandoned.has(line));
    doc.value.trailing = doc.value.trailing.filter(
      (line) => !abandoned.has(line),
    );
    doc.value.issues = doc.value.issues.filter(
      (candidate) => candidate !== issue,
    );
    persist();
  }

  function importText(incoming: string, mode: ImportMode): MergeReport {
    const parsed = parseDocument(incoming);
    if (mode === "replace") {
      doc.value = parsed;
      persist();
      return { added: parsed.events.length, updated: 0, unchanged: 0 };
    }
    const { doc: merged, report } = mergeDocuments(doc.value, parsed);
    doc.value = merged;
    persist();
    return report;
  }

  function clear() {
    doc.value = emptyDocument();
    lastDeleted.value = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Rien à faire : s'il n'y a pas de stockage, il n'y a rien à effacer.
    }
    savedAt.value = null;
  }

  return {
    doc,
    events,
    issues,
    isEmpty,
    text,
    loaded,
    savedAt,
    lastDeleted,
    load,
    addEvent,
    updateEvent,
    removeEvent,
    replaceCategories,
    undoRemove,
    dismissIssue,
    importText,
    clear,
  };
}
