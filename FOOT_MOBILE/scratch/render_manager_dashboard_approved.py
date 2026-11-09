import os
from PIL import Image, ImageDraw, ImageFont

W, H = 682, 1024
font_bold = r'C:\Windows\Fonts\arialbd.ttf'
font_reg = r'C:\Windows\Fonts\arial.ttf'

def get_font(size, bold=False):
    path = font_bold if bold else font_reg
    return ImageFont.truetype(path, size)

img = Image.new('RGB', (W, H), '#F8FAFC')
draw = ImageDraw.Draw(img)

# ── Background Stadium Pattern ──
bg_path = 'assets/role-selection-bg.png'
if os.path.exists(bg_path):
    bg = Image.open(bg_path).resize((W, H)).convert('RGBA')
    bg.putalpha(30)
    img.paste(bg, (0, 0), bg)

# ── Status Bar (9:41, wifi, battery) ──
draw.text((80, 24), '9:41', font=get_font(14, True), fill='#0B192C')
draw.text((W - 130, 24), '📶 🔋', font=get_font(13, False), fill='#0B192C')

# ── A. Header (Y: 42..105) ──
# Left: Notification bell with unread badge 3
draw.rounded_rectangle([48, 44, 94, 90], radius=15, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((61, 56), '🔔', font=get_font(17, False), fill='#0B192C')
draw.ellipse([80, 40, 100, 60], fill='#EF4444')
draw.text((87, 43), '3', font=get_font(11, True), fill='#FFFFFF')

# Center: Brand Logo
logo_path = 'assets/role-header-logo.png'
if os.path.exists(logo_path):
    logo = Image.open(logo_path).resize((36, 36)).convert('RGBA')
    img.paste(logo, (W // 2 - 18, 42), logo)
draw.text((W // 2 - 44, 80), 'AJI NQSSRO', font=get_font(12, True), fill='#0B192C')

# Right: Greeting & Manager Avatar
coach_path = 'assets/dashboard-coach-avatar.png'
if os.path.exists(coach_path):
    coach = Image.open(coach_path).resize((50, 50)).convert('RGBA')
    mask = Image.new('L', (50, 50), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, 50, 50], fill=255)
    img.paste(coach, (W - 98, 44), mask)
    draw.ellipse([W - 98, 44, W - 48, 94], outline='#00875A', width=2)

draw.text((W - 180, 50), 'مرحبا بك', font=get_font(12, False), fill='#64748B')
draw.text((W - 200, 70), 'مسيّر الفريق', font=get_font(14, True), fill='#0B192C')


# ── B. Team Identity Card & Ranking Card (Y: 120..235, Height: 115) ──
# Behind them: palm trees & stadium strip
curr_y = 120

# Left Card: Main Team Card (X: 48..425, W: 377)
draw.rounded_rectangle([48, curr_y, 425, curr_y + 115], radius=22, fill='#FFFFFF', outline='#E2E8F0', width=2)

# Team Logo inside Left Card (on left inside card)
team_logo_path = 'assets/preset-team-logo-1.png'
if os.path.exists(team_logo_path):
    tlogo = Image.open(team_logo_path).resize((66, 66)).convert('RGBA')
    draw.rounded_rectangle([62, curr_y + 16, 138, curr_y + 92], radius=16, fill='#F8FAFC', outline='#E2E8F0', width=1)
    img.paste(tlogo, (67, curr_y + 21), tlogo)

# Small edit pencil button on bottom-left of logo
draw.ellipse([60, curr_y + 76, 82, curr_y + 98], fill='#FFFFFF', outline='#CBD5E1', width=1)
draw.text((67, curr_y + 79), '✏️', font=get_font(10, False), fill='#00875A')

# Team Texts (RTL: aligned towards right side of card)
draw.text((425 - 180, curr_y + 16), 'نجوم زاكورة', font=get_font(21, True), fill='#0B192C')
draw.text((425 - 135, curr_y + 48), 'فريق كرة قدم', font=get_font(12, False), fill='#64748B')

# Status Badge: معتمد من الإدارة (Green Pill)
draw.rounded_rectangle([425 - 200, curr_y + 74, 425 - 35, curr_y + 102], radius=14, fill='#00875A')
draw.ellipse([425 - 55, curr_y + 79, 425 - 41, curr_y + 93], fill='#FFFFFF')
draw.text((425 - 51, curr_y + 80), '✓', font=get_font(9, True), fill='#00875A')
draw.text((425 - 190, curr_y + 80), 'معتمد من الإدارة', font=get_font(12, True), fill='#FFFFFF')

# Right Card: Ranking Card (X: 438..634, W: 196)
draw.rounded_rectangle([438, curr_y, 634, curr_y + 115], radius=22, fill='#FFFFFF', outline='#E2E8F0', width=2)
# Top Row: التصنيف #12
draw.text((634 - 60, curr_y + 16), 'التصنيف', font=get_font(12, False), fill='#64748B')
draw.text((455, curr_y + 14), '#12', font=get_font(19, True), fill='#0B192C')
# Divider
draw.line([452, curr_y + 50, 620, curr_y + 50], fill='#F1F5F9', width=1)
# Bottom Row: Golden trophy wreath + نقاط الفريق 320 ⭐
rank_trophy_path = 'assets/dashboard-ranking-trophy.png'
if os.path.exists(rank_trophy_path):
    rtrophy = Image.open(rank_trophy_path).resize((46, 38)).convert('RGBA')
    img.paste(rtrophy, (450, curr_y + 62), rtrophy)
draw.text((634 - 85, curr_y + 60), 'نقاط الفريق', font=get_font(11, False), fill='#64748B')
draw.text((634 - 95, curr_y + 80), '320 ⭐', font=get_font(16, True), fill='#0B192C')


# ── C. Statistics Bar (Y: 248..320, Height: 72) ──
curr_y = 248
draw.rounded_rectangle([48, curr_y, 634, curr_y + 72], radius=18, fill='#FFFFFF', outline='#E2E8F0', width=2)

cell_w = (634 - 48) // 5

# 1. لاعباً 24 (Rightmost)
c1_x = 48 + 4 * cell_w
draw.text((c1_x + cell_w // 2 - 12, curr_y + 12), '👥', font=get_font(18, False), fill='#00875A')
draw.text((c1_x + cell_w // 2 - 25, curr_y + 42), '24 لاعباً', font=get_font(12, True), fill='#0B192C')
draw.line([c1_x, curr_y + 14, c1_x, curr_y + 58], fill='#E2E8F0', width=1)

# 2. مباريات 8
c2_x = 48 + 3 * cell_w
draw.text((c2_x + cell_w // 2 - 10, curr_y + 12), '⚽', font=get_font(16, False), fill='#0B192C')
draw.text((c2_x + cell_w // 2 - 26, curr_y + 42), '8 مباريات', font=get_font(12, True), fill='#0B192C')
draw.line([c2_x, curr_y + 14, c2_x, curr_y + 58], fill='#E2E8F0', width=1)

# 3. انتصارات 5
c3_x = 48 + 2 * cell_w
draw.text((c3_x + cell_w // 2 - 10, curr_y + 12), '🏆', font=get_font(16, False), fill='#00875A')
draw.text((c3_x + cell_w // 2 - 32, curr_y + 42), '5 انتصارات', font=get_font(12, True), fill='#00875A')
draw.line([c3_x, curr_y + 14, c3_x, curr_y + 58], fill='#E2E8F0', width=1)

# 4. تعادلات 2
c4_x = 48 + cell_w
draw.text((c4_x + cell_w // 2 - 10, curr_y + 12), '🤝', font=get_font(16, False), fill='#D97706')
draw.text((c4_x + cell_w // 2 - 24, curr_y + 42), '2 تعادلات', font=get_font(12, True), fill='#D97706')
draw.line([c4_x, curr_y + 14, c4_x, curr_y + 58], fill='#E2E8F0', width=1)

# 5. هزيمة 1 (Leftmost)
c5_x = 48
draw.text((c5_x + cell_w // 2 - 10, curr_y + 12), '❌', font=get_font(15, False), fill='#EF4444')
draw.text((c5_x + cell_w // 2 - 20, curr_y + 42), '1 هزيمة', font=get_font(12, True), fill='#EF4444')


# ── D. Main Information Cards (Y: 334..526, Height: 192) ──
curr_y = 334
card_w = (634 - 48 - 14) // 2

# Left Card: المباراة القادمة (X: 48..48+card_w)
draw.rounded_rectangle([48, curr_y, 48 + card_w, curr_y + 192], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
# Header Banner
draw.rounded_rectangle([48, curr_y, 48 + card_w, curr_y + 38], radius=20, fill='#00875A')
draw.rectangle([48, curr_y + 20, 48 + card_w, curr_y + 38], fill='#00875A')
draw.text((48 + card_w // 2 - 45, curr_y + 10), '📅 المباراة القادمة', font=get_font(13, True), fill='#FFFFFF')

# Matchup Row: Host VS Opponent
# Right: نجوم زاكورة (green shield)
if os.path.exists(team_logo_path):
    hlogo = Image.open(team_logo_path).resize((36, 36)).convert('RGBA')
    img.paste(hlogo, (48 + card_w - 56, curr_y + 46), hlogo)
draw.text((48 + card_w - 76, curr_y + 86), 'نجوم زاكورة', font=get_font(11, True), fill='#0B192C')

# Center: VS
draw.text((48 + card_w // 2 - 12, curr_y + 60), 'VS', font=get_font(13, True), fill='#64748B')

# Left: أطلس زاكورة (red shield)
atlas_logo_path = 'assets/preset-team-logo-atlas.png'
if os.path.exists(atlas_logo_path):
    alogo = Image.open(atlas_logo_path).resize((36, 36)).convert('RGBA')
    img.paste(alogo, (48 + 20, curr_y + 46), alogo)
draw.text((48 + 12, curr_y + 86), 'أطلس زاكورة', font=get_font(11, True), fill='#0B192C')

# Match Details
draw.line([48 + 14, curr_y + 110, 48 + card_w - 14, curr_y + 110], fill='#F1F5F9', width=1)
draw.text((48 + card_w - 180, curr_y + 120), '📅 الجمعة 31 يناير 2025', font=get_font(11, False), fill='#475569')
draw.text((48 + card_w - 95, curr_y + 142), '⏱️ 21:00', font=get_font(12, True), fill='#0B192C')
draw.text((48 + card_w - 165, curr_y + 164), '📍 ملعب زاكورة البلدي', font=get_font(11, False), fill='#475569')


# Right Card: حجز الملعب القادم (X: 48 + card_w + 14 .. 634)
r_x = 48 + card_w + 14
draw.rounded_rectangle([r_x, curr_y, 634, curr_y + 192], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
# Header Banner
draw.rounded_rectangle([r_x, curr_y, 634, curr_y + 38], radius=20, fill='#00875A')
draw.rectangle([r_x, curr_y + 20, 634, curr_y + 38], fill='#00875A')
draw.text((r_x + card_w // 2 - 58, curr_y + 10), '🏟️ حجز الملعب القادم', font=get_font(13, True), fill='#FFFFFF')

# Pitch thumbnail
pitch_thumb_path = 'assets/dashboard-pitch-thumb.png'
if os.path.exists(pitch_thumb_path):
    pthumb = Image.open(pitch_thumb_path).resize((card_w - 20, 60)).convert('RGBA')
    img.paste(pthumb, (r_x + 10, curr_y + 44), pthumb)

# Stadium Name
draw.text((634 - 155, curr_y + 110), 'ملعب زاكورة البلدي', font=get_font(13, True), fill='#0B192C')
# Date & Time
draw.text((634 - 185, curr_y + 130), '📅 الأربعاء 29 يناير 2025', font=get_font(11, False), fill='#475569')
draw.text((634 - 145, curr_y + 148), '⏱️ 20:00 - 21:00', font=get_font(11, True), fill='#0B192C')

# Status Pill: مؤكّد
draw.rounded_rectangle([r_x + card_w // 2 - 45, curr_y + 166, r_x + card_w // 2 + 45, curr_y + 188], radius=11, fill='#00875A')
draw.ellipse([r_x + card_w // 2 + 22, curr_y + 170, r_x + card_w // 2 + 36, curr_y + 184], fill='#FFFFFF')
draw.text((r_x + card_w // 2 + 25, curr_y + 171), '✓', font=get_font(9, True), fill='#00875A')
draw.text((r_x + card_w // 2 - 25, curr_y + 171), 'مؤكّد', font=get_font(11, True), fill='#FFFFFF')


# ── E. Management Services Grid (Y: 540..788, Height: 248) ──
curr_y = 540
s_w = (634 - 48 - 20) // 3
s_h = 114

# --- Row 1 (Y: 540..654) ---
# 1. إدارة اللاعبين (Right: 48 + 2*s_w + 20 .. 634) - Highlighted Mint Card
sr1_x = 48 + 2 * s_w + 20
draw.rounded_rectangle([sr1_x, curr_y, 634, curr_y + s_h], radius=20, fill='#F0FDF4', outline='#86EFAC', width=2)
# Red notification dot at top left
draw.ellipse([sr1_x + 12, curr_y + 12, sr1_x + 20, curr_y + 20], fill='#EF4444')
draw.text((sr1_x + s_w // 2 - 16, curr_y + 20), '👥', font=get_font(26, False), fill='#00875A')
draw.text((sr1_x + s_w // 2 - 38, curr_y + 58), 'إدارة اللاعبين', font=get_font(14, True), fill='#0B192C')
draw.ellipse([sr1_x + s_w // 2 - 12, curr_y + 84, sr1_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr1_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')

# 2. المباريات والتحديات (Center: 48 + s_w + 10)
sr2_x = 48 + s_w + 10
draw.rounded_rectangle([sr2_x, curr_y, sr2_x + s_w, curr_y + s_h], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
ball_path = 'assets/dashboard-card-ball.png'
if os.path.exists(ball_path):
    cball = Image.open(ball_path).resize((46, 32)).convert('RGBA')
    img.paste(cball, (sr2_x + s_w // 2 - 23, curr_y + 18), cball)
draw.text((sr2_x + 18, curr_y + 58), 'المباريات والتحديات', font=get_font(13, True), fill='#0B192C')
draw.ellipse([sr2_x + s_w // 2 - 12, curr_y + 84, sr2_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr2_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')

# 3. البطولات (Left: 48 .. 48 + s_w)
sr3_x = 48
draw.rounded_rectangle([sr3_x, curr_y, sr3_x + s_w, curr_y + s_h], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
trophy_card_path = 'assets/dashboard-card-trophy.png'
if os.path.exists(trophy_card_path):
    ctrophy = Image.open(trophy_card_path).resize((42, 32)).convert('RGBA')
    img.paste(ctrophy, (sr3_x + s_w // 2 - 21, curr_y + 18), ctrophy)
draw.text((sr3_x + s_w // 2 - 25, curr_y + 58), 'البطولات', font=get_font(14, True), fill='#0B192C')
draw.ellipse([sr3_x + s_w // 2 - 12, curr_y + 84, sr3_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr3_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')


# --- Row 2 (Y: 666..780) ---
curr_y = 666

# 4. معلومات الفريق (Right)
draw.rounded_rectangle([sr1_x, curr_y, 634, curr_y + s_h], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((sr1_x + s_w // 2 - 14, curr_y + 18), '🛡️', font=get_font(24, False), fill='#00875A')
draw.text((sr1_x + s_w // 2 - 40, curr_y + 58), 'معلومات الفريق', font=get_font(13, True), fill='#0B192C')
draw.ellipse([sr1_x + s_w // 2 - 12, curr_y + 84, sr1_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr1_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')

# 5. حجوزات الملعب (Center)
draw.rounded_rectangle([sr2_x, curr_y, sr2_x + s_w, curr_y + s_h], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((sr2_x + s_w // 2 - 14, curr_y + 18), '📅', font=get_font(24, False), fill='#00875A')
draw.text((sr2_x + s_w // 2 - 38, curr_y + 58), 'حجوزات الملعب', font=get_font(13, True), fill='#0B192C')
draw.ellipse([sr2_x + s_w // 2 - 12, curr_y + 84, sr2_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr2_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')

# 6. الإشعارات (Left)
draw.rounded_rectangle([sr3_x, curr_y, sr3_x + s_w, curr_y + s_h], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
# Red notification badge 3
draw.ellipse([sr3_x + s_w - 32, curr_y + 10, sr3_x + s_w - 14, curr_y + 28], fill='#EF4444')
draw.text((sr3_x + s_w - 26, curr_y + 12), '3', font=get_font(10, True), fill='#FFFFFF')
draw.text((sr3_x + s_w // 2 - 14, curr_y + 20), '🔔', font=get_font(24, False), fill='#00875A')
draw.text((sr3_x + s_w // 2 - 28, curr_y + 58), 'الإشعارات', font=get_font(14, True), fill='#0B192C')
draw.ellipse([sr3_x + s_w // 2 - 12, curr_y + 84, sr3_x + s_w // 2 + 12, curr_y + 108], fill='#FFFFFF', outline='#E2E8F0', width=1)
draw.text((sr3_x + s_w // 2 - 5, curr_y + 86), '›', font=get_font(15, True), fill='#00875A')


# ── F. Tournament Promotional Banner (Y: 798..888, Height: 90) ──
curr_y = 798
banner_path = 'assets/dashboard-tournament-banner.png'
if os.path.exists(banner_path):
    ban = Image.open(banner_path).resize((634 - 48, 90)).convert('RGBA')
    img.paste(ban, (48, curr_y), ban)
else:
    draw.rounded_rectangle([48, curr_y, 634, curr_y + 90], radius=20, fill='#004D34')
    draw.text((634 - 230, curr_y + 22), 'سجّل فريقك في البطولات', font=get_font(18, True), fill='#FFFFFF')
    draw.text((634 - 290, curr_y + 52), 'شارك في البطولات الرسمية ونافس على الألقاب', font=get_font(12, False), fill='#A7F3D0')
    draw.ellipse([634 - 50, curr_y + 28, 634 - 16, curr_y + 62], fill='#FFFFFF')
    draw.text((634 - 38, curr_y + 32), '›', font=get_font(20, True), fill='#00875A')


# ── G. Bottom Navigation Bar (Y: 914..H, Height: 110) ──
draw.rectangle([0, H - 98, W, H], fill='#FFFFFF', outline='#E2E8F0', width=2)

# 5 Tabs:
# Tab 1: الرئيسية (Rightmost) - Active Green Capsule
draw.rounded_rectangle([W - 138, H - 85, W - 18, H - 24], radius=18, fill='#00875A')
draw.text((W - 88, H - 78), '🏠', font=get_font(20, False), fill='#FFFFFF')
draw.text((W - 100, H - 48), 'الرئيسية', font=get_font(14, True), fill='#FFFFFF')

# Tab 2: الفريق
draw.text((W - 228, H - 78), '👥', font=get_font(22, False), fill='#94A3B8')
draw.text((W - 235, H - 48), 'الفريق', font=get_font(14, True), fill='#94A3B8')

# Tab 3: المباريات
draw.text((W - 350, H - 78), '⚽', font=get_font(22, False), fill='#94A3B8')
draw.text((W - 362, H - 48), 'المباريات', font=get_font(14, True), fill='#94A3B8')

# Tab 4: البطولات
draw.text((W - 475, H - 78), '🏆', font=get_font(22, False), fill='#94A3B8')
draw.text((W - 488, H - 48), 'البطولات', font=get_font(14, True), fill='#94A3B8')

# Tab 5: حسابي (Leftmost)
draw.text((45, H - 78), '👤', font=get_font(22, False), fill='#94A3B8')
draw.text((40, H - 48), 'حسابي', font=get_font(14, True), fill='#94A3B8')


# ── Save Preview & Side-by-Side Comparison ──
out_dir = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be'
preview_path = os.path.join(out_dir, 'screen09_manager_dashboard_approved_preview.png')
img.save(preview_path)
print('Approved Preview saved:', preview_path)

ref_path = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be\.user_uploaded\media_1794076392210_bd4a403e.jpg'
ref = Image.open(ref_path)

combo_w = ref.width + img.width + 40
combo = Image.new('RGB', (combo_w, H + 60), '#0B192C')
draw_c = ImageDraw.Draw(combo)
font_title = ImageFont.truetype(font_bold, 20)

draw_c.text((ref.width // 2 - 100, 16), 'Reference A (Approved Design)', fill='#22C55E', font=font_title)
combo.paste(ref, (15, 50))

draw_c.text((ref.width + 30 + img.width // 2 - 100, 16), 'Implemented Manager Dashboard', fill='#FFFFFF', font=font_title)
combo.paste(img, (ref.width + 25, 50))

combo_path = os.path.join(out_dir, 'screen09_manager_dashboard_approved_comparison.png')
combo.save(combo_path)
print('Comparison saved:', combo_path)
