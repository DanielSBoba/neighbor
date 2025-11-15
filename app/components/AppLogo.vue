<template>
  <div class="flex items-center gap-2">
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="shrink-0"
    >
      <!-- House icon representing neighborhood -->
      <path
        d="M16 4L6 12V26H12V18H20V26H26V12L16 4Z"
        fill="currentColor"
        class="text-primary"
      />
      <!-- Small houses representing neighbors -->
      <circle
        cx="10"
        cy="10"
        r="1.5"
        fill="currentColor"
        class="text-primary opacity-60"
      />
      <circle
        cx="22"
        cy="10"
        r="1.5"
        fill="currentColor"
        class="text-primary opacity-60"
      />
      <circle
        cx="16"
        cy="8"
        r="1.5"
        fill="currentColor"
        class="text-primary opacity-60"
      />
    </svg>
    <span class="font-bold text-lg tracking-tight">Neighbor</span>
  </div>
</template>
