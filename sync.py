"""Copies the latest game builds into the Greenlight Studios website and records what is available.

usage:  python site/sync.py      (run from anywhere, after changing a game or building the APKs)

  Pixel Smash.html        -> site/games/pixel-smash.html        (played in the browser and downloaded)
  Pixel Smash Kart.html   -> site/games/pixel-smash-kart.html
  apk/PixelSmash-v*.apk   -> site/downloads/                    (only once android/build.py has made it)
  both HTML games         -> site/downloads/GreenlightStudios-PixelGames-v<ver>.zip
  sizes, versions, dates  -> site/data/builds.js                (read by the pages)
  latest game versions    -> site/data/version.json             (games check it before going online)

The site folder is then self-contained: upload site/ to any static host."""
import os, re, glob, json, shutil, zipfile, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
GAMES_DIR = os.path.join(SITE, 'games')
DL_DIR = os.path.join(SITE, 'downloads')
DATA = os.path.join(SITE, 'data', 'builds.js')

GAMES = [
    dict(id='smash', name='Pixel Smash', html='Pixel Smash.html', slug='pixel-smash', apk='PixelSmash-v*.apk'),
    dict(id='kart', name='Pixel Smash Kart', html='Pixel Smash Kart.html', slug='pixel-smash-kart', apk='PixelSmashKart-v*.apk'),
]

README = """Greenlight Studios - Pixel Smash & Pixel Smash Kart (browser builds)

1. Unzip this folder anywhere.
2. Double-click a .html file. It opens in your web browser and plays right away.
   Works in Chrome, Edge, Firefox and Safari on Windows, Mac, Linux and ChromeOS.

Both games share one save and one online username. Use the Save data menu in
either game to copy a save code and move your progress between devices.

Fonts and online play need an internet connection; everything else runs offline.
"""


def version():
    """the version the Android build uses, so the site, the zip and the APKs agree"""
    try:
        src = open(os.path.join(ROOT, 'android', 'build.py'), encoding='utf8').read()
        m = re.search(r"VERSION_NAME\s*,\s*VERSION_CODE\s*=\s*'([^']+)'", src)
        if m:
            return m.group(1)
    except OSError:
        pass
    return '1.0'


def game_version(path):
    """the version a game reports (its VER module), set by set_version.py"""
    m = re.search(r"const CUR='([^']+)',SITE=", open(path, encoding='utf8').read())
    return m.group(1) if m else None


def stamp(path):
    return datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d')


def main():
    os.makedirs(GAMES_DIR, exist_ok=True)
    os.makedirs(DL_DIR, exist_ok=True)
    ver = version()
    out = dict(version=ver, synced=datetime.date.today().isoformat(), games={}, bundle=None)

    for g in GAMES:
        src = os.path.join(ROOT, g['html'])
        if not os.path.exists(src):
            print('missing', g['html'], '- skipped')
            continue
        dst = os.path.join(GAMES_DIR, g['slug'] + '.html')
        shutil.copy2(src, dst)
        entry = dict(name=g['name'], html=dict(file='games/%s.html' % g['slug'], saveAs=g['html'],
                                                size=os.path.getsize(dst), date=stamp(src)), apk=None)

        # the newest matching APK, if the Android build has produced one; stale copies are cleared out
        apks = sorted(glob.glob(os.path.join(ROOT, 'apk', g['apk'])), key=os.path.getmtime)
        for old in glob.glob(os.path.join(DL_DIR, g['apk'])):
            if not apks or os.path.basename(old) != os.path.basename(apks[-1]):
                os.remove(old)
        if apks:
            a = apks[-1]
            shutil.copy2(a, os.path.join(DL_DIR, os.path.basename(a)))
            entry['apk'] = dict(file='downloads/' + os.path.basename(a), size=os.path.getsize(a), date=stamp(a))
        # the app icon the Android build draws, reused on the site's download cards
        icon = os.path.join(ROOT, 'apk', '%s-icon-512.png' % g['id'])
        if os.path.exists(icon):
            shutil.copy2(icon, os.path.join(SITE, 'img', '%s-icon.png' % g['id']))
        out['games'][g['id']] = entry
        print('%-17s html %6.2f MB   apk %s' % (g['name'], entry['html']['size'] / 1048576,
                                                '%.2f MB' % (entry['apk']['size'] / 1048576) if entry['apk'] else 'not built yet'))

    # one zip with both browser builds
    for old in glob.glob(os.path.join(DL_DIR, 'GreenlightStudios-PixelGames-v*.zip')):
        os.remove(old)
    if out['games']:
        name = 'GreenlightStudios-PixelGames-v%s.zip' % ver
        path = os.path.join(DL_DIR, name)
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for g in GAMES:
                if g['id'] in out['games']:
                    z.write(os.path.join(GAMES_DIR, g['slug'] + '.html'), 'Greenlight Studios/' + g['html'])
            z.writestr('Greenlight Studios/README.txt', README)
        out['bundle'] = dict(file='downloads/' + name, size=os.path.getsize(path))
        print('bundle            zip  %6.2f MB' % (out['bundle']['size'] / 1048576))

    os.makedirs(os.path.dirname(DATA), exist_ok=True)
    with open(DATA, 'w', encoding='utf8') as f:
        f.write('/* written by site/sync.py - do not edit by hand */\n')
        f.write('window.GL_BUILDS = ' + json.dumps(out, indent=2) + ';\n')
    print('wrote', os.path.relpath(DATA, ROOT))

    # what an online player must have; an older game is told to update before it can go online
    latest = dict(version=ver)
    for g in GAMES:
        gv = game_version(os.path.join(ROOT, g['html']))
        if gv != ver:
            raise SystemExit('%s says version %s but android/build.py says %s: run python set_version.py %s' % (g['html'], gv, ver, ver))
        latest[g['id']] = gv
    vpath = os.path.join(SITE, 'data', 'version.json')
    with open(vpath, 'w', encoding='utf8') as f:
        f.write(json.dumps(latest) + '\n')
    print('wrote', os.path.relpath(vpath, ROOT), latest)


if __name__ == '__main__':
    main()
