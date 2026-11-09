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


# ── B. Screen Title Block (Y: 120..180) ──
curr_y = 120
# Far Left: Circular Back Button
draw.ellipse([48, curr_y + 8, 92, curr_y + 52], fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((64, curr_y + 18), '‹', font=get_font(22, True), fill='#0B192C')

# Center / Right: Title & Subtitle
draw.text((W // 2 - 45, curr_y + 10), '👥 إدارة الفريق', font=get_font(22, True), fill='#0B192C')
draw.text((W // 2 - 80, curr_y + 44), 'إدارة لاعبي فريقك وبياناتهم', font=get_font(13, False), fill='#64748B')


# ── C. Team Identity Card (Y: 195..305, Height: 110) ──
curr_y = 195
draw.rounded_rectangle([48, curr_y, 634, curr_y + 110], radius=22, fill='#FFFFFF', outline='#E2E8F0', width=2)

# Left Section: Team Logo + Texts
team_logo_path = 'assets/preset-team-logo-1.png'
if os.path.exists(team_logo_path):
    tlogo = Image.open(team_logo_path).resize((66, 66)).convert('RGBA')
    img.paste(tlogo, (64, curr_y + 22), tlogo)

draw.text((144, curr_y + 24), 'نجوم زاكورة', font=get_font(22, True), fill='#0B192C')
draw.text((146, curr_y + 58), 'فريق كرة قدم', font=get_font(13, False), fill='#64748B')

# Vertical Divider
draw.line([490, curr_y + 18, 490, curr_y + 92], fill='#F1F5F9', width=2)

# Right Section: Player Count
draw.text((545, curr_y + 16), '👥', font=get_font(22, False), fill='#00875A')
draw.text((525, curr_y + 48), 'عدد اللاعبين', font=get_font(12, True), fill='#64748B')
draw.text((542, curr_y + 68), '24', font=get_font(22, True), fill='#0B192C')


# ── D. Player Management Tabs (3 Tabs, Y: 322..376, Height: 54) ──
curr_y = 322
tab_w = (634 - 48 - 16) // 3

# Tab 3: دعوات الانضمام (Left: 48 .. 48 + tab_w)
draw.rounded_rectangle([48, curr_y, 48 + tab_w, curr_y + 52], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.ellipse([58, curr_y + 14, 80, curr_y + 36], fill='#EF4444')
draw.text((66, curr_y + 18), '2', font=get_font(11, True), fill='#FFFFFF')
draw.text((88, curr_y + 17), '✉️ دعوات الانضمام', font=get_font(12, True), fill='#0B192C')

# Tab 2: طلبات معلقة (Center: 48 + tab_w + 8)
t2_x = 48 + tab_w + 8
draw.rounded_rectangle([t2_x, curr_y, t2_x + tab_w, curr_y + 52], radius=16, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.ellipse([t2_x + 10, curr_y + 14, t2_x + 32, curr_y + 36], fill='#F59E0B')
draw.text((t2_x + 18, curr_y + 18), '1', font=get_font(11, True), fill='#FFFFFF')
draw.text((t2_x + 40, curr_y + 17), '⏱️ طلبات معلقة', font=get_font(12, True), fill='#0B192C')

# Tab 1: قائمة اللاعبين (Right: Active Green)
t1_x = 48 + 2 * tab_w + 16
draw.rounded_rectangle([t1_x, curr_y, 634, curr_y + 52], radius=16, fill='#00875A')
draw.text((t1_x + 22, curr_y + 16), '👥 قائمة اللاعبين', font=get_font(13, True), fill='#FFFFFF')


# ── E. Search and Filter Bar (Y: 390..442, Height: 52) ──
curr_y = 390
# Filter Button (Left)
draw.rounded_rectangle([48, curr_y, 98, curr_y + 50], radius=15, fill='#FFFFFF', outline='#86EFAC', width=2)
draw.text((63, curr_y + 12), '🌪️', font=get_font(18, False), fill='#00875A')

# Search Input (Right)
draw.rounded_rectangle([108, curr_y, 634, curr_y + 50], radius=15, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((634 - 235, curr_y + 16), 'البحث عن لاعب (الاسم أو الرقم)...', font=get_font(12, False), fill='#94A3B8')
draw.text((634 - 36, curr_y + 14), '🔍', font=get_font(15, False), fill='#64748B')


# ── F. Player List Cards (5 Rows, Y: 456..806) ──
players = [
    {
        'name': 'محمد أمين الإدريسي',
        'number': 9,
        'pos': 'مهاجم',
        'pos_icon': '⚽',
        'pos_bg': '#DCFCE7',
        'pos_text': '#166534',
        'gk': False,
        'av': 'assets/ref-player-avatar-1.png'
    },
    {
        'name': 'سفيان الوردي',
        'number': 10,
        'pos': 'وسط',
        'pos_icon': '🥅',
        'pos_bg': '#DCFCE7',
        'pos_text': '#166534',
        'gk': False,
        'av': 'assets/ref-player-avatar-2.png'
    },
    {
        'name': 'ياسين بنعلي',
        'number': 4,
        'pos': 'مدافع',
        'pos_icon': '🛡️',
        'pos_bg': '#E0F2FE',
        'pos_text': '#0369A1',
        'gk': False,
        'av': 'assets/ref-player-avatar-3.png'
    },
    {
        'name': 'أيوب القاسمي',
        'number': 1,
        'pos': 'حارس مرمى',
        'pos_icon': '🧤',
        'pos_bg': '#FEF3C7',
        'pos_text': '#92400E',
        'gk': True,
        'av': 'assets/ref-player-avatar-4.png'
    },
    {
        'name': 'عمر الزهراوي',
        'number': 8,
        'pos': 'وسط',
        'pos_icon': '🥅',
        'pos_bg': '#DCFCE7',
        'pos_text': '#166534',
        'gk': False,
        'av': 'assets/ref-player-avatar-5.png'
    },
]

curr_y = 456
row_h = 66
row_gap = 10

for p in players:
    # Card Background
    draw.rounded_rectangle([48, curr_y, 634, curr_y + row_h], radius=18, fill='#FFFFFF', outline='#E2E8F0', width=2)

    # 1. Left: Three dots ⋮ & Status Badge "نشط"
    draw.text((62, curr_y + 22), '⋮', font=get_font(20, True), fill='#64748B')

    # Status Pill: نشط
    draw.rounded_rectangle([86, curr_y + 18, 146, curr_y + 46], radius=14, fill='#00875A')
    draw.ellipse([126, curr_y + 23, 140, curr_y + 37], fill='#FFFFFF')
    draw.text((129, curr_y + 24), '✓', font=get_font(9, True), fill='#00875A')
    draw.text((95, curr_y + 24), 'نشط', font=get_font(12, True), fill='#FFFFFF')

    # 2. Center: Position Pill
    pill_w = 88 if len(p['pos']) > 6 else 72
    px = 165
    draw.rounded_rectangle([px, curr_y + 18, px + pill_w, curr_y + 46], radius=14, fill=p['pos_bg'])
    draw.text((px + pill_w - 22, curr_y + 24), p['pos_icon'], font=get_font(11, False), fill=p['pos_text'])
    draw.text((px + 8, curr_y + 24), p['pos'], font=get_font(12, True), fill=p['pos_text'])

    # 3. Right: Player Name, Jersey Badge, Avatar, Navigation Arrow
    # Name
    draw.text((634 - 235, curr_y + 22), p['name'], font=get_font(14, True), fill='#0B192C')

    # Jersey badge
    j_color = '#EAB308' if p['gk'] else '#00875A'
    j_text_color = '#0B192C' if p['gk'] else '#FFFFFF'
    jx = 634 - 110
    draw.rounded_rectangle([jx, curr_y + 14, jx + 36, curr_y + 52], radius=8, fill=j_color)
    draw.text((jx + 11 if p['number'] < 10 else jx + 6, curr_y + 22), str(p['number']), font=get_font(15, True), fill=j_text_color)

    # Avatar
    if os.path.exists(p['av']):
        av_img = Image.open(p['av']).resize((44, 44)).convert('RGBA')
        mask = Image.new('L', (44, 44), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, 44, 44], fill=255)
        img.paste(av_img, (634 - 64, curr_y + 11), mask)
        draw.ellipse([634 - 64, curr_y + 11, 634 - 20, curr_y + 55], outline='#00875A', width=2)

    # Chevron ›
    draw.text((634 - 12, curr_y + 22), '›', font=get_font(20, True), fill='#94A3B8')

    curr_y += row_h + row_gap


# ── G. Add Player Big Button (Y: 832..888, Height: 56) ──
curr_y = 832
draw.rounded_rectangle([48, curr_y, 634, curr_y + 56], radius=18, fill='#00875A')
draw.text((W // 2 - 70, curr_y + 16), '+ إضافة لاعب جديد', font=get_font(17, True), fill='#FFFFFF')


# ── H. Bottom Navigation Bar (Y: 914..H, Height: 110) ──
draw.rectangle([0, H - 98, W, H], fill='#FFFFFF', outline='#E2E8F0', width=2)

# Tab 1: الرئيسية (Rightmost)
draw.text((W - 70, H - 78), '🏠', font=get_font(22, False), fill='#94A3B8')
draw.text((W - 82, H - 48), 'الرئيسية', font=get_font(13, True), fill='#94A3B8')

# Tab 2: الفريق (Active Green Capsule)
draw.rounded_rectangle([W - 245, H - 85, W - 145, H - 24], radius=18, fill='#00875A')
draw.text((W - 198, H - 78), '👥', font=get_font(20, False), fill='#FFFFFF')
draw.text((W - 208, H - 48), 'الفريق', font=get_font(14, True), fill='#FFFFFF')

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
preview_path = os.path.join(out_dir, 'screen10_team_management_preview.png')
img.save(preview_path)
print('Team Management Preview saved:', preview_path)

ref_path = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be\.user_uploaded\media_1794078120866_52af9bb2.jpg'
ref = Image.open(ref_path)

combo_w = ref.width + img.width + 40
combo = Image.new('RGB', (combo_w, H + 60), '#0B192C')
draw_c = ImageDraw.Draw(combo)
font_title = ImageFont.truetype(font_bold, 20)

draw_c.text((ref.width // 2 - 100, 16), 'Approved Reference', fill='#22C55E', font=font_title)
combo.paste(ref, (15, 50))

draw_c.text((ref.width + 30 + img.width // 2 - 100, 16), 'Implemented Team Management', fill='#FFFFFF', font=font_title)
combo.paste(img, (ref.width + 25, 50))

combo_path = os.path.join(out_dir, 'screen10_team_management_comparison.png')
combo.save(combo_path)
print('Comparison saved:', combo_path)
