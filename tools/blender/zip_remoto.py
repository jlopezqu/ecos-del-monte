"""Lista o extrae archivos sueltos de un zip remoto usando peticiones HTTP Range (sin bajar el zip entero).
Uso:
  python -I zip_remoto.py list <url> [filtro_regex]
  python -I zip_remoto.py get  <url> <destino> <regex> [<regex>...]
Sirve para los paquetes de assets de MakeHuman, cuyo espejo limita la velocidad por conexión."""
import sys, re, os, struct, zlib, urllib.request, concurrent.futures as cf
UA = {"User-Agent": "Mozilla/5.0"}

def rng(url, a, b):
    for _ in range(6):
        try:
            req = urllib.request.Request(url, headers={**UA, "Range": f"bytes={a}-{b}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:
            err = e
    raise err

def size(url):
    req = urllib.request.Request(url, method="HEAD", headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return int(r.headers["Content-Length"])

def central(url):
    n = size(url)
    tail = rng(url, max(0, n - 70000), n - 1)
    i = tail.rfind(b"PK\x05\x06")
    cd_size, cd_off = struct.unpack("<II", tail[i + 12:i + 20])
    entries_total = struct.unpack("<H", tail[i + 10:i + 12])[0]
    if cd_off == 0xFFFFFFFF or entries_total == 0xFFFF:  # zip64
        j = tail.rfind(b"PK\x06\x06")
        entries_total, cd_size, cd_off = struct.unpack("<QQQ", tail[j + 32:j + 56])
    cd = rng(url, cd_off, cd_off + cd_size - 1)
    out, p = [], 0
    while p < len(cd) and cd[p:p + 4] == b"PK\x01\x02":
        meth, = struct.unpack("<H", cd[p + 10:p + 12])
        csize, usize = struct.unpack("<II", cd[p + 20:p + 28])
        fl, el, cl = struct.unpack("<HHH", cd[p + 28:p + 34])
        off, = struct.unpack("<I", cd[p + 42:p + 46])
        name = cd[p + 46:p + 46 + fl].decode("utf8", "replace")
        extra = cd[p + 46 + fl:p + 46 + fl + el]
        q = 0
        while q + 4 <= len(extra):  # zip64 extra
            hid, hl = struct.unpack("<HH", extra[q:q + 4])
            if hid == 1:
                vals = list(struct.unpack("<" + "Q" * (hl // 8), extra[q + 4:q + 4 + hl]))
                if usize == 0xFFFFFFFF: usize = vals.pop(0)
                if csize == 0xFFFFFFFF: csize = vals.pop(0)
                if off == 0xFFFFFFFF: off = vals.pop(0)
            q += 4 + hl
        out.append((name, meth, csize, usize, off))
        p += 46 + fl + el + cl
    return out

def fetch(url, e, dest):
    name, meth, csize, usize, off = e
    h = rng(url, off, off + 29)
    fl, el = struct.unpack("<HH", h[26:30])
    data = rng(url, off + 30 + fl + el, off + 30 + fl + el + csize - 1) if csize else b""
    if meth == 8: data = zlib.decompress(data, -15)
    path = os.path.join(dest, *name.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f: f.write(data)
    return name, len(data)

if __name__ == "__main__":
    cmd, url = sys.argv[1], sys.argv[2]
    ents = [e for e in central(url) if not e[0].endswith("/")]
    if cmd == "list":
        pat = re.compile(sys.argv[3]) if len(sys.argv) > 3 else None
        for e in ents:
            if not pat or pat.search(e[0]): print(e[3], e[0])
    else:
        dest, pats = sys.argv[3], [re.compile(x) for x in sys.argv[4:]]
        sel = [e for e in ents if any(p.search(e[0]) for p in pats)]
        print("archivos:", len(sel), "bytes:", sum(e[2] for e in sel))
        with cf.ThreadPoolExecutor(16) as ex:
            for n, s in ex.map(lambda e: fetch(url, e, dest), sel): print(s, n)
