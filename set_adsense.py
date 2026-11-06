"""Turn on Google AdSense for the website (the games stay ad-free).

    python site/set_adsense.py --client ca-pub-1234567890123456 --contact you@example.com
    python site/set_adsense.py --client ca-pub-1234567890123456 --slot home-games=1234567890 --slot play-rail=2345678901

  --client   your AdSense publisher id (AdSense > Account > Account information)
  --contact  the contact email shown on privacy.html
  --slot     an ad unit id for one of the page slots: home-games, home-download, play-rail
             (AdSense > Ads > By ad unit > Display ads). Slots without an id stay hidden.
  --off      remove the publisher id again (no ads on the site)

Writes data/adsense.js, ads.txt, the google-adsense-account meta tag on every page and the
privacy page contact. Safe to run again with new values.
"""
import argparse, json, os, re

SITE = os.path.dirname(os.path.abspath(__file__))
PAGES = ['index.html', 'play.html', 'privacy.html']
SLOTS = ['home-games', 'home-download', 'play-rail']
CFG = os.path.join(SITE, 'data', 'adsense.js')


def rd(p):
    return open(os.path.join(SITE, p), encoding='utf-8', newline='').read()


def wr(p, t):
    open(os.path.join(SITE, p), 'w', encoding='utf-8', newline='').write(t)


def current():
    t = rd('data/adsense.js')
    m = re.search(r"client: '([^']*)'", t)
    slots = dict(re.findall(r"'([a-z-]+)': '(\d*)'", t))
    return (m.group(1) if m else ''), {k: slots.get(k, '') for k in SLOTS}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--client')
    ap.add_argument('--contact')
    ap.add_argument('--slot', action='append', default=[])
    ap.add_argument('--off', action='store_true')
    a = ap.parse_args()

    client, slots = current()
    if a.off:
        client = ''
    elif a.client:
        if not re.fullmatch(r'ca-pub-\d{10,20}', a.client):
            raise SystemExit('publisher id looks wrong: expected ca-pub- followed by digits')
        client = a.client
    for s in a.slot:
        k, _, v = s.partition('=')
        if k not in SLOTS or not re.fullmatch(r'\d{6,20}', v):
            raise SystemExit(f'bad --slot {s!r}: use one of {", ".join(SLOTS)} = digits')
        slots[k] = v

    wr('data/adsense.js',
       "/* AdSense settings for the website. Set by site/set_adsense.py - run that instead of editing by hand.\n"
       "   client: your publisher id (ca-pub-...). Empty = no ads anywhere on the site.\n"
       "   slots:  ad unit ids from AdSense > Ads > By ad unit. A slot with no id stays hidden (Auto ads can still place ads). */\n"
       "window.GL_ADSENSE = {\n"
       f"  client: '{client}',\n"
       "  slots: { " + ', '.join(f"'{k}': '{slots[k]}'" for k in SLOTS) + " }\n"
       "};\n")

    # site ownership tag that AdSense looks for in each page head
    for p in PAGES:
        t = re.sub(r'<meta name="google-adsense-account" content="[^"]*">\n', '', rd(p))
        if client:
            t = t.replace('<meta name="viewport"', f'<meta name="google-adsense-account" content="{client}">\n<meta name="viewport"', 1)
        wr(p, t)

    ads_txt = os.path.join(SITE, 'ads.txt')
    if client:
        # f08c47fec0942fa0 is Google's fixed certification authority id
        wr('ads.txt', f'google.com, {client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n')
    elif os.path.exists(ads_txt):
        os.remove(ads_txt)

    if a.contact:
        if not re.fullmatch(r'[^@\s"<>]+@[^@\s"<>]+\.[^@\s"<>]+', a.contact):
            raise SystemExit('contact email looks wrong')
        t = re.sub(r'<a href="mailto:[^"]*" data-contact>[^<]*</a>',
                   f'<a href="mailto:{a.contact}" data-contact>{a.contact}</a>', rd('privacy.html'))
        wr('privacy.html', t)

    print('publisher id:', client or '(none - ads off)')
    print('slots:', json.dumps(slots))
    if 'CONTACT_EMAIL' in rd('privacy.html'):
        print('note: privacy.html still has no contact email - pass --contact')


if __name__ == '__main__':
    main()
