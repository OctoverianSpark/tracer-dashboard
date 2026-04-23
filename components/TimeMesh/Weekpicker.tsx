import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/_components/_ui/tooltip"

interface WeekPickerProps {
  onChange?: (selected: string[]) => void
  selected?: string[]
  values?: { key: string; label: string }[]
}

export function WeekPicker({
  onChange,
  selected = [],
  values = [],
}: WeekPickerProps) {

  function handleToggle(key: string) {
    if (!onChange) return
    const next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : [...selected, key]
    onChange(next)
  }

  return (
    <div className="flex gap-1">
      {values.map(({ key, label }) => {
        const active = selected.includes(key)
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleToggle(key)}
                className={`
                  flex-1 h-10 rounded-md text-sm font-medium border transition-colors cursor-pointer
                  ${active
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-500'}
                `}
              >
                {key}
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}