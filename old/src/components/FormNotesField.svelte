<script lang="ts">
  import Label from '@/components/ui/Label.svelte'
  import { trackField } from '@/lib/restore-field'
  let { value, onChange, id = 'form-notes' }: { value: string; onChange: (value: string) => void; id?: string } = $props()

  const readValue = () => value
</script>

<div class="space-y-1">
  <Label for={id}>บันทึก</Label>
  <textarea
    use:trackField={readValue}
    {id}
    name="notes"
    {value}
    oninput={(e) => onChange(e.currentTarget.value)}
    maxlength={1000}
    rows={3}
    placeholder="เพิ่มรายละเอียด…"
    class="field w-full resize-y"
  ></textarea>
</div>
