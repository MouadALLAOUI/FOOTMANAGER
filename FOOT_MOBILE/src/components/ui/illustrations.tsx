import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { palette } from '@/theme/colors';

interface IllustrationProps {
  width?: number;
  height?: number;
}

/**
 * Goalpost & ball illustration used across all empty states
 * Matches Panel 04 Empty State specification
 */
export function GoalpostEmptyIllustration({
  width = 160,
  height = 110,
}: IllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 110" fill="none">
      <Defs>
        <LinearGradient id="groundGrad" x1="80" y1="90" x2="80" y2="108" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={palette.primaryGreen} stopOpacity="0.25" />
          <Stop offset="1" stopColor={palette.primaryGreen} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Ground Shadow */}
      <Ellipse cx="80" cy="98" rx="68" ry="10" fill="url(#groundGrad)" />

      {/* Goal Netting Back */}
      <Path
        d="M28 82 L42 36 L118 36 L132 82 Z"
        fill="#E2E8F0"
        fillOpacity="0.5"
      />
      {/* Net Lines Horizontal */}
      <Path d="M32 70 L128 70" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M37 54 L123 54" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M40 44 L120 44" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

      {/* Net Lines Vertical */}
      <Path d="M52 36 L44 82" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M68 36 L64 82" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M80 36 L80 82" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M92 36 L96 82" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
      <Path d="M108 36 L116 82" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

      {/* Goal Posts & Crossbar */}
      {/* Back Support */}
      <Path d="M26 84 L40 34" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M134 84 L120 34" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M40 34 L120 34" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Front Goal Frame */}
      <Path
        d="M26 84 L26 30 L134 30 L134 84"
        stroke={palette.darkGreen}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Corner Brackets */}
      <Circle cx="26" cy="30" r="3.5" fill={palette.primaryGreen} />
      <Circle cx="134" cy="30" r="3.5" fill={palette.primaryGreen} />

      {/* Soccer Ball */}
      <G transform="translate(100, 72)">
        {/* Ball Shadow */}
        <Ellipse cx="14" cy="24" rx="14" ry="4" fill="rgba(15, 39, 71, 0.15)" />
        {/* Ball Body */}
        <Circle cx="14" cy="14" r="12" fill="#FFFFFF" stroke="#0F2747" strokeWidth="1.5" />
        {/* Pentagons */}
        <Path d="M14 8 L17 11 L15 15 L13 15 L11 11 Z" fill="#0F2747" />
        <Path d="M14 8 L14 3" stroke="#0F2747" strokeWidth="1" />
        <Path d="M17 11 L23 11" stroke="#0F2747" strokeWidth="1" />
        <Path d="M15 15 L19 21" stroke="#0F2747" strokeWidth="1" />
        <Path d="M13 15 L9 21" stroke="#0F2747" strokeWidth="1" />
        <Path d="M11 11 L5 11" stroke="#0F2747" strokeWidth="1" />
      </G>
    </Svg>
  );
}

/**
 * Stadium Pitch Vector for Splash Screen
 * Features 3D perspective pitch lines and goal box
 */
export function StadiumPitchBackground({
  width = 360,
  height = 240,
}: IllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 240" fill="none">
      <Defs>
        <LinearGradient id="pitchGrad" x1="180" y1="0" x2="180" y2="240" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#15803D" />
          <Stop offset="0.6" stopColor="#16A34A" />
          <Stop offset="1" stopColor="#22C55E" />
        </LinearGradient>
        <LinearGradient id="skyGrad" x1="180" y1="0" x2="180" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#0F2747" />
          <Stop offset="1" stopColor="#1E3A8A" stopOpacity="0.4" />
        </LinearGradient>
      </Defs>

      {/* Perspective Grass Field */}
      <Path d="M0 80 L360 80 L360 240 L0 240 Z" fill="url(#pitchGrad)" />

      {/* Alternating Grass Stripes */}
      <Path d="M20 80 L340 80 L360 120 L0 120 Z" fill="#15803D" fillOpacity="0.3" />
      <Path d="M0 160 L360 160 L360 200 L0 200 Z" fill="#15803D" fillOpacity="0.3" />

      {/* Center Circle & Line */}
      <Ellipse cx="180" cy="80" rx="60" ry="18" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.8" fill="none" />
      <Path d="M0 80 L360 80" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.8" />

      {/* Penalty Area Perspective */}
      <Path
        d="M90 240 L120 150 L240 150 L270 240"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeOpacity="0.8"
        fill="none"
      />
      {/* Goal Area Perspective */}
      <Path
        d="M130 240 L150 190 L210 190 L230 240"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeOpacity="0.8"
        fill="none"
      />
      {/* Penalty Spot */}
      <Circle cx="180" cy="170" r="3" fill="#FFFFFF" fillOpacity="0.9" />

      {/* Perspective Sidelines */}
      <Path d="M20 80 L0 240" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.9" />
      <Path d="M340 80 L360 240" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.9" />

      {/* Subtle Goal Net in Perspective */}
      <Path d="M136 238 L142 210 L218 210 L224 238" stroke="#FFFFFF" strokeWidth="3" strokeOpacity="0.95" fill="none" />
      <Path d="M142 210 L150 202 L210 202 L218 210" stroke="#E2E8F0" strokeWidth="1.5" strokeOpacity="0.6" fill="none" />
    </Svg>
  );
}

/**
 * Onboarding Slide 1 Illustration: "Find & book football fields near you"
 */
export function Onboarding1Illustration({
  width = 280,
  height = 200,
}: IllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
      {/* Green Field Circle Base */}
      <Circle cx="140" cy="110" r="85" fill={palette.primaryGreen} fillOpacity="0.12" />
      <Ellipse cx="140" cy="165" rx="90" ry="14" fill={palette.primaryGreen} fillOpacity="0.2" />

      {/* Mini Pitch Area */}
      <Rect x="80" y="80" width="120" height="75" rx="8" fill="#16A34A" />
      <Rect x="86" y="86" width="108" height="63" rx="4" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />
      <Path d="M140 86 L140 149" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" />
      <Circle cx="140" cy="117.5" r="14" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />

      {/* Player character kicking ball */}
      {/* Body */}
      <Path d="M150 78 L145 105 L135 125 L125 155" stroke="#0F2747" strokeWidth="6" strokeLinecap="round" />
      {/* Kicking Leg */}
      <Path d="M145 105 L165 118 L185 120" stroke="#0F2747" strokeWidth="6" strokeLinecap="round" />
      {/* Torso Jersey */}
      <Path d="M140 70 L155 75 L145 105 L132 100 Z" fill="#16A34A" />
      {/* Head */}
      <Circle cx="146" cy="58" r="10" fill="#F59E0B" />
      <Path d="M142 50 C146 48 154 52 154 56 C150 56 142 54 142 50 Z" fill="#0F2747" />

      {/* Ball Flying */}
      <Circle cx="205" cy="122" r="11" fill="#FFFFFF" stroke="#0F2747" strokeWidth="2" />
      <Path d="M205 117 L208 120 L206 124 L203 124 L202 120 Z" fill="#0F2747" />

      {/* Map Pin Location Indicator */}
      <G transform="translate(60, 40)">
        <Circle cx="18" cy="18" r="16" fill={palette.accentBlue} />
        <Path d="M18 10 C14.5 10 12 12.5 12 16 C12 21 18 26 18 26 C18 26 24 21 24 16 C24 12.5 21.5 10 18 10 Z" fill="#FFFFFF" />
        <Circle cx="18" cy="15.5" r="2.5" fill={palette.accentBlue} />
      </G>
    </Svg>
  );
}

/**
 * Onboarding Slide 2 Illustration: "Organize matches with your friends"
 */
export function Onboarding2Illustration({
  width = 280,
  height = 200,
}: IllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
      <Circle cx="140" cy="100" r="85" fill={palette.accentBlue} fillOpacity="0.1" />
      <Ellipse cx="140" cy="165" rx="80" ry="12" fill="rgba(15, 39, 71, 0.08)" />

      {/* Giant Mobile Screen / Clipboard in Center */}
      <Rect x="105" y="40" width="70" height="115" rx="12" fill="#FFFFFF" stroke={palette.navy} strokeWidth="3" />
      <Rect x="115" y="55" width="50" height="8" rx="4" fill={palette.primaryGreen} />
      <Rect x="115" y="70" width="35" height="5" rx="2.5" fill="#E2E8F0" />
      <Rect x="115" y="80" width="50" height="5" rx="2.5" fill="#E2E8F0" />
      {/* Checkmarks */}
      <Circle cx="120" cy="98" r="4" fill={palette.primaryGreen} />
      <Rect x="128" y="96" width="30" height="4" rx="2" fill="#CBD5E1" />
      <Circle cx="120" cy="112" r="4" fill={palette.primaryGreen} />
      <Rect x="128" y="110" width="25" height="4" rx="2" fill="#CBD5E1" />
      <Circle cx="120" cy="126" r="4" fill={palette.primaryGreen} />
      <Rect x="128" y="124" width="32" height="4" rx="2" fill="#CBD5E1" />

      {/* Friend Character Left */}
      <Circle cx="75" cy="80" r="10" fill="#F59E0B" />
      <Path d="M68 94 C68 90 82 90 82 94 L85 130 L65 130 Z" fill={palette.primaryGreen} />

      {/* Friend Character Right */}
      <Circle cx="205" cy="80" r="10" fill="#F59E0B" />
      <Path d="M198 94 C198 90 212 90 212 94 L215 130 L195 130 Z" fill={palette.accentBlue} />
    </Svg>
  );
}

/**
 * Onboarding Slide 3 Illustration: "Be part of a bigger football community"
 */
export function Onboarding3Illustration({
  width = 280,
  height = 200,
}: IllustrationProps): React.JSX.Element {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 200" fill="none">
      <Circle cx="140" cy="100" r="85" fill={palette.darkGreen} fillOpacity="0.1" />
      <Ellipse cx="140" cy="165" rx="90" ry="12" fill="rgba(15, 39, 71, 0.08)" />

      {/* Group of 4 players standing shoulder-to-shoulder with jersey numbers */}
      {/* Player 1 Left */}
      <Circle cx="80" cy="85" r="9" fill="#F59E0B" />
      <Path d="M72 98 C72 94 88 94 88 98 L90 140 L70 140 Z" fill="#0F2747" />

      {/* Player 2 Center-Left (Trophy Bearer) */}
      <Circle cx="120" cy="75" r="11" fill="#F59E0B" />
      <Path d="M109 90 C109 85 131 85 131 90 L133 145 L107 145 Z" fill={palette.primaryGreen} />

      {/* Player 3 Center-Right */}
      <Circle cx="160" cy="75" r="11" fill="#F59E0B" />
      <Path d="M149 90 C149 85 171 85 171 90 L173 145 L147 145 Z" fill={palette.primaryGreen} />

      {/* Player 4 Right */}
      <Circle cx="200" cy="85" r="9" fill="#F59E0B" />
      <Path d="M192 98 C192 94 208 94 208 98 L210 140 L190 140 Z" fill="#0F2747" />

      {/* Trophy in Front */}
      <G transform="translate(126, 115)">
        <Path d="M7 6 L21 6 L19 18 C19 22 15 24 14 24 C13 24 9 22 9 18 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
        <Path d="M5 8 C2 8 2 14 6 15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <Path d="M23 8 C26 8 26 14 22 15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <Rect x="12" y="24" width="4" height="6" fill="#D97706" />
        <Rect x="9" y="30" width="10" height="4" rx="1" fill="#B45309" />
      </G>
    </Svg>
  );
}

/**
 * Full FootMANAGER Arabic Calligraphy Brand Logo Mark
 * Displays "أجي نقصروا" with soccer athlete icon and "FOOTMANAGER" sub-brand
 */
export function BrandLogoMark({
  size = 72,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}): React.JSX.Element {
  const primary = palette.primaryGreen;
  const textColor = inverted ? '#FFFFFF' : palette.navy;

  return (
    <Svg width={size * 1.8} height={size} viewBox="0 0 180 100" fill="none">
      {/* Player Ball Emblem */}
      <G transform="translate(72, 4)">
        {/* Ball Head */}
        <Circle cx="18" cy="10" r="7" fill={primary} />
        {/* Athletic Swoosh Body */}
        <Path
          d="M6 32 C12 20 24 20 30 32"
          stroke={primary}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Path
          d="M12 28 C15 22 21 22 24 28"
          stroke={palette.darkGreen}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </G>

      {/* Arabic Script: "أجي نقصروا" */}
      <Path
        d="M35 52 Q40 45 46 54 T58 52 M62 48 L62 60 M75 52 Q85 46 95 56 T115 50 M120 48 L120 62 M130 52 Q140 46 148 54"
        stroke={textColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Arabic Nuqtas / Diacritics */}
      <Circle cx="62" cy="42" r="2.5" fill={primary} />
      <Circle cx="88" cy="42" r="2.5" fill={primary} />
      <Circle cx="120" cy="42" r="2.5" fill={primary} />
      <Circle cx="140" cy="62" r="2.5" fill={primary} />

      {/* English FootMANAGER Text */}
      <Path
        d="M25 80 L155 80"
        stroke={primary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
