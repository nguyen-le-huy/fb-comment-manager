<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendHorizontalIcon, XIcon } from 'lucide-vue-next'

interface Emits {
  (e: 'submit', message: string): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

const message = ref('')
const isSubmitting = ref(false)
const textareaRef = ref<InstanceType<typeof Textarea> | null>(null)

onMounted(() => {
  if (textareaRef.value?.$el) {
    textareaRef.value.$el.focus()
  }
})

async function handleSubmit(): Promise<void> {
  if (!message.value.trim()) return
  isSubmitting.value = true
  try {
    emit('submit', message.value.trim())
    message.value = ''
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel(): void {
  message.value = ''
  emit('cancel')
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="space-y-2.5">
    <Textarea
      id="reply-textarea"
      ref="textareaRef"
      v-model="message"
      placeholder="Nhập nội dung phản hồi... (Enter để gửi, Shift+Enter để xuống dòng)"
      class="resize-none text-sm min-h-[80px] border-indigo-200 focus-visible:ring-indigo-400 bg-white"
      @keydown="handleKeydown"
    />
    <div class="flex items-center justify-between">
      <p class="text-xs text-slate-400">
        {{ message.length }}/8000 ký tự
      </p>
      <div class="flex gap-2">
        <Button
          id="reply-cancel-btn"
          variant="ghost"
          size="sm"
          class="h-8 px-3 text-xs text-slate-500 hover:text-slate-700"
          :disabled="isSubmitting"
          @click="handleCancel"
        >
          <XIcon class="h-3.5 w-3.5 mr-1" />
          Hủy
        </Button>
        <Button
          id="reply-submit-btn"
          size="sm"
          class="h-8 px-4 text-xs bg-indigo-500 hover:bg-indigo-600 text-white"
          :disabled="isSubmitting || !message.trim()"
          @click="handleSubmit"
        >
          <SendHorizontalIcon class="h-3.5 w-3.5 mr-1.5" />
          {{ isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi' }}
        </Button>
      </div>
    </div>
  </div>
</template>
