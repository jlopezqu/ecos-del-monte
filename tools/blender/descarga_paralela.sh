#!/usr/bin/env bash
# Descarga un archivo grande en N trozos paralelos (el espejo files2.makehumancommunity.org limita
# cada conexión a ~65 KB/s). Uso: descarga_paralela.sh <url> <destino> [trozos=24]
set -e
url="$1"; out="$2"; n="${3:-24}"; ua="Mozilla/5.0"
size=$(curl -sIL -A "$ua" "$url" | grep -i '^content-length' | tail -1 | tr -dc '0-9')
[ -n "$size" ] || { echo "sin tamaño"; exit 1; }
part=$(( (size + n - 1) / n )); tmp="$out.parts"; mkdir -p "$tmp"
for i in $(seq 0 $((n-1))); do
  s=$((i*part)); e=$((s+part-1)); [ $e -ge $size ] && e=$((size-1))
  [ -f "$tmp/$i" ] && [ $(stat -c %s "$tmp/$i") -eq $((e-s+1)) ] && continue
  curl -s -A "$ua" --retry 5 -r $s-$e -o "$tmp/$i" "$url" &
done
wait
: > "$out"; for i in $(seq 0 $((n-1))); do cat "$tmp/$i" >> "$out"; done
[ $(stat -c %s "$out") -eq $size ] && rm -rf "$tmp" && echo "OK $out $size" || echo "INCOMPLETO $out"
