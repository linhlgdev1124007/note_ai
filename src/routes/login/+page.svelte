<script lang="ts">
  import type { ActionData } from './$types';
  import { ArrowRight, LockKeyhole, NotebookPen, UserRound } from '@lucide/svelte';
  export let form: ActionData;
  let submitting = false;
</script>

<svelte:head><title>Đăng nhập · Smart Note</title></svelte:head>

<main class="app-canvas grid min-h-screen place-items-center px-5 py-10">
  <div class="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/70 shadow-2xl shadow-slate-950/60 lg:grid-cols-[1.1fr_.9fr]">
    <section class="relative hidden overflow-hidden bg-slate-950 p-12 lg:block">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,.18),transparent_36%)]"></div>
      <div class="relative flex h-full flex-col justify-between">
        <div>
          <div class="mb-10 inline-flex items-center gap-3 text-white"><span class="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><NotebookPen size={21} strokeWidth={2.5} /></span><span class="font-bold tracking-tight">Smart Note</span></div>
          <p class="eyebrow">Private knowledge, shared clearly</p>
          <h1 class="mt-4 max-w-md text-5xl font-semibold leading-[1.05] tracking-tight text-white">A calmer home for your team’s thinking.</h1>
          <p class="mt-6 max-w-md text-base leading-7 text-slate-400">Write together, preserve context, and ask AI about the work that matters — with permissions that stay in your control.</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[.045] p-5 text-sm text-slate-300"><p class="mb-2 font-semibold text-cyan-200">Built for deliberate work</p><p class="leading-6 text-slate-400">Version history, attribution, semantic search and private AI assistance in one focused workspace.</p></div>
      </div>
    </section>
    <section class="surface flex min-h-[580px] flex-col justify-center p-7 sm:p-12">
      <div class="mb-10 lg:hidden"><div class="mb-6 inline-flex items-center gap-3 text-white"><span class="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><NotebookPen size={21} /></span><span class="font-bold">Smart Note</span></div></div>
      <p class="eyebrow">Welcome back</p><h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">Sign in to your workspace</h2><p class="mt-3 text-sm leading-6 text-slate-400">Use your account to continue to your private notes and shared work.</p>
      {#if form?.error}<div role="alert" class="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{form.error}</div>{/if}
      <form method="POST" class="mt-8 space-y-5" on:submit={() => (submitting = true)}>
        <label class="block text-sm font-medium text-slate-300">Username <span class="mt-2 flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-400/10"><UserRound size={17} class="mr-2 text-slate-500" /><input name="username" autocomplete="username" required class="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-600" placeholder="your.username" /></span></label>
        <label class="block text-sm font-medium text-slate-300">Password <span class="mt-2 flex items-center rounded-xl border border-slate-700 bg-slate-950/70 px-3 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-400/10"><LockKeyhole size={17} class="mr-2 text-slate-500" /><input name="password" type="password" autocomplete="current-password" required class="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-600" placeholder="Enter your password" /></span></label>
        <button type="submit" class="btn-primary mt-2 w-full" disabled={submitting}>{submitting ? 'Signing in…' : 'Continue to workspace'} <ArrowRight size={18} /></button>
      </form>
      <p class="mt-8 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-center text-xs text-slate-500">Demo access: <code class="font-semibold text-slate-300">admin / admin123</code></p>
    </section>
  </div>
</main>
