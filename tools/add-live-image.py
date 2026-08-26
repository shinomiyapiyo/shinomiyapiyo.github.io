#!/usr/bin/env python3
"""ライブ画像を取得して images/ に配置する。

使い方:
    python3 tools/add-live-image.py <取得元> <名前> [--width 1000] [--quality 80]

<取得元> は次のいずれか:
    - X の画像URL          https://pbs.twimg.com/media/XXXXXXXX?format=jpg&name=large
    - X のメディアIDのみ    HNu_zLCagAAboUZ
    - ローカルのファイルパス  ~/Downloads/IMG_1743.JPG

<名前> は拡張子なしで指定する。CLAUDE.md の命名規則に従うこと:
    live-YYYYMMDD-<会場や催事>-<flyer|timetable など>

例:
    python3 tools/add-live-image.py HNu_zLCagAAboUZ live-20260809-badknee-sendai
    python3 tools/add-live-image.py ~/Downloads/IMG_1743.JPG live-20260802-ishinomaki-kawabiraki
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'images')

# X のメディアIDは英数字・ハイフン・アンダースコアのみ（拡張子やスラッシュを含まない）
MEDIA_ID_RE = re.compile(r'^[A-Za-z0-9_-]{10,40}$')


def resolve_source(src):
    """取得元を (種別, 実際に使う値) に正規化する。"""
    if src.startswith(('http://', 'https://')):
        return 'url', src
    expanded = os.path.expanduser(src)
    if os.path.exists(expanded):
        return 'file', expanded
    if MEDIA_ID_RE.match(src):
        return 'url', f'https://pbs.twimg.com/media/{src}?format=jpg&name=large'
    sys.exit(f'エラー: 取得元が見つかりません（URL・メディアID・ファイルパスのいずれかを指定）: {src}')


def download(url, dest):
    """curl で取得する。プロキシ設定を引き継ぐため curl を使う。"""
    result = subprocess.run(
        ['curl', '-fsSL', '--max-time', '60', '-o', dest, url],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        sys.exit(
            f'エラー: 画像を取得できませんでした: {url}\n'
            f'  {result.stderr.strip()}\n'
            '  pbs.twimg.com がネットワーク許可リストに入っているか確認してください。'
        )


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument('source', help='X の画像URL / メディアID / ローカルファイルパス')
    parser.add_argument('name', help='拡張子なしの出力名（例: live-20260809-badknee-sendai）')
    parser.add_argument('--width', type=int, default=1000, help='横幅px（正方形ジャケット等は800推奨）')
    parser.add_argument('--quality', type=int, default=80, help='JPEG品質')
    args = parser.parse_args()

    name = re.sub(r'\.(jpe?g|png|webp)$', '', args.name, flags=re.IGNORECASE)
    dest = os.path.join(IMAGES_DIR, f'{name}.jpeg')

    kind, value = resolve_source(args.source)

    with tempfile.TemporaryDirectory() as tmp:
        if kind == 'url':
            src_path = os.path.join(tmp, 'download')
            download(value, src_path)
        else:
            src_path = value

        before = os.path.getsize(src_path)
        im = Image.open(src_path).convert('RGB')
        w, h = im.size
        if w > args.width:
            im = im.resize((args.width, round(args.width * h / w)), Image.LANCZOS)
        im.save(dest, 'JPEG', quality=args.quality, optimize=True)

    after = os.path.getsize(dest)
    print(f'{w}x{h} -> {im.size[0]}x{im.size[1]}')
    print(f'{before // 1024}KB -> {after // 1024}KB')
    print(f'保存先: images/{name}.jpeg')

    if kind == 'file' and os.path.dirname(os.path.abspath(value)) == IMAGES_DIR:
        print(f'\n※ 元ファイルが images/ にあります。不要なら削除してください:')
        print(f'   git rm {os.path.relpath(value)}')


if __name__ == '__main__':
    main()
