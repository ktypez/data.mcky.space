<script lang="ts">
  import Label from '@/components/ui/Label.svelte'
  let { value, onChange, id = 'form-notes' }: { value: string; onChange: (value: string) => void; id?: string } = $props()
</script>

<div class="space-y-1">
  <Label for={id}>บันทึก</Label>
  <textarea
    {id}
    name="notes"
    {value}
    oninput={(e) => onChange(e.currentTarget.value)}
    maxlength={1000}
    rows={3}
    placeholder="เพิ่มรายละเอียด…"
    class="w-full resize-y rounded-[6px] border border-border bg-card px-3 py-2 font-sans text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
  ></textarea>
</div>
