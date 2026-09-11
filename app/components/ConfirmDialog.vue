<script setup lang="ts">
const open = defineModel<boolean>("open", { required: true });

withDefaults(
  defineProps<{
    title: string;
    description: string;
    confirmLabel?: string;
    color?: "error" | "primary";
  }>(),
  { confirmLabel: "Confirmer", color: "primary" },
);

defineEmits<{ confirm: [] }>();
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <p class="text-default text-sm">
        {{ description }}
      </p>
      <slot />
    </template>
    <template #footer="{ close }">
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Annuler"
          @click="close"
        />
        <UButton
          :color="color"
          :label="confirmLabel"
          @click="$emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
