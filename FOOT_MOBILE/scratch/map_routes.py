import glob, os

files = glob.glob('app/**/*.tsx', recursive=True)
for f in sorted(files):
    with open(f, 'r', encoding='utf-8') as fl:
        text = fl.read()
    target = 'inline component'
    if 'export { default } from' in text:
        target = text.split('export { default } from')[1].strip().split(';')[0]
    elif 'from "@/screens/' in text or "from '@/screens/" in text:
        matches = [line.strip() for line in text.splitlines() if '@/screens/' in line]
        if matches:
            target = matches[0]
    print(f'{f:45s} -> {target}')
