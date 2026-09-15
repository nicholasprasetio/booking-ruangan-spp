<template>
  <div class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-1 min-w-0 overflow-x-hidden">
      <slot />
    </main>
    <Footer />
  </div>
</template>
