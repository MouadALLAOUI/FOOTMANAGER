import os
from PIL import Image, ImageDraw, ImageFont

W, H = 682, 1024
font_path_bold = r'C:\Windows\Fonts\arialbd.ttf'
font_path_reg = r'C:\Windows\Fonts\arial.ttf'
font_path_seg = r'C:\Windows\Fonts\seguisym.ttf'

def get_font(size, bold=False):
    path = font_path_bold if bold else font_path_reg
    return ImageFont.truetype(path, size)

def get_sym_font(size):
    return ImageFont.truetype(font_path_seg, size)

img = Image.new('RGB', (W, H), '#F8FAFC')
draw = ImageDraw.Draw(img)

# Background subtle stadium pattern
bg_path = 'assets/role-selection-bg.png'
if os.path.exists(bg_path):
    bg = Image.open(bg_path).resize((W, H)).convert('RGBA')
    # Soft tint
    bg.putalpha(35)
    img.paste(bg, (0, 0), bg)

# ── 1. Top Bar Header (Y: 38..105) ──
# Left: Notification bell with unread badge 3
draw.rounded_rectangle([28, 44, 78, 94], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((43, 56), '🔔', font=get_font(18, False), fill='#0B192C')
# Red badge with 3
draw.ellipse([64, 38, 86, 60], fill='#EF4444')
draw.text((71, 41), '3', font=get_font(12, True), fill='#FFFFFF')

# Center: Brand Logo
logo_path = 'assets/role-header-logo.png'
if os.path.exists(logo_path):
    logo = Image.open(logo_path).resize((36, 36)).convert('RGBA')
    img.paste(logo, (W // 2 - 18, 42), logo)
draw.text((W // 2 - 48, 80), 'AJI NQSSRO', font=get_font(13, True), fill='#0B192C')

# Right: Greeting + Coach Profile
coach_path = 'assets/team-setup-coach-step2.png'
if os.path.exists(coach_path):
    coach = Image.open(coach_path).resize((52, 52)).convert('RGBA')
    # Circle mask
    mask = Image.new('L', (52, 52), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, 52, 52], fill=255)
    img.paste(coach, (W - 80, 44), mask)
    draw.ellipse([W - 80, 44, W - 28, 96], outline='#00875A', width=2)

draw.text((W - 170, 50), 'مرحبا بك', font=get_font(13, False), fill='#64748B')
draw.text((W - 192, 70), 'مسيّر الفريق', font=get_font(15, True), fill='#0B192C')


# ── 2. Team Status Card (Y: 122..260, Height: 138) ──
curr_y = 122
draw.rounded_rectangle([24, curr_y, W - 24, curr_y + 138], radius=24, fill='#FFFFFF', outline='#E2E8F0', width=2)

# Info icon button on left
draw.ellipse([42, curr_y + 20, 76, curr_y + 54], outline='#CBD5E1', width=2, fill='#F8FAFC')
draw.text((54, curr_y + 24), 'i', font=get_font(16, True), fill='#64748B')

# Team Logo on right
team_logo_path = 'assets/preset-team-logo-1.png'
if os.path.exists(team_logo_path):
    tlogo = Image.open(team_logo_path).resize((78, 78)).convert('RGBA')
    draw.rounded_rectangle([W - 116, curr_y + 16, W - 38, curr_y + 94], radius=18, fill='#F8FAFC', outline='#E2E8F0', width=1)
    img.paste(tlogo, (W - 116, curr_y + 16), tlogo)

# Team Name & Subtitle & Status Badge
draw.text((W - 275, curr_y + 20), 'نجوم زاكورة', font=get_font(23, True), fill='#0B192C')
draw.text((W - 225, curr_y + 55), 'فريق كرة قدم', font=get_font(14, False), fill='#64748B')

# Amber status pill: في انتظار موافقة الإدارة
draw.rounded_rectangle([W - 330, curr_y + 88, W - 128, curr_y + 122], radius=14, fill='#FEF3C7', outline='#FDE68A', width=2)
draw.text((W - 150, curr_y + 94), '🕒', font=get_font(13, False), fill='#D97706')
draw.text((W - 322, curr_y + 95), 'في انتظار موافقة الإدارة', font=get_font(13, True), fill='#B45309')


# ── 3. Pending Approval Amber Alert Card (Y: 274..394, Height: 120) ──
curr_y = 274
draw.rounded_rectangle([24, curr_y, W - 24, curr_y + 120], radius=22, fill='#FFFBEB', outline='#F59E0B', width=2)

# Golden Clipboard on right
draw.rounded_rectangle([W - 98, curr_y + 22, W - 40, curr_y + 80], radius=16, fill='#FEF3C7', outline='#FDE68A', width=1)
draw.text((W - 83, curr_y + 32), '📋', font=get_font(26, False), fill='#D97706')

# Title and description text
draw.text((W - 290, curr_y + 20), 'طلبك قيد المراجعة', font=get_font(20, True), fill='#92400E')
draw.text((56, curr_y + 54), 'تم إرسال طلب فريقك إلى الإدارة. ستتمكن من استخدام جميع الخدمات', font=get_font(13, False), fill='#78350F')
draw.text((230, curr_y + 78), 'المتاحة فور قبول وموافقة الإدارة.', font=get_font(13, False), fill='#78350F')


# ── 4. Administrator Action Buttons (Y: 408..466, Height: 58) ──
curr_y = 408
btn_w = (W - 48 - 14) // 2

# Left: التواصل مع الإدارة
draw.rounded_rectangle([24, curr_y, 24 + btn_w, curr_y + 58], radius=16, fill='#FFFFFF', outline='#00875A', width=2)
draw.text((24 + 48, curr_y + 17), '🎧', font=get_font(16, False), fill='#00875A')
draw.text((24 + 75, curr_y + 18), 'التواصل مع الإدارة', font=get_font(16, True), fill='#00875A')

# Right: إرسال تذكير للإدارة
draw.rounded_rectangle([24 + btn_w + 14, curr_y, W - 24, curr_y + 58], radius=16, fill='#00875A')
draw.text((24 + btn_w + 14 + 45, curr_y + 17), '🔔', font=get_font(16, False), fill='#FFFFFF')
draw.text((24 + btn_w + 14 + 72, curr_y + 18), 'إرسال تذكير للإدارة', font=get_font(16, True), fill='#FFFFFF')


# ── 5. Meta Info Strip (3 Tiles: Y: 480..556, Height: 76) ──
curr_y = 480
tile_w = (W - 48 - 20) // 3

# Tile 1 (Left): تاريخ الإرسال
draw.rounded_rectangle([24, curr_y, 24 + tile_w, curr_y + 76], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((24 + 40, curr_y + 12), '📅 تاريخ الإرسال', font=get_font(13, True), fill='#0B192C')
draw.text((24 + 50, curr_y + 42), '2025/01/27', font=get_font(15, True), fill='#0B192C')

# Tile 2 (Middle): مدة المراجعة
draw.rounded_rectangle([24 + tile_w + 10, curr_y, 24 + 2 * tile_w + 10, curr_y + 76], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((24 + tile_w + 10 + 40, curr_y + 12), '⏱️ مدة المراجعة', font=get_font(13, True), fill='#0B192C')
draw.text((24 + tile_w + 10 + 45, curr_y + 42), '24-48 ساعة', font=get_font(15, True), fill='#0B192C')

# Tile 3 (Right): حالة الطلب
draw.rounded_rectangle([24 + 2 * tile_w + 20, curr_y, W - 24, curr_y + 76], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((24 + 2 * tile_w + 20 + 45, curr_y + 12), '👥 حالة الطلب', font=get_font(13, True), fill='#0B192C')
draw.rounded_rectangle([24 + 2 * tile_w + 20 + 40, curr_y + 40, 24 + 2 * tile_w + 20 + tile_w - 40, curr_y + 66], radius=10, fill='#FEF3C7')
draw.text((24 + 2 * tile_w + 20 + 55, curr_y + 44), 'قيد المراجعة', font=get_font(13, True), fill='#B45309')


# ── 6. Section Header 'خدمات الفريق' (Y: 572..604, Height: 32) ──
curr_y = 572
draw.text((W - 145, curr_y), 'خدمات الفريق', font=get_font(21, True), fill='#0B192C')


# ── 7. Services Grid (6 Cards, 2 Rows of 3, Y: 614..846, Height: 232) ──
curr_y = 614
card_w = (W - 48 - 20) // 3
card_h = 108

# --- Row 1 (Y: 614..722) ---
# Card 1 (Left): إدارة اللاعبين - Locked
draw.rounded_rectangle([24, curr_y, 24 + card_w, curr_y + card_h], radius=18, fill='#F1F5F9', outline='#E2E8F0', width=2)
draw.text((24 + card_w - 30, curr_y + 8), '🔒', font=get_font(12, False), fill='#94A3B8')
draw.text((24 + card_w // 2 - 16, curr_y + 18), '👥', font=get_font(28, False), fill='#94A3B8')
draw.text((24 + 40, curr_y + 54), 'إدارة اللاعبين', font=get_font(14, True), fill='#64748B')
draw.rounded_rectangle([24 + card_w // 2 - 28, curr_y + 78, 24 + card_w // 2 + 28, curr_y + 100], radius=8, fill='#CBD5E1')
draw.text((24 + card_w // 2 - 18, curr_y + 81), 'مقفلة', font=get_font(12, True), fill='#475569')

# Card 2 (Middle): المباريات والتحديات - Locked
draw.rounded_rectangle([24 + card_w + 10, curr_y, 24 + 2 * card_w + 10, curr_y + card_h], radius=18, fill='#F1F5F9', outline='#E2E8F0', width=2)
draw.text((24 + 2 * card_w + 10 - 30, curr_y + 8), '🔒', font=get_font(12, False), fill='#94A3B8')
draw.text((24 + card_w + 10 + card_w // 2 - 16, curr_y + 18), '⚽', font=get_font(28, False), fill='#94A3B8')
draw.text((24 + card_w + 10 + 16, curr_y + 54), 'المباريات والتحديات', font=get_font(14, True), fill='#64748B')
draw.rounded_rectangle([24 + card_w + 10 + card_w // 2 - 28, curr_y + 78, 24 + card_w + 10 + card_w // 2 + 28, curr_y + 100], radius=8, fill='#CBD5E1')
draw.text((24 + card_w + 10 + card_w // 2 - 18, curr_y + 81), 'مقفلة', font=get_font(12, True), fill='#475569')

# Card 3 (Right): البطولات - Locked
draw.rounded_rectangle([24 + 2 * card_w + 20, curr_y, W - 24, curr_y + card_h], radius=18, fill='#F1F5F9', outline='#E2E8F0', width=2)
draw.text((W - 24 - 30, curr_y + 8), '🔒', font=get_font(12, False), fill='#94A3B8')
draw.text((24 + 2 * card_w + 20 + card_w // 2 - 16, curr_y + 18), '🏆', font=get_font(28, False), fill='#94A3B8')
draw.text((24 + 2 * card_w + 20 + 52, curr_y + 54), 'البطولات', font=get_font(14, True), fill='#64748B')
draw.rounded_rectangle([24 + 2 * card_w + 20 + card_w // 2 - 28, curr_y + 78, 24 + 2 * card_w + 20 + card_w // 2 + 28, curr_y + 100], radius=8, fill='#CBD5E1')
draw.text((24 + 2 * card_w + 20 + card_w // 2 - 18, curr_y + 81), 'مقفلة', font=get_font(12, True), fill='#475569')

# --- Row 2 (Y: 732..840) ---
curr_y = 732

# Card 4 (Left): الإشعارات - Active
draw.rounded_rectangle([24, curr_y, 24 + card_w, curr_y + card_h], radius=18, fill='#FFFFFF', outline='#E2E8F0', width=2)
# Red badge with 3
draw.ellipse([24 + card_w - 32, curr_y + 8, 24 + card_w - 8, curr_y + 32], fill='#EF4444')
draw.text((24 + card_w - 23, curr_y + 11), '3', font=get_font(12, True), fill='#FFFFFF')
draw.text((24 + card_w // 2 - 16, curr_y + 22), '🔔', font=get_font(28, False), fill='#00875A')
draw.text((24 + 48, curr_y + 68), 'الإشعارات', font=get_font(15, True), fill='#0B192C')

# Card 5 (Middle): حجوزات الملعب - Locked
draw.rounded_rectangle([24 + card_w + 10, curr_y, 24 + 2 * card_w + 10, curr_y + card_h], radius=18, fill='#F1F5F9', outline='#E2E8F0', width=2)
draw.text((24 + 2 * card_w + 10 - 30, curr_y + 8), '🔒', font=get_font(12, False), fill='#94A3B8')
draw.text((24 + card_w + 10 + card_w // 2 - 16, curr_y + 18), '📅', font=get_font(28, False), fill='#94A3B8')
draw.text((24 + card_w + 10 + 35, curr_y + 54), 'حجوزات الملعب', font=get_font(14, True), fill='#64748B')
draw.rounded_rectangle([24 + card_w + 10 + card_w // 2 - 28, curr_y + 78, 24 + card_w + 10 + card_w // 2 + 28, curr_y + 100], radius=8, fill='#CBD5E1')
draw.text((24 + card_w + 10 + card_w // 2 - 18, curr_y + 81), 'مقفلة', font=get_font(12, True), fill='#475569')

# Card 6 (Right): معلومات الفريق - Active Green Highlight
draw.rounded_rectangle([24 + 2 * card_w + 20, curr_y, W - 24, curr_y + card_h], radius=18, fill='#FFFFFF', outline='#00875A', width=2)
# Check badge
draw.ellipse([24 + 2 * card_w + 20 + card_w // 2 - 12, curr_y + 80, 24 + 2 * card_w + 20 + card_w // 2 + 12, curr_y + 104], fill='#00875A')
draw.text((24 + 2 * card_w + 20 + card_w // 2 - 7, curr_y + 82), '✓', font=get_font(13, True), fill='#FFFFFF')
draw.text((24 + 2 * card_w + 20 + card_w // 2 - 16, curr_y + 20), '🛡️', font=get_font(28, False), fill='#00875A')
draw.text((24 + 2 * card_w + 20 + 26, curr_y + 56), 'معلومات الفريق', font=get_font(15, True), fill='#00875A')


# ── 8. Notice Pill (Y: 856..902, Height: 46) ──
curr_y = 856
draw.rounded_rectangle([24, curr_y, W - 24, curr_y + 46], radius=23, fill='#F1F5F9')
draw.ellipse([W - 55, curr_y + 12, W - 35, curr_y + 32], outline='#64748B', width=2)
draw.text((W - 47, curr_y + 13), 'i', font=get_font(13, True), fill='#64748B')
draw.text((45, curr_y + 14), 'ستصبح الخدمات المقفلة متاحة فور موافقة الإدارة على طلب فريقك.', font=get_font(13, False), fill='#475569')


# ── 9. Bottom Navigation Bar (Y: 924..H, Height: 100) ──
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


# Save preview
out_dir = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be'
preview_path = os.path.join(out_dir, 'screen09_manager_dashboard_pending_preview.png')
img.save(preview_path)
print('Exact preview saved:', preview_path)

# Side-by-side comparison
ref_path = os.path.join(out_dir, 'scratch', 'manager_dashboard_pending_ref.png')
ref = Image.open(ref_path)

combo_w = ref.width + img.width + 40
combo = Image.new('RGB', (combo_w, H + 60), '#0B192C')
draw_c = ImageDraw.Draw(combo)
font_title = ImageFont.truetype(font_path_bold, 20)

draw_c.text((ref.width // 2 - 100, 16), '1. Approved Reference', fill='#22C55E', font=font_title)
combo.paste(ref, (15, 50))

draw_c.text((ref.width + 30 + img.width // 2 - 110, 16), '2. Implemented Screen (Adjusted)', fill='#FFFFFF', font=font_title)
combo.paste(img, (ref.width + 25, 50))

combo_path = os.path.join(out_dir, 'screen09_manager_dashboard_pending_comparison.png')
combo.save(combo_path)
print('Exact comparison saved:', combo_path)
