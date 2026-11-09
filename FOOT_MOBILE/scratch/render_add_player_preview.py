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


# ── B. Page Title Block (Y: 120..185) ──
curr_y = 120
# Far Left: Circular Back Button
draw.ellipse([48, curr_y + 8, 92, curr_y + 52], fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.text((64, curr_y + 18), '‹', font=get_font(22, True), fill='#0B192C')

# Center / Right: Title & Subtitle
draw.text((W // 2 - 58, curr_y + 10), '👤+ إضافة لاعب جديد', font=get_font(22, True), fill='#0B192C')
draw.text((W // 2 - 45, curr_y + 44), 'أضف لاعباً إلى فريقك', font=get_font(13, False), fill='#64748B')


# ── C. Card 1: Player Name Search with Autocomplete (Y: 200..530) ──
curr_y = 200
draw.rounded_rectangle([48, curr_y, 634, curr_y + 325], radius=22, fill='#FFFFFF', outline='#E2E8F0', width=2)

# Label: اسم اللاعب *
draw.text((634 - 110, curr_y + 18), 'اسم اللاعب', font=get_font(14, True), fill='#0B192C')
draw.text((634 - 120, curr_y + 18), '*', font=get_font(14, True), fill='#EF4444')

# Search Input Box (Green Border)
in_y = curr_y + 46
draw.rounded_rectangle([66, in_y, 616, in_y + 52], radius=15, fill='#FFFFFF', outline='#00875A', width=2)

# Clear Button ⓧ (Left)
draw.ellipse([84, in_y + 16, 104, in_y + 36], fill='#F1F5F9')
draw.text((90, in_y + 18), '✕', font=get_font(11, True), fill='#94A3B8')

# Search text: أحمد
draw.text((616 - 80, in_y + 14), 'أحمد', font=get_font(17, True), fill='#0B192C')

# Search Icon 🔍 (Right)
draw.text((616 - 36, in_y + 15), '🔍', font=get_font(16, False), fill='#00875A')

# Autocomplete Suggestions List (3 Rows)
sug_y = in_y + 64
suggestions = [
    {
        'name': 'أحمد العكري',
        'sub': 'مسجل في AJI NQSSRO',
        'selected': True,
        'av': 'assets/ref-player-avatar-1.png',
    },
    {
        'name': 'أحمد القاسمي',
        'sub': 'مسجل في AJI NQSSRO',
        'selected': False,
        'av': 'assets/ref-player-avatar-2.png',
    },
    {
        'name': 'أحمد الزهراني',
        'sub': 'مسجل في AJI NQSSRO',
        'selected': False,
        'av': 'assets/ref-player-avatar-3.png',
    },
]

for s in suggestions:
    bg_fill = '#D9FBE8' if s['selected'] else '#FFFFFF'
    draw.rounded_rectangle([66, sug_y, 616, sug_y + 60], radius=15, fill=bg_fill)

    # Left: UserPlus Icon
    ic_col = '#00875A' if s['selected'] else '#94A3B8'
    draw.text((88, sug_y + 20), '👤+', font=get_font(15, True), fill=ic_col)

    # Middle: Name & Subtitle
    name_col = '#00875A' if s['selected'] else '#0B192C'
    draw.text((616 - 180, sug_y + 10), s['name'], font=get_font(15, True), fill=name_col)
    draw.text((616 - 225, sug_y + 34), s['sub'], font=get_font(11, False), fill='#64748B')

    # Right: Avatar
    if os.path.exists(s['av']):
        av = Image.open(s['av']).resize((44, 44)).convert('RGBA')
        mask = Image.new('L', (44, 44), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, 44, 44], fill=255)
        img.paste(av, (616 - 54, sug_y + 8), mask)
        draw.ellipse([616 - 54, sug_y + 8, 616 - 10, sug_y + 52], outline='#00875A', width=2)

    sug_y += 66


# ── D. Card 2: Player Photo (صورة اللاعب, Y: 546..736, Height: 190) ──
curr_y = 546
draw.rounded_rectangle([48, curr_y, 634, curr_y + 190], radius=22, fill='#FFFFFF', outline='#E2E8F0', width=2)

# Label: صورة اللاعب *
draw.text((634 - 110, curr_y + 16), 'صورة اللاعب', font=get_font(14, True), fill='#0B192C')
draw.text((634 - 120, curr_y + 16), '*', font=get_font(14, True), fill='#EF4444')

# Large Circular Avatar Frame
cx, cy = W // 2, curr_y + 105
cr = 65
draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill='#F8FAFC', outline='#00875A', width=3)

# Silhouette Placeholder (Head & Shoulders)
draw.ellipse([cx - 20, cy - 35, cx + 20, cy + 5], fill='#CBD5E1')
draw.pieslice([cx - 36, cy - 2, cx + 36, cy + 55], 180, 360, fill='#CBD5E1')

# Camera Badge Overlay at Bottom Right
cb_x = cx + cr - 28
cb_y = cy + cr - 28
draw.ellipse([cb_x, cb_y, cb_x + 36, cb_y + 36], fill='#00875A', outline='#FFFFFF', width=2)
draw.text((cb_x + 8, cb_y + 8), '📷', font=get_font(14, False), fill='#FFFFFF')


# ── E. Card 3: Position Selector (المركز, Y: 752..852) ──
curr_y = 752
# Label: المركز *
draw.text((634 - 60, curr_y), 'المركز', font=get_font(14, True), fill='#0B192C')
draw.text((634 - 70, curr_y), '*', font=get_font(14, True), fill='#EF4444')

# Selector Box (Green Border)
sel_y = curr_y + 26
draw.rounded_rectangle([48, sel_y, 634, sel_y + 54], radius=15, fill='#FFFFFF', outline='#00875A', width=2)

# Dropdown Chevron (Left)
draw.text((70, sel_y + 15), '⌵', font=get_font(18, True), fill='#00875A')

# Tactics/Pitch Icon + Text (Right)
draw.text((634 - 165, sel_y + 16), 'اختر مركز اللاعب', font=get_font(14, False), fill='#94A3B8')
draw.text((634 - 36, sel_y + 14), '🥅', font=get_font(18, False), fill='#00875A')


# ── F. Primary Action Button: إضافة اللاعب (Y: 885..943, Height: 58) ──
curr_y = 885
draw.rounded_rectangle([48, curr_y, 634, curr_y + 58], radius=18, fill='#00875A')
draw.text((W // 2 - 50, curr_y + 16), '👤+ إضافة اللاعب', font=get_font(18, True), fill='#FFFFFF')


# ── Save Preview & Side-by-Side Comparison ──
out_dir = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be'
preview_path = os.path.join(out_dir, 'screen11_add_player_preview.png')
img.save(preview_path)
print('Add Player Preview saved:', preview_path)

ref_path = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be\.user_uploaded\media_1794079249627_d7e66183.png'
ref = Image.open(ref_path)

combo_w = ref.width + img.width + 40
combo = Image.new('RGB', (combo_w, H + 60), '#0B192C')
draw_c = ImageDraw.Draw(combo)
font_title = ImageFont.truetype(font_bold, 20)

draw_c.text((ref.width // 2 - 100, 16), 'Approved Reference', fill='#22C55E', font=font_title)
combo.paste(ref, (15, 50))

draw_c.text((ref.width + 30 + img.width // 2 - 100, 16), 'Implemented Add Player Screen', fill='#FFFFFF', font=font_title)
combo.paste(img, (ref.width + 25, 50))

combo_path = os.path.join(out_dir, 'screen11_add_player_comparison.png')
combo.save(combo_path)
print('Comparison saved:', combo_path)
