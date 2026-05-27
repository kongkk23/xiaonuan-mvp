#!/usr/bin/env python3
"""Update all project files: rename to HBU.小暖学姐"""

import os, glob

base = r'C:\Users\30217\.openclaw\workspace\xiaonuan-mvp'
files = [
    os.path.join(base, 'static', 'index.html'),
    os.path.join(base, 'static', 'app.js'),
    os.path.join(base, 'static', 'style.css'),
    os.path.join(base, 'worker.js'),
    os.path.join(base, 'README.md'),
    os.path.join(base, 'DEPLOY.md'),
]

# Also do miniapp
miniapp_files = glob.glob(r'C:\Users\30217\.openclaw\workspace\xiaonuan-miniapp\**\*.*', recursive=True)
files.extend(miniapp_files)

replacements = [
    ('小暖同学', 'HBU.小暖学姐'),
    ('\U0001f98b 小暖', '\U0001f338 小暖学姐'),
    ('小暖会在这里等你回来', '学姐会在这里等你回来'),
    ('我想继续和小暖聊聊', '我想继续和学姐聊聊'),
    ('小暖正在输入', '学姐正在输入'),
    ('继续和小暖聊', '继续和学姐聊'),
    # Fix any double replacement
    ('HBU.小暖学姐学姐', 'HBU.小暖学姐'),
]

for fpath in files:
    if not os.path.exists(fpath):
        continue
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()

        modified = False
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new)
                modified = True

        if modified:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Updated: {os.path.basename(fpath)}')
    except Exception as e:
        print(f'Skip {fpath}: {e}')

print('\nDone!')
