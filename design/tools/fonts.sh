#!/bin/sh
# Downloads candidate fonts (fontsource packages) for the stage-0 prototypes into
# design/concepts/_shared/fonts/<package>/. Not project dependencies: npm pack in a throwaway
# container, only latin + cyrillic + cyrillic-ext woff2 files and the licence are kept.
set -e
cd "$(dirname "$0")/.."
PKGS="${*:-@fontsource-variable/geologica @fontsource-variable/onest @fontsource/ibm-plex-mono
@fontsource-variable/martian-mono @fontsource-variable/sofia-sans-extra-condensed
@fontsource-variable/sofia-sans-condensed @fontsource-variable/sofia-sans
@fontsource-variable/alumni-sans @fontsource-variable/tektur @fontsource/dela-gothic-one
@fontsource-variable/roboto-flex @fontsource-variable/inter @fontsource-variable/inter-tight
@fontsource-variable/geist @fontsource-variable/geist-mono @fontsource-variable/jetbrains-mono
@fontsource-variable/commissioner @fontsource-variable/wix-madefor-display
@fontsource-variable/manrope @fontsource/golos-text @fontsource-variable/golos-text}"
docker run --rm -v "$PWD/concepts/_shared/fonts:/out" node:20-alpine sh -c '
  cd /tmp
  for pkg in '"$(echo $PKGS)"'; do
    name=$(echo "$pkg" | tr "/" "_" | tr -d "@")
    if ! tgz=$(npm pack "$pkg" --silent 2>/dev/null); then echo "MISSING $pkg"; continue; fi
    rm -rf p && mkdir p && tar -xzf "$tgz" -C p
    mkdir -p "/out/$name/files"
    cp p/package/LICENSE* "/out/$name/" 2>/dev/null || true
    cp p/package/package.json "/out/$name/"
    find p/package/files -name "*.woff2" | grep -E -- "-(latin|cyrillic|cyrillic-ext)-" \
      | xargs -I{} cp {} "/out/$name/files/"
    echo "OK $pkg $(ls /out/$name/files | wc -l) files"
  done'
