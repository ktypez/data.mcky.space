<script lang="ts">
  import AppDialog from '@/components/AppDialog.svelte'
  import { leaveRequest, confirmLeave, cancelLeave } from '@/lib/form-dirty'
  import Asterisk from '@/components/ui/Asterisk.svelte'
</script>

<AppDialog open={$leaveRequest !== null} onClose={cancelLeave} title="มีการเปลี่ยนแปลงที่ยังไม่บันทึก" showHeader={false}>
  <div class="p-6">
    <span class="grid size-11 place-items-center rounded-xl border-[1.5px] border-acc bg-tint text-acc-ink" style="box-shadow: 2px 2px 0 0 var(--acc);" aria-hidden="true">
      <Asterisk class="size-5" />
    </span>
    <p class="mt-3 text-[17px] font-bold text-ink">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</p>
    <p class="mt-1 text-[13px] leading-6 text-ink-soft">หากออกตอนนี้ การแก้ไขจะหายไป</p>
    <div class="mt-5 flex justify-end gap-2">
      <button type="button" onclick={cancelLeave} class="btn btn-ghost">แก้ไขต่อ</button>
      <button type="button" onclick={confirmLeave} class="btn btn-danger">ออกโดยไม่บันทึก</button>
    </div>
  </div>
</AppDialog>
