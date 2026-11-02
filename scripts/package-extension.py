"""Package the built extension, validate manifest assets, and omit the editable artwork."""
from pathlib import Path
import json
import struct
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
build = root / 'dist'
manifest = json.loads((build / 'manifest.json').read_text(encoding='utf-8'))
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
assert manifest['version'] == package['version'], 'Package/manifest version mismatch'
for asset in [manifest['action']['default_popup'], manifest['background']['service_worker']]:
    assert (build / asset).is_file(), f'Missing asset: {asset}'
for icons in [manifest['icons'], manifest['action']['default_icon']]:
    for size, asset in icons.items():
        data = (build / asset).read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', data[16:24]) == (int(size), int(size))
output = root / 'nahfi-bookmark-manager.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in sorted(build.rglob('*')):
        if file.is_file() and file.name != 'icon-source.png':
            archive.write(file, file.relative_to(build))
    archive.writestr('INSTALL.txt', '''Nahfi Bookmark Manager
Install: extract this ZIP, open chrome://extensions, enable Developer mode, then Load unpacked and select the extracted folder.
Update: replace files in the ORIGINAL extension folder and click Reload. Do not uninstall if you want to preserve local settings and icon caches.
Sync: use the same extension ID and Chrome account on each computer, with bookmark and extension sync enabled.
''')
with ZipFile(output) as archive:
    assert archive.testzip() is None
print(f'{output.name}: v{manifest["version"]}, {output.stat().st_size:,} bytes')
