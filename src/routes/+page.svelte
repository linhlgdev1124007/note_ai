<script lang="ts">
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import * as Y from "yjs";
  import { Archive, FilePlus2, History, LogOut, Search, Settings, Sparkles } from '@lucide/svelte';
  export let data: PageData;
  let notes = data.notes;
  let selectedId = notes[0]?.id;
  let selectedPermission = notes[0]?.permission ?? "OWNER";
  let editing = false;
  let realtime: WebSocket | null = null;
  let ydoc: Y.Doc | null = null;
  let ytext: Y.Text | null = null;
  let applyingRemote = false;
  let version = notes[0]?.version ?? 1;
  let title = notes[0]?.title ?? "Untitled Note";
  let content = notes[0]?.content ?? "";
  // `content` is rendered with {@html}; updating it while typing recreates the
  // editable DOM and causes the caret (and Telex composition) to jump.
  let editorDraft = content;
  let isComposing = false;
  let lastSavedTitle = title;
  let lastSavedContent = content;
  let saveInFlight = false;
  const AUTO_SAVE_DELAY_MS = 4000;
  let question = "",
    answer = "",
    sources: any[] = [],
    loading = false,
    status = "Saved",
    summaryStatus = "STALE",
    history: any = null,
    searchQuery = "",
    searchResults: any[] = [],
    globalAnswer = "",
    shareQuery = "",
    shareUsers: any[] = [],
    collaborators: any[] = [],
    presence: any[] = [],
    sharePermission = "VIEW",
    shareMessage = "",
    auditMode = false,
    blocks: any[] = [];
  let toast = "";
  let timer: ReturnType<typeof setTimeout>;
  async function ask(mode: "summary" | "chat") {
    loading = true;
    answer = "";
    const endpoint =
      mode === "summary" && selectedId
        ? `/api/notes/${selectedId}/summary`
        : "/api/ai";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body:
        mode === "summary"
          ? undefined
          : JSON.stringify({ mode, content: editorDraft, question, noteId: selectedId }),
    });
    const data = await response.json();
    answer = data.summary ?? data.answer ?? `Lỗi: ${data.error}`;
    sources = data.sources ?? [];
    if (mode === "summary") summaryStatus = data.summaryStatus ?? "FAILED";
    if (!response.ok) { toast = data.error ?? "AI không khả dụng"; setTimeout(() => (toast = ""), 4000); }
    loading = false;
  }
  async function openSource(source: any) {
    if (source.noteId && source.noteId !== selectedId) {
      const target = notes.find((note: any) => note.id === source.noteId);
      if (target) selectNote(target);
    }
    if (source.blockId) {
      auditMode = true;
      if (selectedId) {
        const response = await fetch(`/api/notes/${selectedId}/blocks`);
        if (response.ok) blocks = (await response.json()).blocks ?? [];
      }
      setTimeout(() => document.getElementById(`block-${source.blockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }
  }
  async function loadHistory() {
    if (!selectedId) return;
    const response = await fetch(`/api/notes/${selectedId}/history`);
    if (response.ok) history = await response.json();
  }
  async function restoreRevision(revisionId: string) {
    if (!confirm("Restore this revision?")) return;
    const response = await fetch(`/api/notes/${selectedId}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revisionId }),
    });
    if (response.ok) location.reload();
  }
  async function loadSummary() {
    if (!selectedId) return;
    const response = await fetch(`/api/notes/${selectedId}/summary`);
    if (response.ok) {
      const data = await response.json();
      answer = data.summary ?? "";
      summaryStatus = data.summaryStatus ?? "STALE";
    }
  }
  function selectNote(note: any) {
    clearTimeout(timer);
    ydoc?.destroy();
    selectedId = note.id;
    selectedPermission = note.permission ?? "OWNER";
    title = note.title;
    content = note.content;
    editorDraft = note.content;
    lastSavedTitle = note.title;
    lastSavedContent = note.content;
    version = note.version;
    answer = "";
    history = null;
    status = "Saved";
    loadSummary();
    connectRealtime();
  }
  async function createNote() {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Untitled Note", content: "" }),
    });
    if (response.ok) location.reload();
  }
  async function save() {
    if (!selectedId || saveInFlight) return;
    if (title === lastSavedTitle && editorDraft === lastSavedContent) {
      status = "Saved";
      editing = false;
      return;
    }
    const savedTitle = title;
    const savedContent = editorDraft;
    const savedVersion = version;
    saveInFlight = true;
    status = "Saving…";
    const response = await fetch(`/api/notes/${selectedId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: savedTitle, content: savedContent, version: savedVersion }),
    });
    if (response.ok) {
      version = (await response.json()).version;
      lastSavedTitle = savedTitle;
      lastSavedContent = savedContent;
      const hasNewChanges = title !== savedTitle || editorDraft !== savedContent;
      status = hasNewChanges ? "Changes pending…" : `Saved · version ${version}`;
      editing = hasNewChanges;
      if (hasNewChanges) scheduleSave();
    } else status = "Conflict";
    saveInFlight = false;
  }
  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(() => void save(), AUTO_SAVE_DELAY_MS);
  }
  function edit() {
    status = "Draft · saving after you stop typing";
    editing = true;
    if (selectedId) fetch(`/api/notes/${selectedId}/presence`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: 'EDITING' }) });
    scheduleSave();
  }
  function format(command: string, value?: string) {
    if (selectedPermission === 'VIEW') return;
    document.execCommand(command, false, value);
    edit();
  }
  function insertHtml(html: string) {
    if (selectedPermission === 'VIEW') return;
    document.execCommand('insertHTML', false, html);
    edit();
  }
  function addLink() {
    if (selectedPermission === 'VIEW') return;
    const url = prompt('URL liên kết');
    if (url && /^https?:\/\//i.test(url)) format('createLink', url);
  }
  async function globalSearch(askAI = false) {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: searchQuery, askAI }),
    });
    const data = await response.json();
    searchResults = data.results ?? [];
    globalAnswer = data.answer ?? data.error ?? "";
    if (!response.ok) { toast = data.error ?? "Không thể tìm kiếm"; setTimeout(() => (toast = ""), 4000); }
  }
  async function findUsers() {
    const response = await fetch(
      `/api/users?q=${encodeURIComponent(shareQuery)}`,
    );
    shareUsers = (await response.json()).users ?? [];
  }
  async function share(userId: string) {
    const response = await fetch(`/api/notes/${selectedId}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, permission: sharePermission }),
    });
    shareMessage = response.ok
      ? "Permission updated"
      : "Cannot share this Note";
  }
  async function loadCollaborators() {
    const response = await fetch(`/api/notes/${selectedId}/share`);
    if (response.ok) collaborators = (await response.json()).permissions ?? [];
  }
  async function toggleAudit() {
    auditMode = !auditMode;
    if (auditMode && selectedId) {
      const response = await fetch(`/api/notes/${selectedId}/blocks`);
      if (response.ok) blocks = (await response.json()).blocks ?? [];
    }
  }
  async function heartbeat() {
    if (!selectedId) return;
    await fetch(`/api/notes/${selectedId}/presence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: editing ? "EDITING" : "VIEWING" }),
    });
    const response = await fetch(`/api/notes/${selectedId}/presence`);
    if (response.ok) presence = (await response.json()).users ?? [];
  }
  async function connectRealtime() {
    realtime?.close(); ydoc?.destroy(); ydoc = new Y.Doc(); ytext = ydoc.getText('note-content');
    ytext.insert(0, content);
    ydoc.on('update', (update: Uint8Array) => { if (!applyingRemote && realtime?.readyState === WebSocket.OPEN) realtime.send(update); });
    ytext.observe(() => {
      // Local keystrokes must never update `content`, as that value drives {@html content}.
      if (!applyingRemote) editorDraft = ytext?.toString() ?? '';
    });
    if (!selectedId || typeof WebSocket === 'undefined') return;
    const ticketResponse = await fetch('/api/realtime-ticket', { method: 'POST' }); if (!ticketResponse.ok) return;
    const { token } = await ticketResponse.json(); const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    realtime = new WebSocket(`${scheme}://${location.hostname}:3001/?token=${token}&noteId=${selectedId}`); realtime.binaryType = 'arraybuffer';
    realtime.onopen = () => { if (ydoc) realtime?.send(Y.encodeStateAsUpdate(ydoc)); };
    realtime.onmessage = (event) => { if (!(event.data instanceof ArrayBuffer) || !ydoc) return; applyingRemote = true; Y.applyUpdate(ydoc, new Uint8Array(event.data)); content = ytext?.toString() ?? content; applyingRemote = false; status = 'Updated by collaborator'; };
  }
  function updateCollaborativeContent(next: string) {
    editorDraft = next; if (!ytext || applyingRemote) return;
    ydoc?.transact(() => { ytext?.delete(0, ytext.length); ytext?.insert(0, next); });
  }
  function handleEditorInput(event: Event) {
    const next = (event.currentTarget as HTMLDivElement).innerHTML;
    editorDraft = next;
    // IMEs such as Vietnamese Telex generate intermediate input events. Wait until
    // composition ends before synchronising, otherwise the composition range is lost.
    if (!isComposing) {
      updateCollaborativeContent(next);
      edit();
    }
  }
  function handleCompositionStart() {
    isComposing = true;
  }
  function handleCompositionEnd(event: CompositionEvent) {
    isComposing = false;
    const next = (event.currentTarget as HTMLDivElement).innerHTML;
    updateCollaborativeContent(next);
    edit();
  }
  onMount(() => {
    heartbeat();
    loadSummary();
    connectRealtime();
    const interval = setInterval(heartbeat, 10000);
    return () => {
      clearInterval(interval);
      realtime?.close();
      if (selectedId) fetch(`/api/notes/${selectedId}/presence`, { method: 'DELETE', keepalive: true });
    };
  });
  async function revoke(userId: string) {
    await fetch(`/api/notes/${selectedId}/share?userId=${userId}`, {
      method: "DELETE",
    });
    await loadCollaborators();
  }
</script>

<svelte:head
  ><title>Smart Note</title><meta
    name="description"
    content="Collaborative Smart Note with AI"
  /></svelte:head
>
<main class="app-canvas min-h-screen px-4 py-8 text-slate-200 sm:px-8">
  {#if toast}<div role="alert" class="fixed right-5 top-5 z-50 max-w-sm rounded-2xl border border-rose-300/20 bg-rose-950/90 px-4 py-3 text-sm text-rose-100 shadow-2xl backdrop-blur">{toast}</div>{/if}
  <header class="shell mb-8 flex items-center justify-between">
    <div>
      <p class="eyebrow">Smart Note</p>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white">Workspace</h1>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-slate-400">{data.user.displayName}</span><a
        href="/audit"
        class="inline-flex items-center gap-1 text-xs text-amber-300"><History size={14} />Audit Q&A</a
      ><a href="/trash" class="inline-flex items-center gap-1 text-xs text-slate-400"><Archive size={14} />Trash</a
      >{#if data.user.role === "ADMIN"}<a
          href="/admin"
          class="inline-flex items-center gap-1 text-xs text-cyan-400"><Settings size={14} />Admin</a
        >{/if}
      <form method="POST" action="/api/auth/logout">
        <button
          class="btn-secondary px-3 py-2 text-xs"
          ><LogOut size={14} />Đăng xuất</button
        >
      </form>
      <span
        class="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
        >● Online · {data.user.role}</span
      >
    </div>
  </header>
  <div class="surface shell mb-6 flex gap-2 rounded-2xl p-2">
    <label class="relative flex-1"><Search size={17} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input
      bind:value={searchQuery}
      on:keydown={(event) => event.key === "Enter" && globalSearch()}
      placeholder="Search accessible notes..."
      class="field h-full border-0 bg-transparent py-3 pl-9 shadow-none focus:ring-0"
    /></label><button
      on:click={() => globalSearch()}
      class="btn-secondary text-sm"
      ><Search size={16} />Search</button
    ><button
      on:click={() => globalSearch(true)}
      class="btn-primary bg-gradient-to-r from-violet-300 to-cyan-300 text-sm"
      ><Sparkles size={16} />Ask Global AI</button
    >
  </div>
  {#if globalAnswer || searchResults.length}<div
      class="surface shell mb-6 rounded-2xl p-5"
    >
      {#if globalAnswer}<p
          class="mb-3 whitespace-pre-wrap text-sm text-slate-300"
        >
          {globalAnswer}
        </p>{/if}
      <div class="flex flex-wrap gap-2">
        {#each searchResults as result}<button
            on:click={() => {
              const found = notes.find((note: any) => note.id === result.id);
              if (found) selectNote(found);
            }}
            class="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300"
            >{result.title}</button
          >{/each}
      </div>
    </div>{/if}
  <div class="shell grid gap-6 lg:grid-cols-[230px_1fr_360px]">
    <nav class="surface rounded-2xl p-4">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-semibold text-white">My Notes</h2>
        <button aria-label="Create new note"
          on:click={createNote}
          class="grid h-8 w-8 place-items-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/10"
          ><FilePlus2 size={16} /></button
        >
      </div>
      {#each notes as note}<button
          on:click={() => selectNote(note)}
          class="mb-2 block w-full rounded-lg px-3 py-2 text-left text-sm {note.id ===
          selectedId
            ? 'bg-cyan-400/10 text-cyan-300'
            : 'text-slate-400 hover:bg-slate-800'}">{note.title}</button
        >{/each}
    </nav>
    <section class="surface rounded-2xl p-6">
      <div class="mb-6 flex items-center justify-between gap-4">
        <input
          bind:value={title}
          readonly={selectedPermission === 'VIEW'}
          on:input={edit}
          class="w-full bg-transparent text-3xl font-bold text-white outline-none"
        /><span class="shrink-0 text-xs text-slate-500">{status}</span>
      </div>
      <div
        class="mb-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4 text-xs text-slate-400"
      >
        <button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("bold")}
          class="rounded bg-slate-800 px-2 py-1 font-bold">B</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("italic")}
          class="rounded bg-slate-800 px-2 py-1 italic">I</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("underline")}
          class="rounded bg-slate-800 px-2 py-1 underline">U</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("formatBlock", "h2")}
          class="rounded bg-slate-800 px-2 py-1">H2</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("insertUnorderedList")}
          class="rounded bg-slate-800 px-2 py-1">• List</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("insertOrderedList")}
          class="rounded bg-slate-800 px-2 py-1">1. List</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("formatBlock", "blockquote")}
          class="rounded bg-slate-800 px-2 py-1">Quote</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => format("formatBlock", "pre")}
          class="rounded bg-slate-800 px-2 py-1">Code</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => insertHtml('<hr>')}
          class="rounded bg-slate-800 px-2 py-1">HR</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => insertHtml('<ul class="task-list"><li>☐ Task mới</li></ul>')}
          class="rounded bg-slate-800 px-2 py-1">☐ Task</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={() => insertHtml('<table><tbody><tr><td>Ô 1</td><td>Ô 2</td></tr><tr><td></td><td></td></tr></tbody></table>')}
          class="rounded bg-slate-800 px-2 py-1">Table</button
        ><button
          disabled={selectedPermission === 'VIEW'}
          on:click={addLink}
          class="rounded bg-slate-800 px-2 py-1">Link</button
        ><button
          on:click={toggleAudit}
          class="ml-auto rounded-full px-3 py-1 {auditMode
            ? 'bg-amber-400 text-slate-950'
            : 'bg-cyan-400/10 text-cyan-300'}"
          >{auditMode ? "Audit view" : "Normal view"}</button
        >
      </div>
      {#if auditMode}<div class="min-h-[420px] space-y-3">
          {#each blocks as block}<div id={`block-${block.id}`}
              class="rounded-lg border-l-4 border-violet-400 bg-violet-400/10 p-3"
            >
              <p class="text-lg text-slate-200">{block.blockText}</p>
              <p class="mt-2 text-xs text-violet-300">
                Created by {block.createdBy} · Last edited by {block.lastEditedBy}
                · {new Date(block.updatedAt).toLocaleString()}
              </p>
            </div>{/each}{#if !blocks.length}<p class="text-sm text-slate-500">
              Chưa có block attribution. Hãy lưu Note sau khi chỉnh sửa.
            </p>{/if}
        </div>{:else}<div
          contenteditable={selectedPermission !== 'VIEW'}
          role="textbox"
          aria-label="Note content"
          class="min-h-[420px] w-full bg-transparent text-lg leading-8 text-slate-300 outline-none empty:before:text-slate-600 empty:before:content-['Start_writing...']"
          on:input={handleEditorInput}
          on:compositionstart={handleCompositionStart}
          on:compositionend={handleCompositionEnd}
        >
          {@html content}
        </div>{/if}
      <p class="mt-4 text-xs text-slate-600">
        Rich text · Lưu sau 4 giây ngừng chỉnh sửa · Version conflict protection enabled
      </p>
    </section>
    <aside class="space-y-6">
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-semibold text-white">AI Summary</h2>
          <button disabled={loading} on:click={() => ask("summary")} class="text-xs text-cyan-400 disabled:opacity-50"
            >{loading ? "Generating…" : "Regenerate"}</button
          >
        </div>
        {#if answer && !question}<p
            class="whitespace-pre-wrap text-sm leading-6 text-slate-300"
          >
            {answer}
          </p>{:else}<p class="text-sm leading-6 text-slate-500">
            Tạo bản tóm tắt Note bằng Gemini Vertex AI.
          </p>{/if}
      </section>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 class="mb-4 font-semibold text-white">Ask this Note</h2>
        <textarea
          bind:value={question}
          placeholder="Deadline của dự án là gì?"
          class="mb-3 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-cyan-400"
        ></textarea><button
          disabled={loading || !question}
          on:click={() => ask("chat")}
          class="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >{loading ? "Đang suy nghĩ..." : "Ask AI"}</button
        >{#if answer && question}<p
            class="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300"
          >
          {answer}
          </p>{#if sources.length}<div class="mt-3 border-t border-slate-800 pt-3"><p class="mb-2 text-xs font-semibold uppercase text-slate-500">Sources</p>{#each sources as source}<button on:click={() => openSource(source)} class="mb-1 block w-full truncate text-left text-xs text-cyan-300 hover:text-cyan-100">{source.noteTitle ?? 'Note'} · block {source.chunkIndex + 1} · {source.snippet}</button>{/each}</div>{/if}{/if}
      </section>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 class="mb-3 font-semibold text-white">Share Note</h2>
        <div class="flex gap-2">
          <input
            bind:value={shareQuery}
            on:input={findUsers}
            placeholder="Username"
            class="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white"
          /><select
            bind:value={sharePermission}
            class="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white"
            ><option>VIEW</option><option>EDIT</option></select
          >
        </div>
        {#each shareUsers as user}<button
            on:click={() => share(user.id)}
            class="mt-2 block w-full rounded bg-slate-950 p-2 text-left text-xs text-cyan-300"
            >{user.displayName} (@{user.username}) · Grant {sharePermission}</button
          >{/each}{#if shareMessage}<p class="mt-2 text-xs text-emerald-300">
            {shareMessage}
          </p>{/if}<button
          on:click={loadCollaborators}
          class="mt-4 text-xs text-cyan-400">Load collaborators</button
        >{#each collaborators as collaborator}<div
            class="mt-2 flex items-center justify-between text-xs text-slate-400"
          >
            <span>{collaborator.displayName} · {collaborator.permission}</span
            ><button
              on:click={() => revoke(collaborator.userId)}
              class="text-rose-300">Revoke</button
            >
          </div>{/each}
      </section>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-semibold text-white">Audit & History</h2>
          <button on:click={loadHistory} class="text-xs text-cyan-400"
            >Load</button
          >
        </div>
        {#if history}<div class="max-h-56 space-y-3 overflow-auto">
            {#each history.audit as item}<div
                class="border-l-2 border-cyan-400/50 pl-3"
              >
                <p class="text-xs font-semibold text-cyan-300">{item.action}</p>
                <p class="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <p class="mt-1 truncate text-xs text-slate-400">
                  {item.searchText}
                </p>
              </div>{/each}
          </div>
          <h3 class="mt-4 mb-2 text-xs font-semibold uppercase text-slate-500">
            Revisions
          </h3>
          {#each history.revisions as revision}<div
              class="mb-2 flex items-center justify-between rounded bg-slate-950 p-2"
            >
              <span class="text-xs text-slate-400"
                >Version {revision.version}</span
              ><button
                on:click={() => restoreRevision(revision.id)}
                class="text-xs text-amber-300">Restore</button
              >
            </div>{/each}{:else}<p class="text-xs text-slate-500">
            Xem audit log và revision history của Note.
          </p>{/if}
      </section>
      <section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 class="mb-3 font-semibold text-white">Collaborators</h2>
        <div class="flex items-center gap-3 text-sm">
          <span
            class="grid h-8 w-8 place-items-center rounded-full bg-violet-500 font-bold"
            >A</span
          ><span
            >Admin <small class="block text-slate-500"
              >Owner · Full access</small
          ></span
          >{#each presence as online}<span class="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">{online.displayName} · {online.state}</span>{/each}
        </div>
      </section>
    </aside>
  </div>
</main>
<style>
  :global(body) { background: #020617; }
  main { background-image: radial-gradient(circle at 12% 0%, rgba(34,211,238,.10), transparent 28rem), radial-gradient(circle at 90% 12%, rgba(139,92,246,.10), transparent 30rem); }
  header h1 { letter-spacing: -.035em; }
  section, nav, aside > section, main > div > section { box-shadow: 0 18px 60px rgba(0,0,0,.16); backdrop-filter: blur(10px); }
  button, a, input, select { transition: border-color .2s ease, background-color .2s ease, color .2s ease, transform .2s ease, box-shadow .2s ease; }
  button:not(:disabled):hover, a:hover { transform: translateY(-1px); }
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; }
  [contenteditable] { caret-color: #22d3ee; }
  [contenteditable] :global(a) { color: #67e8f9; text-decoration: underline; }
  [contenteditable] :global(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  [contenteditable] :global(td) { border: 1px solid #334155; padding: .6rem; }
  [contenteditable] :global(hr) { border-color: #334155; margin: 1.5rem 0; }
  @media (max-width: 640px) { main { padding-top: 1.25rem; } header { align-items: flex-start; flex-direction: column; gap: 1rem; } header > div:last-child { flex-wrap: wrap; } }
</style>
