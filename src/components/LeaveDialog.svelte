<script lang="ts">
  import AppDialog from '@/components/AppDialog.svelte'
  import { leaveRequest, confirmLeave, cancelLeave } from '@/lib/form-dirty'
</script>

<AppDialog open={$leaveRequest !== null} onClose={cancelLeave} title="มีการเปลี่ยนแปลงที่ยังไม่บันทึก" showHeader={false}>
  <div class="p-5">
    <span class="grid size-11 place-items-center rounded-full bg-accent/15 text-foreground" aria-hidden="true">!</span>
    <p class="mt-3 text-[17px] font-bold">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</p>
    <p class="mt-1 text-[13px] leading-6 text-muted-foreground">หากออกตอนนี้ การแก้ไขจะหายไป</p>
    <div class="mt-4 flex justify-end gap-2">
      <button type="button" onclick={cancelLeave} class="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">แก้ไขต่อ</button>
      <button type="button" onclick={confirmLeave} class="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">ออกโดยไม่บันทึก</button>
    </div>
  </div>
</AppDialog>
