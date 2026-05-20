import { Check } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (stepNumber: number) => void
}

const Stepper = ({ steps, currentStep, onStepClick }: StepperProps) => {
  const { theme } = useTheme()
  const { colors } = theme

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isClickable = onStepClick && (isCompleted || isActive)
          const filled = isCompleted || isActive

          const circleStyle = filled
            ? {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                color: '#ffffff',
                boxShadow: isActive
                  ? `0 0 0 2px ${colors.background}, 0 0 0 4px color-mix(in srgb, ${colors.primary} 45%, transparent)`
                  : undefined,
              }
            : {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textSecondary,
              }

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(stepNumber)}
                  disabled={!isClickable}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-200 ${
                    isClickable ? 'cursor-pointer hover:scale-[1.03] active:scale-100' : 'cursor-not-allowed'
                  }`}
                  style={circleStyle}
                >
                  {isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p
                    className="text-xs font-semibold transition-colors duration-200"
                    style={{
                      color: isActive
                        ? colors.primary
                        : isCompleted
                          ? colors.textPrimary
                          : colors.textSecondary,
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className="mx-2 h-0.5 flex-1 transition-colors duration-200"
                  style={{
                    backgroundColor: isCompleted ? colors.primary : colors.border,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Stepper
