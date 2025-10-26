import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
}

const TooltipProvider = ({ children }: TooltipProviderProps) => {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
}

const Tooltip = ({ children }: TooltipProps) => {
  return <>{children}</>
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const TooltipTrigger = ({ children, asChild }: TooltipTriggerProps) => {
  return <>{children}</>
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
  sideOffset?: number
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
