import os
import shutil
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

W, H = 682, 1024
font_bold_path = r'C:\Windows\Fonts\arialbd.ttf'
font_reg_path = r'C:\Windows\Fonts\arial.ttf'
font_tahoma_bold = r'C:\Windows\Fonts\tahomabd.ttf'

def get_font(size, bold=False):
    path = font_bold_path if bold else font_reg_path
    return ImageFont.truetype(path, size)

def ar(text):
    return get_display(arabic_reshaper.reshape(text))

# ── Clean Sky-Stadium Background ──
img = Image.new('RGB', (W, H), '#BAE6FD')
draw = ImageDraw.Draw(img)

# Vertical gradient: sky blue -> light green
for y in range(H):
    r = int(186 + (240 - 186) * (y / H))
    g = int(230 + (253 - 230) * (y / H))
    b = int(253 + (240 - 253) * (y / H))
    if y > 850: # stadium grass green at bottom
        r = int(100 + (160 - 100) * ((y - 850) / 174))
        g = int(190 + (220 - 190) * ((y - 850) / 174))
        b = int(100 + (120 - 100) * ((y - 850) / 174))
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Stadium side palm-tree / atmosphere accents on left and right margins
ref_path = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be\.user_uploaded\media_1794081683683_4405f354.jpg'
if os.path.exists(ref_path):
    ref_full = Image.open(ref_path).resize((W, H))
    # Left edge slice
    left_edge = ref_full.crop((0, 0, 32, H))
    img.paste(left_edge, (0, 0))
    # Right edge slice
    right_edge = ref_full.crop((W - 32, 0, W, H))
    img.paste(right_edge, (W - 32, 0))

# Phone status bar
draw.text((65, 20), '9:41', font=get_font(15, True), fill='#062F36')
draw.text((W - 125, 20), '📶 🔋', font=get_font(14, False), fill='#062F36')

# ── 1. Header Bar (y: 36..98) ──
draw.rounded_rectangle([30, 36, W - 30, 98], radius=24, fill='#FFFFFF')

# Left: Notification bell with badge 3
bell_path = 'assets/ref-bell-btn.png'
if os.path.exists(bell_path):
    bell = Image.open(bell_path).resize((48, 48)).convert('RGBA')
    img.paste(bell, (44, 43), bell)

# Center: AJI NQSSRO Logo
logo_path = 'assets/role-header-logo.png'
if os.path.exists(logo_path):
    logo = Image.open(logo_path).resize((40, 34)).convert('RGBA')
    img.paste(logo, (W // 2 - 20, 42), logo)
draw.text((W // 2 - 48, 76), 'AJI NQSSRO', font=get_font(12, True), fill='#064E3B')

# Right: Coach greeting + avatar
coach_path = 'assets/dashboard-coach-avatar.png'
if os.path.exists(coach_path):
    coach = Image.open(coach_path).resize((48, 48)).convert('RGBA')
    mask = Image.new('L', (48, 48), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, 48, 48], fill=255)
    img.paste(coach, (W - 98, 43), mask)
    draw.ellipse([W - 98, 43, W - 50, 91], outline='#22C55E', width=2)

draw.text((W - 175, 47), ar('مرحبا بك'), font=get_font(13, False), fill='#64748B')
draw.text((W - 205, 67), ar('مسيّر الفريق'), font=get_font(16, True), fill='#062F36')


# ── 2. Page Title & Back Button (y: 112..175) ──
# Left: Circular back button
back_btn_path = 'assets/ref-back-btn.png'
if os.path.exists(back_btn_path):
    back_btn = Image.open(back_btn_path).resize((50, 50)).convert('RGBA')
    img.paste(back_btn, (44, 114), back_btn)

# Right: Green user circle + Screen title + Subtitle
draw.ellipse([W - 98, 116, W - 62, 152], fill='#00875A')
draw.ellipse([W - 85, 122, W - 75, 132], fill='#FFFFFF')
draw.chord([W - 90, 135, W - 70, 151], 180, 360, fill='#FFFFFF')

draw.text((W - 245, 110), ar('ملف اللاعب'), font=get_font(33, True), fill='#062F36')
draw.text((W - 250, 150), ar('تفاصيل اللاعب داخل الفريق'), font=get_font(16, False), fill='#475569')


# ── 3. Player Hero Card (y: 180..425) ──
card_left, card_right = 30, W - 30
card_top, card_bot = 180, 425
draw.rounded_rectangle([card_left, card_top, card_right, card_bot], radius=24, fill='#FFFFFF', outline='#DCFCE7', width=2)

# Right: Player Portrait
portrait_path = 'assets/ref-player-ahmed.png'
if os.path.exists(portrait_path):
    port = Image.open(portrait_path).resize((144, 152)).convert('RGBA')
    mask = Image.new('L', (144, 152), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, 144, 152], radius=22, fill=255)
    img.paste(port, (card_right - 158, card_top + 10), mask)
    draw.rounded_rectangle([card_right - 158, card_top + 10, card_right - 14, card_top + 162], radius=22, outline='#22C55E', width=3)

# Left Top: Team Shield
shield_path = 'assets/ref-team-shield.png'
if os.path.exists(shield_path):
    shield = Image.open(shield_path).resize((58, 58)).convert('RGBA')
    img.paste(shield, (card_left + 16, card_top + 12), shield)

# Player Name: أحمد العكري
draw.text((card_right - 365, card_top + 14), ar('أحمد العكري'), font=get_font(34, True), fill='#062F36')

# Status Pill: لاعب في الفريق
draw.rounded_rectangle([card_right - 365, card_top + 60, card_right - 180, card_top + 92], radius=16, fill='#DCFCE7')
draw.text((card_right - 310, card_top + 64), ar('لاعب في الفريق'), font=get_font(15, True), fill='#00875A')
draw.ellipse([card_right - 208, card_top + 67, card_right - 190, card_top + 85], fill='#00875A')
draw.text((card_right - 203, card_top + 68), '✓', font=get_font(11, True), fill='#FFFFFF')

# Bottom Sub-Card (Position & Jersey Number)
sub_top, sub_bot = card_top + 158, card_bot - 14
sub_left, sub_right = card_left + 14, card_right - 14
draw.rounded_rectangle([sub_left, sub_top, sub_right, sub_bot], radius=16, fill='#F8FAFC', outline='#E2E8F0', width=1)

# Vertical divider
draw.line([(sub_left + sub_right) // 2, sub_top + 8, (sub_left + sub_right) // 2, sub_bot - 8], fill='#E2E8F0', width=1)

# Right Half (RTL): Tactics Icon + Position Label + "وسط" Pill
draw.rounded_rectangle([sub_right - 65, sub_top + 12, sub_right - 18, sub_top + 48], radius=6, outline='#00875A', width=2)
draw.ellipse([sub_right - 45, sub_top + 26, sub_right - 38, sub_top + 34], outline='#00875A', width=2)
draw.line([sub_right - 41.5, sub_top + 12, sub_right - 41.5, sub_top + 48], fill='#00875A', width=1)

draw.text((sub_right - 140, sub_top + 12), ar('المركز'), font=get_font(15, True), fill='#062F36')
draw.rounded_rectangle([sub_right - 150, sub_top + 36, sub_right - 80, sub_top + 58], radius=8, fill='#DCFCE7')
draw.text((sub_right - 132, sub_top + 38), ar('وسط'), font=get_font(14, True), fill='#00875A')

# Left Half (RTL): Jersey Graphic + Jersey Number
left_half_center = (sub_left + (sub_left + sub_right) // 2) // 2
jersey_path = 'assets/ref-jersey-green-9.png'
if os.path.exists(jersey_path):
    jersey = Image.open(jersey_path).resize((48, 46)).convert('RGBA')
    img.paste(jersey, (left_half_center + 42, sub_top + 12), jersey)
draw.text((left_half_center - 88, sub_top + 12), ar('رقم القميص'), font=get_font(15, True), fill='#062F36')
draw.text((left_half_center - 55, sub_top + 32), '9', font=get_font(28, True), fill='#062F36')


# ── 4. Player Statistics Section (y: 440..595) ──
sec_top = 440
banner_h = 44
draw.rounded_rectangle([card_left, sec_top, card_right, sec_top + banner_h + 16], radius=20, fill='#00875A')
draw.text((card_right - 305, sec_top + 10), ar('إحصائيات اللاعب مع الفريق'), font=get_font(24, True), fill='#FFFFFF')

# Sparkle Chart icon in banner
draw.rectangle([card_right - 42, sec_top + 22, card_right - 37, sec_top + 34], fill='#FFFFFF')
draw.rectangle([card_right - 34, sec_top + 16, card_right - 29, sec_top + 34], fill='#FFFFFF')
draw.rectangle([card_right - 26, sec_top + 10, card_right - 21, sec_top + 34], fill='#FFFFFF')
draw.ellipse([card_right - 22, sec_top + 8, card_right - 18, sec_top + 12], fill='#FFFFFF')

# Body Card
stat_body_top = sec_top + banner_h
stat_body_bot = sec_top + 155
draw.rounded_rectangle([card_left, stat_body_top, card_right, stat_body_bot], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.rectangle([card_left + 2, stat_body_top, card_right - 2, stat_body_top + 10], fill='#FFFFFF')

col_w = (card_right - card_left) // 4

# Col 1 (RTL first, far right): Matches
c1_center = card_right - col_w // 2
pitch_icon_path = 'assets/ref-pitch-icon.png'
if os.path.exists(pitch_icon_path):
    picon = Image.open(pitch_icon_path).resize((40, 30)).convert('RGBA')
    img.paste(picon, (c1_center - 20, stat_body_top + 12), picon)
draw.text((c1_center - 36, stat_body_top + 46), ar('المباريات'), font=get_font(17, True), fill='#062F36')
draw.text((c1_center - 20, stat_body_top + 70), '18', font=get_font(30, True), fill='#062F36')

# Divider 1
draw.line([card_right - col_w, stat_body_top + 16, card_right - col_w, stat_body_bot - 16], fill='#E2E8F0', width=1)

# Col 2: Goals
c2_center = card_right - col_w - col_w // 2
ball_icon_path = 'assets/ref-ball-icon.png'
if os.path.exists(ball_icon_path):
    bicon = Image.open(ball_icon_path).resize((34, 34)).convert('RGBA')
    img.paste(bicon, (c2_center - 17, stat_body_top + 10), bicon)
draw.text((c2_center - 30, stat_body_top + 46), ar('الأهداف'), font=get_font(17, True), fill='#062F36')
draw.text((c2_center - 10, stat_body_top + 70), '8', font=get_font(30, True), fill='#062F36')

# Divider 2
draw.line([card_right - 2 * col_w, stat_body_top + 16, card_right - 2 * col_w, stat_body_bot - 16], fill='#E2E8F0', width=1)

# Col 3: Assists
c3_center = card_right - 2 * col_w - col_w // 2
boot_path = 'assets/ref-boot-icon.png'
if os.path.exists(boot_path):
    boot = Image.open(boot_path).resize((38, 28)).convert('RGBA')
    img.paste(boot, (c3_center - 19, stat_body_top + 14), boot)
draw.text((c3_center - 70, stat_body_top + 46), ar('التمريرات الحاسمة'), font=get_font(16, True), fill='#062F36')
draw.text((c3_center - 10, stat_body_top + 70), '5', font=get_font(30, True), fill='#062F36')

# Divider 3
draw.line([card_right - 3 * col_w, stat_body_top + 16, card_right - 3 * col_w, stat_body_bot - 16], fill='#E2E8F0', width=1)

# Col 4 (far left): Cards
c4_center = card_left + col_w // 2
card_path = 'assets/ref-yellow-card-icon.png'
if os.path.exists(card_path):
    ycard = Image.open(card_path).resize((26, 30)).convert('RGBA')
    img.paste(ycard, (c4_center - 13, stat_body_top + 12), ycard)
draw.text((c4_center - 34, stat_body_top + 46), ar('البطاقات'), font=get_font(17, True), fill='#062F36')
draw.text((c4_center - 10, stat_body_top + 70), '2', font=get_font(30, True), fill='#062F36')


# ── 5. Basic Information Section (y: 610..770) ──
info_top = 610
draw.rounded_rectangle([card_left, info_top, card_right, info_top + banner_h + 16], radius=20, fill='#00875A')
draw.text((card_right - 245, info_top + 10), ar('المعلومات الأساسية'), font=get_font(24, True), fill='#FFFFFF')

# Info circle icon in banner
draw.ellipse([card_right - 44, info_top + 12, card_right - 20, info_top + 36], outline='#FFFFFF', width=2)
draw.text((card_right - 35, info_top + 14), 'i', font=get_font(16, True), fill='#FFFFFF')

info_body_top = info_top + banner_h
info_body_bot = info_top + 155
draw.rounded_rectangle([card_left, info_body_top, card_right, info_body_bot], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.rectangle([card_left + 2, info_body_top, card_right - 2, info_body_top + 10], fill='#FFFFFF')

mid_x = (card_left + card_right) // 2
# Dividers
draw.line([mid_x, info_body_top + 12, mid_x, info_body_bot - 12], fill='#E2E8F0', width=1)
draw.line([card_left + 16, info_body_top + 55, card_right - 16, info_body_top + 55], fill='#E2E8F0', width=1)

# Row 1 Right: رقم اللاعب
draw.ellipse([card_right - 44, info_body_top + 18, card_right - 24, info_body_top + 38], outline='#00875A', width=2)
draw.ellipse([card_right - 37, info_body_top + 21, card_right - 31, info_body_top + 27], fill='#00875A')
draw.text((card_right - 145, info_body_top + 18), ar('رقم اللاعب'), font=get_font(18, True), fill='#062F36')
draw.text((mid_x + 24, info_body_top + 18), '#1254', font=get_font(22, True), fill='#062F36')

# Row 1 Left: تاريخ الانضمام
draw.rounded_rectangle([mid_x - 44, info_body_top + 18, mid_x - 24, info_body_top + 38], radius=4, outline='#00875A', width=2)
draw.line([mid_x - 44, info_body_top + 24, mid_x - 24, info_body_top + 24], fill='#00875A', width=1)
draw.text((mid_x - 165, info_body_top + 18), ar('تاريخ الانضمام'), font=get_font(18, True), fill='#062F36')
draw.text((card_left + 20, info_body_top + 18), ar('10 يناير 2025'), font=get_font(18, True), fill='#062F36')

# Row 2 Right: الجنسية
draw.line([card_right - 40, info_body_top + 70, card_right - 40, info_body_top + 92], fill='#00875A', width=2)
draw.polygon([(card_right - 40, info_body_top + 70), (card_right - 24, info_body_top + 77), (card_right - 40, info_body_top + 84)], fill='#00875A')
draw.text((card_right - 120, info_body_top + 70), ar('الجنسية'), font=get_font(18, True), fill='#062F36')

flag_path = 'assets/ref-morocco-flag.png'
if os.path.exists(flag_path):
    mflag = Image.open(flag_path).resize((34, 24)).convert('RGBA')
    img.paste(mflag, (mid_x + 90, info_body_top + 68), mflag)
draw.text((mid_x + 24, info_body_top + 70), ar('المغرب'), font=get_font(19, True), fill='#062F36')

# Row 2 Left: العمر
draw.ellipse([mid_x - 44, info_body_top + 70, mid_x - 24, info_body_top + 90], outline='#00875A', width=2)
draw.ellipse([mid_x - 37, info_body_top + 73, mid_x - 31, info_body_top + 79], fill='#00875A')
draw.text((mid_x - 100, info_body_top + 70), ar('العمر'), font=get_font(18, True), fill='#062F36')
draw.text((card_left + 20, info_body_top + 70), ar('26 سنة'), font=get_font(19, True), fill='#062F36')


# ── 6. Player Management Actions (y: 780..925) ──
act_top = 780
draw.rounded_rectangle([card_left, act_top, card_right, act_top + banner_h + 16], radius=20, fill='#00875A')
draw.text((card_right - 290, act_top + 10), ar('إجراءات إدارة اللاعب'), font=get_font(24, True), fill='#FFFFFF')

# Gear icon in banner
draw.ellipse([card_right - 44, act_top + 12, card_right - 20, act_top + 36], outline='#FFFFFF', width=3)
draw.ellipse([card_right - 35, act_top + 21, card_right - 29, act_top + 27], fill='#FFFFFF')

act_body_top = act_top + banner_h
act_body_bot = act_top + 145
draw.rounded_rectangle([card_left, act_body_top, card_right, act_body_bot], radius=20, fill='#FFFFFF', outline='#E2E8F0', width=2)
draw.rectangle([card_left + 2, act_body_top, card_right - 2, act_body_top + 10], fill='#FFFFFF')

# Paste the 3 buttons
btn_green_path = 'assets/ref-action-btn-green.png'
btn_blue_path = 'assets/ref-action-btn-blue.png'
btn_red_path = 'assets/ref-action-btn-red.png'

btn_w = (card_right - card_left - 32) // 3
btn_h = 80

if os.path.exists(btn_green_path):
    b1 = Image.open(btn_green_path).resize((btn_w, btn_h)).convert('RGBA')
    img.paste(b1, (card_right - 10 - btn_w, act_body_top + 12), b1)

if os.path.exists(btn_blue_path):
    b2 = Image.open(btn_blue_path).resize((btn_w, btn_h)).convert('RGBA')
    img.paste(b2, (card_left + 16 + btn_w, act_body_top + 12), b2)

if os.path.exists(btn_red_path):
    b3 = Image.open(btn_red_path).resize((btn_w, btn_h)).convert('RGBA')
    img.paste(b3, (card_left + 10, act_body_top + 12), b3)


# ── 7. Bottom Navigation Bar (y: 938..1024) ──
nav_path = 'assets/ref-bottom-nav-bar.png'
if os.path.exists(nav_path):
    nav = Image.open(nav_path).resize((W - 40, 84)).convert('RGBA')
    img.paste(nav, (20, 936), nav)

# Save Preview
preview_path = 'scratch/screen12_player_profile_preview.png'
img.save(preview_path)
print(f'Successfully generated {preview_path} ({W}x{H})')

# ── 8. Side-by-Side Comparison with Approved Reference ──
if os.path.exists(ref_path):
    ref_img = Image.open(ref_path).resize((W, H))

    comp_w = W * 2 + 60
    comp_h = H + 80
    comp = Image.new('RGB', (comp_w, comp_h), '#0F172A')
    comp_draw = ImageDraw.Draw(comp)

    # Title header
    comp_draw.text((comp_w // 2 - 280, 20), 'Screen 12: Player Profile - Strict Visual Verification', font=get_font(24, True), fill='#FFFFFF')

    # Column labels
    comp_draw.text((W // 2 - 80, 52), 'APPROVED REFERENCE', font=get_font(18, True), fill='#38BDF8')
    comp_draw.text((W + 60 + W // 2 - 95, 52), 'IMPLEMENTED SCREEN 12', font=get_font(18, True), fill='#4ADE80')

    # Paste images
    comp.paste(ref_img, (20, 75))
    comp.paste(img, (W + 40, 75))

    comp_path = 'scratch/screen12_player_profile_comparison.png'
    comp.save(comp_path)
    print(f'Successfully generated {comp_path} ({comp_w}x{comp_h})')

    # Copy to artifacts directory
    art_dir = r'C:\Users\moada\.gemini\antigravity\brain\358ab2c1-c9e6-4d85-aeb7-eb5b582531be'
    shutil.copy(preview_path, os.path.join(art_dir, 'screen12_player_profile_preview.png'))
    shutil.copy(comp_path, os.path.join(art_dir, 'screen12_player_profile_comparison.png'))
    print('Copied artifacts to brain directory successfully!')
