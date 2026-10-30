from pathlib import Path
import re
import shutil

root = Path(r'D:\archiciva')
source = Path(r'C:\Users\Dell\AppData\Local\Temp')
catalog = root / 'src/data/products.js'
output = root / 'source-assets/customer-product-photos'
output.mkdir(parents=True, exist_ok=True)

# Existing product IDs mapped only where the supplied shape and stated size match.
photos = {
    'AC-P120': '9707dae2-3694-416b-b1b6-8e73d2a3aa01',
    'AC-P122': 'd483327a-4cb6-4fbc-8b2e-f84955df9500',
    'AC-P123': 'a8eb6417-f699-4b15-a3a8-0180d88a52bb',
    'AC-P125': 'a81de549-5723-468d-9864-8ca7c34e60c7',
    'AC-P127': '95af9120-fb94-4dab-a942-82acc3e673a1',
    'AC-P128': 'a81de549-5723-468d-9864-8ca7c34e60c7',
    'AC-P131': '4e34b810-b42b-4120-9366-8639bd51aefc',
    'AC-P132': 'c1c38526-89a7-4b79-90c6-30dca16c863b',
    'AC-P146': 'f9fb8ede-e9e1-4e7d-b1b3-4d858dea5438',
    'AC-P148': '4058297c-cd8b-43d4-9fa1-b0a69a6b1f37',
    'AC-P152': '6812eaf9-81b7-4414-b6c1-037adac34afb',
    'AC-P154': 'e965009a-3170-45b9-a430-e7332d420e48',
    'AC-P155': 'e965009a-3170-45b9-a430-e7332d420e48',
    'AC-P156': 'e965009a-3170-45b9-a430-e7332d420e48',
    'AC-P161': 'c29ee42b-6526-4da3-94e9-d7f05c96f373',
    'AC-P162': 'd3cdaf31-9523-4fab-99f0-5862f5c6c4aa',
    'AC-P163': 'd3cdaf31-9523-4fab-99f0-5862f5c6c4aa',
    'AC-P164': 'd3cdaf31-9523-4fab-99f0-5862f5c6c4aa',
    'AC-P169': 'd375f309-1812-48af-8bf5-716959d39f0a',
    'AC-P170': 'd375f309-1812-48af-8bf5-716959d39f0a',
    'AC-P171': 'd375f309-1812-48af-8bf5-716959d39f0a',
    'AC-P174': 'db1feb34-7204-4f99-be07-60e40402824e',
    'AC-P177': '9ba381f5-e313-4dc3-8735-a047aa3a020e',
    'AC-P181': '54fa084c-6f46-45f4-ba03-ee4362714f30',
    'AC-P182': '0b399c57-7c93-4b6d-a75f-84ed0fe2d0eb',
    'AC-P183': '3723854d-bc3c-49be-8e70-e819dd36ac7f',
    'AC-P184': '378c9def-1fcf-4878-8d1b-aff61ad53bc8',
    'AC-P185': '378c9def-1fcf-4878-8d1b-aff61ad53bc8',
    'AC-P186': '378c9def-1fcf-4878-8d1b-aff61ad53bc8',
    'AC-P188': 'be0d7b7d-92ac-4100-b2d3-d4e5b340ac3b',
    'AC-P190': '54fa084c-6f46-45f4-ba03-ee4362714f30',
}

text = catalog.read_text(encoding='utf-8')
for product_id, photo_id in photos.items():
    matches = re.findall(r'^.*id:"' + re.escape(product_id) + r'".*$', text, flags=re.M)
    if len(matches) != 1:
        raise RuntimeError(f'Expected one catalog row for {product_id}, found {len(matches)}')
    old = matches[0]
    source_file = source / f'codex-clipboard-{photo_id}.jpg'
    if not source_file.is_file():
        raise FileNotFoundError(source_file)
    name = f'{product_id.lower()}-{photo_id[:8]}.jpg'
    destination = output / name
    shutil.copyfile(source_file, destination)
    new = re.sub(r'image:"[^"]+"', f'image:"source-assets/customer-product-photos/{name}"', old, count=1)
    if new == old:
        raise RuntimeError(f'No image field for {product_id}')
    text = text.replace(old, new, 1)
catalog.write_text(text, encoding='utf-8')
print(f'Updated {len(photos)} products')
