'use client'

interface PlantVisualProps {
  progress: number // 0-100+
  size?: 'sm' | 'md' | 'lg'
}

export function PlantVisual({ progress, size = 'md' }: PlantVisualProps) {
  // Determine growth stage based on progress
  const stage = getGrowthStage(progress)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  return (
    <div className={`${sizeClasses[size]} relative flex items-end justify-center`}>
      {/* Pot */}
      <div className="absolute bottom-0 w-3/5 h-1/4 bg-gradient-to-b from-coral-300 to-coral-400 rounded-b-lg rounded-t-sm" />
      <div className="absolute bottom-[20%] w-2/3 h-[8%] bg-coral-300 rounded-t-sm" />

      {/* Soil */}
      <div className="absolute bottom-[24%] w-1/2 h-[6%] bg-amber-800 rounded-full" />

      {/* Plant stages */}
      <div className="absolute bottom-[28%] flex flex-col items-center">
        {stage >= 1 && <Seed size={size} />}
        {stage >= 2 && <Sprout size={size} />}
        {stage >= 3 && <Stem size={size} stage={stage} />}
        {stage >= 4 && <Leaves size={size} stage={stage} />}
        {stage >= 5 && <Flower size={size} stage={stage} />}
        {stage >= 6 && <ExtraFlowers size={size} stage={stage} />}
      </div>
    </div>
  )
}

function getGrowthStage(progress: number): number {
  if (progress <= 0) return 0
  if (progress < 10) return 1  // Seed
  if (progress < 25) return 2  // Sprout
  if (progress < 50) return 3  // Stem
  if (progress < 75) return 4  // Leaves
  if (progress < 100) return 5 // Flower
  // Beyond 100%, add more flowers
  return 5 + Math.floor((progress - 100) / 25)
}

function Seed({ size }: { size: string }) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : 1
  return (
    <div
      className="w-2 h-2 bg-amber-600 rounded-full animate-bloom"
      style={{ transform: `scale(${scale})` }}
    />
  )
}

function Sprout({ size }: { size: string }) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : 1
  return (
    <div className="flex flex-col items-center animate-grow" style={{ transform: `scale(${scale})` }}>
      <div className="w-1 h-3 bg-sprout-400 rounded-full" />
      <div className="flex -mt-2">
        <div className="w-2 h-3 bg-sprout-400 rounded-full -rotate-45 origin-bottom" />
        <div className="w-2 h-3 bg-sprout-400 rounded-full rotate-45 origin-bottom -ml-1" />
      </div>
    </div>
  )
}

function Stem({ size, stage }: { size: string; stage: number }) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : 1
  const height = Math.min(stage * 4, 20)
  return (
    <div
      className="w-1.5 bg-gradient-to-t from-sprout-500 to-sprout-400 rounded-full animate-grow"
      style={{
        height: `${height * scale}px`,
        transform: `scale(${scale})`,
      }}
    />
  )
}

function Leaves({ size, stage }: { size: string; stage: number }) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : 1
  const leafCount = Math.min(stage - 3, 4)

  return (
    <div className="relative animate-bloom" style={{ transform: `scale(${scale})` }}>
      {Array.from({ length: leafCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-5 bg-sprout-400 rounded-full"
          style={{
            transform: `rotate(${i * 90 + 45}deg) translateY(-6px)`,
            transformOrigin: 'bottom center',
          }}
        />
      ))}
    </div>
  )
}

function Flower({ size, stage }: { size: string; stage: number }) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 0.8 : 1
  const petalCount = Math.min(stage - 4 + 5, 8)

  return (
    <div className="relative -mt-1 animate-bloom" style={{ transform: `scale(${scale})` }}>
      {/* Petals */}
      {Array.from({ length: petalCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-4 bg-bloom-300 rounded-full"
          style={{
            transform: `rotate(${i * (360 / petalCount)}deg) translateY(-4px)`,
            transformOrigin: 'bottom center',
          }}
        />
      ))}
      {/* Center */}
      <div className="relative z-10 w-3 h-3 bg-amber-300 rounded-full border-2 border-amber-400" />
    </div>
  )
}

function ExtraFlowers({ size, stage }: { size: string; stage: number }) {
  const scale = size === 'sm' ? 0.5 : size === 'md' ? 0.7 : 0.85
  const extraFlowerCount = Math.min(stage - 5, 3)

  if (extraFlowerCount <= 0) return null

  return (
    <>
      {Array.from({ length: extraFlowerCount }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-bloom"
          style={{
            transform: `scale(${scale}) translate(${(i % 2 === 0 ? -1 : 1) * 12}px, ${-8 - i * 6}px)`,
          }}
        >
          {/* Mini flower */}
          {Array.from({ length: 5 }).map((_, j) => (
            <div
              key={j}
              className="absolute w-2 h-3 bg-bloom-200 rounded-full"
              style={{
                transform: `rotate(${j * 72}deg) translateY(-3px)`,
                transformOrigin: 'bottom center',
              }}
            />
          ))}
          <div className="relative z-10 w-2 h-2 bg-amber-200 rounded-full" />
        </div>
      ))}
    </>
  )
}
