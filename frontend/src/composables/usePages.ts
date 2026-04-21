import { ref, type Ref } from 'vue'
import { apiService } from '@/services/api.service'
import { useToast } from '@/lib/toast'
import type { FbPage } from '@/types/page.types'

interface UsePagesResult {
  pages: Ref<FbPage[]>
  isPagesLoading: Ref<boolean>
  fetchPages: () => Promise<void>
}

export function usePages(): UsePagesResult {
  const pages = ref<FbPage[]>([])
  const isPagesLoading = ref(false)
  const { toast } = useToast()

  async function fetchPages(): Promise<void> {
    isPagesLoading.value = true
    try {
      const data = await apiService.get<FbPage[]>('/facebook/pages')
      pages.value = data
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách fanpage.',
        variant: 'destructive',
      })
    } finally {
      isPagesLoading.value = false
    }
  }

  return { pages, isPagesLoading, fetchPages }
}
