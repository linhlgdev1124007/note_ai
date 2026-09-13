<script lang="ts">
  import type { PageData } from './$types';
  import { ArrowLeft, LockKeyhole, ShieldCheck, UserPlus, UsersRound } from '@lucide/svelte';
  export let data: PageData;
  let users: any[] = [...data.users];
  let username = '', displayName = '', password = '', role = 'MEMBER', error = '', toast = '', creating = false;
  const notify = (message: string) => { toast = message; setTimeout(() => (toast = ''), 3500); };
  async function createUser() {
    error = ''; creating = true;
    try { const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, displayName, password, role }) }); const body = await response.json(); if (!response.ok) { error = body.error ?? 'Không thể tạo tài khoản'; return; } users = [...users, { ...body, username, displayName, role, status: 'ACTIVE', colorCode: '#22d3ee', createdAt: new Date() }]; username = displayName = password = ''; notify('Đã tạo tài khoản mới'); } catch { error = 'Không thể kết nối tới máy chủ'; } finally { creating = false; }
  }
  async function toggle(user: any) {
    const status = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: user.id, status }) });
    if (!response.ok) { notify('Không thể cập nhật tài khoản'); return; }
    users = users.map((item: any) => item.id === user.id ? { ...item, status } : item); notify(status === 'ACTIVE' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
  }
</script>

<svelte:head><title>Admin · Smart Note</title></svelte:head>
<main class="app-canvas min-h-screen px-5 py-8 text-slate-200 lg:px-8">
  {#if toast}<div role="status" class="fixed right-5 top-5 z-50 rounded-xl border border-emerald-300/20 bg-emerald-950/90 px-4 py-3 text-sm text-emerald-100 shadow-2xl">{toast}</div>{/if}
  <header class="shell mb-9 flex items-end justify-between"><div><p class="eyebrow">System administration</p><h1 class="mt-2 text-4xl font-semibold tracking-tight text-white">People & access</h1><p class="mt-2 text-sm text-slate-400">Manage workspace identities without losing sight of active access.</p></div><a href="/" class="btn-secondary"><ArrowLeft size={17} /> Workspace</a></header>
  <div class="shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section class="surface rounded-3xl p-6"><div class="mb-6 flex items-center justify-between"><div><h2 class="text-lg font-semibold text-white">Directory</h2><p class="mt-1 text-sm text-slate-500">{users.length} accounts in this workspace</p></div><span class="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><UsersRound size={20} /></span></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-sm"><thead class="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500"><tr><th class="pb-3 font-medium">User</th><th class="pb-3 font-medium">Role</th><th class="pb-3 font-medium">Status</th><th class="pb-3 text-right font-medium">Access</th></tr></thead><tbody class="divide-y divide-slate-800/80">{#each users as user}<tr><td class="py-4"><div class="flex items-center gap-3"><span style={`background:${user.colorCode}`} class="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-slate-950">{user.displayName?.[0]?.toUpperCase()}</span><div><p class="font-medium text-white">{user.displayName}</p><p class="mt-0.5 text-xs text-slate-500">@{user.username}</p></div></div></td><td class="py-4"><span class="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-200">{user.role}</span></td><td class="py-4"><span class="inline-flex items-center gap-2 text-xs {user.status === 'ACTIVE' ? 'text-emerald-300' : 'text-rose-300'}"><i class="h-1.5 w-1.5 rounded-full {user.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}"></i>{user.status}</span></td><td class="py-4 text-right"><button on:click={() => toggle(user)} class="text-xs font-semibold {user.status === 'ACTIVE' ? 'text-rose-300 hover:text-rose-200' : 'text-emerald-300 hover:text-emerald-200'}">{user.status === 'ACTIVE' ? 'Lock account' : 'Unlock account'}</button></td></tr>{/each}</tbody></table></div>
    </section>
    <aside class="surface h-fit rounded-3xl p-6"><div class="mb-6 flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><UserPlus size={19} /></span><div><h2 class="font-semibold text-white">Create account</h2><p class="text-xs text-slate-500">Invite a trusted collaborator</p></div></div>{#if error}<p role="alert" class="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>{/if}<div class="space-y-4"><label class="block text-xs font-medium text-slate-400">Username<input bind:value={username} class="field mt-1.5" placeholder="e.g. minh.nguyen" /></label><label class="block text-xs font-medium text-slate-400">Display name<input bind:value={displayName} class="field mt-1.5" placeholder="Minh Nguyen" /></label><label class="block text-xs font-medium text-slate-400">Initial password<input bind:value={password} type="password" class="field mt-1.5" placeholder="At least 8 characters" /></label><label class="block text-xs font-medium text-slate-400">System role<select bind:value={role} class="field mt-1.5"><option value="MEMBER">Member</option><option value="ADMIN">Administrator</option></select></label><button disabled={creating} on:click={createUser} class="btn-primary w-full">{creating ? 'Creating…' : 'Create account'} <ShieldCheck size={17} /></button></div><p class="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><LockKeyhole size={14} class="mt-0.5 shrink-0" />Passwords are hashed before they are stored.</p></aside>
  </div>
</main>
