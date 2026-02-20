import Link from 'next/link'
import { getLevel } from '@/lib/gamification'

// Colour constants matching the app palette
const S = '#16a34a'   // sprout-600 — dark green
const SL = '#4ade80'  // sprout-400 — light green
const B = '#d946ef'   // bloom-500  — purple/pink
const BL = '#f0abfc'  // bloom-300  — light pink
const POT = '#b45309' // amber-700
const POT_RIM = '#92400e' // amber-800
const SOIL = '#78350f'    // amber-900

/** SVG plant that grows through 7 visual stages (level 0–6) */
function PlantSVG({ level }: { level: number }) {
  const stemTop = [91, 78, 65, 75, 75, 75, 75][level]
  const stemWidth = level >= 5 ? 5 : level >= 3 ? 3.5 : 2

  return (
    <svg viewBox="0 0 100 130" className="w-full h-full" style={{ overflow: 'visible' }}>
      {/* Outer glow for max level */}
      {level >= 6 && (
        <ellipse cx="50" cy="48" rx="36" ry="30" fill={B} opacity="0.08" />
      )}

      {/* Stem / trunk */}
      <line
        x1="50" y1="106" x2="50" y2={stemTop}
        stroke={S} strokeWidth={stemWidth} strokeLinecap="round"
      />

      {/* ── Level 0 — Seedling: tiny stem + 2 micro leaves ── */}
      {level === 0 && (
        <>
          <ellipse cx="43" cy="89" rx="7" ry="3" fill={SL} transform="rotate(-35 43 89)" />
          <ellipse cx="57" cy="89" rx="7" ry="3" fill={SL} transform="rotate(35 57 89)" />
        </>
      )}

      {/* ── Level 1 — Sapling: taller + 2 pairs of leaves ── */}
      {level === 1 && (
        <>
          <ellipse cx="41" cy="84" rx="9" ry="4" fill={S} transform="rotate(-25 41 84)" />
          <ellipse cx="59" cy="84" rx="9" ry="4" fill={S} transform="rotate(25 59 84)" />
          <ellipse cx="44" cy="75" rx="7" ry="3.5" fill={SL} transform="rotate(-30 44 75)" />
          <ellipse cx="56" cy="75" rx="7" ry="3.5" fill={SL} transform="rotate(30 56 75)" />
        </>
      )}

      {/* ── Level 2 — Sprout: 3 pairs + rounded top ── */}
      {level === 2 && (
        <>
          <ellipse cx="39" cy="77" rx="11" ry="5" fill={S} transform="rotate(-20 39 77)" />
          <ellipse cx="61" cy="77" rx="11" ry="5" fill={S} transform="rotate(20 61 77)" />
          <ellipse cx="41" cy="68" rx="9" ry="4" fill={SL} transform="rotate(-25 41 68)" />
          <ellipse cx="59" cy="68" rx="9" ry="4" fill={SL} transform="rotate(25 59 68)" />
          <ellipse cx="50" cy="63" rx="11" ry="9" fill={SL} />
        </>
      )}

      {/* ── Level 3 — Budgeter: bushy canopy ── */}
      {level === 3 && (
        <>
          <ellipse cx="50" cy="68" rx="21" ry="16" fill={S} />
          <ellipse cx="50" cy="62" rx="14" ry="10" fill={SL} />
          <ellipse cx="37" cy="71" rx="10" ry="8" fill={SL} />
          <ellipse cx="63" cy="71" rx="10" ry="8" fill={SL} />
        </>
      )}

      {/* ── Level 4 — Bloom: canopy + flowers ── */}
      {level === 4 && (
        <>
          <ellipse cx="50" cy="65" rx="23" ry="17" fill={S} />
          <ellipse cx="50" cy="58" rx="15" ry="11" fill={SL} />
          <ellipse cx="37" cy="69" rx="11" ry="9" fill={SL} />
          <ellipse cx="63" cy="69" rx="11" ry="9" fill={SL} />
          {/* Flowers */}
          <circle cx="41" cy="60" r="4.5" fill={BL} /><circle cx="41" cy="60" r="2.5" fill={B} />
          <circle cx="59" cy="57" r="4.5" fill={BL} /><circle cx="59" cy="57" r="2.5" fill={B} />
          <circle cx="50" cy="68" r="4.5" fill={BL} /><circle cx="50" cy="68" r="2.5" fill={B} />
          <circle cx="34" cy="68" r="3.5" fill={BL} /><circle cx="34" cy="68" r="1.8" fill={B} />
        </>
      )}

      {/* ── Level 5 — Flourishing: full tree + many flowers ── */}
      {level === 5 && (
        <>
          <ellipse cx="50" cy="58" rx="27" ry="21" fill={S} />
          <ellipse cx="50" cy="50" rx="20" ry="14" fill={SL} />
          <ellipse cx="33" cy="64" rx="14" ry="10" fill={S} />
          <ellipse cx="67" cy="64" rx="14" ry="10" fill={S} />
          <ellipse cx="33" cy="64" rx="9" ry="7" fill={SL} />
          <ellipse cx="67" cy="64" rx="9" ry="7" fill={SL} />
          <circle cx="39" cy="53" r="4.5" fill={BL} /><circle cx="39" cy="53" r="2.5" fill={B} />
          <circle cx="61" cy="49" r="4.5" fill={BL} /><circle cx="61" cy="49" r="2.5" fill={B} />
          <circle cx="50" cy="62" r="4.5" fill={BL} /><circle cx="50" cy="62" r="2.5" fill={B} />
          <circle cx="29" cy="60" r="3.5" fill={BL} /><circle cx="29" cy="60" r="1.8" fill={B} />
        </>
      )}

      {/* ── Level 6 — Thriving: majestic tree + sparkles ── */}
      {level >= 6 && (
        <>
          <ellipse cx="50" cy="52" rx="29" ry="23" fill={S} />
          <ellipse cx="50" cy="44" rx="22" ry="16" fill={SL} />
          <ellipse cx="31" cy="61" rx="16" ry="12" fill={S} />
          <ellipse cx="69" cy="61" rx="16" ry="12" fill={S} />
          <ellipse cx="31" cy="61" rx="10" ry="8" fill={SL} />
          <ellipse cx="69" cy="61" rx="10" ry="8" fill={SL} />
          <circle cx="38" cy="49" r="5" fill={BL} /><circle cx="38" cy="49" r="2.8" fill={B} />
          <circle cx="62" cy="45" r="5" fill={BL} /><circle cx="62" cy="45" r="2.8" fill={B} />
          <circle cx="50" cy="58" r="5" fill={BL} /><circle cx="50" cy="58" r="2.8" fill={B} />
          <circle cx="27" cy="58" r="4" fill={BL} /><circle cx="27" cy="58" r="2.2" fill={B} />
          <circle cx="73" cy="56" r="4" fill={BL} /><circle cx="73" cy="56" r="2.2" fill={B} />
          <text x="16" y="44" fontSize="9" textAnchor="middle" dominantBaseline="middle">✨</text>
          <text x="82" y="38" fontSize="9" textAnchor="middle" dominantBaseline="middle">✨</text>
          <text x="50" y="20" fontSize="11" textAnchor="middle" dominantBaseline="middle">✨</text>
        </>
      )}

      {/* ── Pot (always rendered last so it sits on top) ── */}
      <path d="M 37,107 L 63,107 L 66,124 Q 66,127 63,127 L 37,127 Q 34,127 34,124 Z" fill={POT} />
      <rect x="33" y="103" width="34" height="7" rx="3" fill={POT_RIM} />
      <ellipse cx="50" cy="105" rx="16" ry="3.5" fill={SOIL} />
      {/* Pot highlight */}
      <line x1="40" y1="111" x2="38" y2="124" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface PlayerStatsProps {
  totalXp: number
  streak: number
  achievementCount: number
  streakAtRisk?: boolean
}

export function PlayerStats({ totalXp, streak, achievementCount, streakAtRisk = false }: PlayerStatsProps) {
  const levelInfo = getLevel(totalXp)
  const isMaxLevel = levelInfo.nextLevelXp === null
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(
        (levelInfo.xpInLevel / (levelInfo.nextLevelXp! - levelInfo.xpForLevel)) * 100,
        100
      )

  return (
    <Link href="/achievements" className={`card card-hover flex items-center gap-3 ${streakAtRisk ? 'border border-amber-200 bg-amber-50/20' : ''}`}>
      {/* Plant */}
      <div className="w-14 h-16 flex-shrink-0">
        <PlantSVG level={levelInfo.level} />
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <p className="font-display font-bold text-gray-900 text-sm">{levelInfo.name}</p>
          <p className="text-[11px] text-gray-400">Lv {levelInfo.level + 1}</p>
        </div>

        {/* XP bar */}
        <div className="mt-1 mb-2">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sprout-400 to-bloom-400 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {!isMaxLevel && (
            <p className="text-[10px] text-gray-400 mt-0.5">{levelInfo.xpInLevel} / {levelInfo.nextLevelXp! - levelInfo.xpForLevel} XP</p>
          )}
        </div>

        {/* Streak + badges */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium flex items-center gap-1 ${
            streakAtRisk ? 'text-amber-600' : streak > 0 ? 'text-gray-700' : 'text-gray-400'
          }`}>
            <span>{streak > 0 ? '🔥' : '💤'}</span>
            {streak > 0 ? `${streak} day streak` : 'No streak yet'}
            {streakAtRisk && <span className="font-normal">· log today!</span>}
          </span>
          <span className="text-[11px] text-bloom-600 font-medium">{achievementCount} badges →</span>
        </div>
      </div>
    </Link>
  )
}
