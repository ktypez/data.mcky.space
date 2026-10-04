<script lang="ts">
  import { Plus, X } from 'phosphor-svelte'
  import Input from '@/components/ui/Input.svelte'
  import Button from '@/components/ui/Button.svelte'

  let {
    values,
    onChange,
    placeholder,
    maxLength,
    addLabel = 'เพิ่ม',
    variant = 'default',
    autoFocus,
    inlineAdd,
  }: {
    values: string[]
    onChange: (values: string[]) => void
    placeholder?: string
    maxLength?: number
    addLabel?: string
    variant?: 'default' | 'error'
    autoFocus?: boolean
    inlineAdd?: boolean
  } = $props()

  const update = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    onChange(next)
  }
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i))
  const add = () => onChange([...values, ''])

  let showInline = $derived(inlineAdd && values.length >= 1)
</script>

<div class="space-y-1.5">
  {#each values as v, i (i)}
    <div class="flex items-center gap-1.5">
      <Input
        syncValue={() => values[i] ?? ''}
        type="text"
        value={v}
        oninput={(e) => update(i, e.currentTarget.value)}
        maxlength={maxLength}
        {variant}
        {placeholder}
        aria-label={i === 0 ? placeholder : `${placeholder ?? 'ค่า'} ${i + 1}`}
        autofocus={autoFocus && i === 0}
        autocomplete="off"
        spellcheck="false"
        name={i === 0 ? placeholder : `${placeholder}-${i}`}
      />
      {#if values.length > 1}
        <Button type="button" variant="ghost" size="icon" class="shrink-0 text-muted-foreground" onclick={() => remove(i)} aria-label="ลบช่องนี้">
          <X class="w-4 h-4" />
        </Button>
      {:else if showInline && i === 0}
        <Button type="button" onclick={add} aria-label={addLabel} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus class="h-4 w-4" weight="bold" />
        </Button>
      {/if}
      {#if showInline && values.length > 1 && i === values.length - 1}
        <Button type="button" onclick={add} aria-label={addLabel} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus class="h-4 w-4" weight="bold" />
        </Button>
      {/if}
    </div>
  {/each}
  {#if !inlineAdd}
    <Button type="button" variant="outline" size="sm" class="w-full border-dashed" onclick={add}>
      <Plus class="w-3.5 h-3.5" />
      {addLabel}
    </Button>
  {/if}
  {#if inlineAdd && values.length === 0}
    <Button type="button" onclick={add} aria-label={addLabel} class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
      <Plus class="h-4 w-4" weight="bold" />
    </Button>
  {/if}
</div>
