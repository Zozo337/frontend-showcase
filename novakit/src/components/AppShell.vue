<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">N</span>
        <div>
          <h1>NovaKit</h1>
          <p>Agent Platform</p>
        </div>
      </div>
      <slot name="nav" />
    </aside>
    <main class="main-panel">
      <slot />
    </main>
  </div>
</template>
