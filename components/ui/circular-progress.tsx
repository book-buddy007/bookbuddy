import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number
    size?: number
    strokeWidth?: number
    circleColor?: string
    progressColor?: string
}

export function CircularProgress({
    value,
    size = 40,
    strokeWidth = 4,
    circleColor = "text-muted/20",
    progressColor = "text-primary",
    className,
    ...props
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    return (
        <div
            className={cn("relative inline-flex items-center justify-center", className)}
            style={{ width: size, height: size }}
            {...props}
        >
            <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
                {/* Background Circle */}
                <circle
                    className={circleColor}
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress Circle */}
                <circle
                    className={cn(progressColor, "transition-all duration-500 ease-out")}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
        </div>
    )
}
