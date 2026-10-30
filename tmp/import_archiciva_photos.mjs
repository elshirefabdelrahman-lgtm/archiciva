import fs from 'node:fs';
import path from 'node:path';
const root='D:/archiciva';
const source='C:/Users/Dell/AppData/Local/Temp';
const catalog=path.join(root,'src/data/products.js');
const output=path.join(root,'source-assets/customer-product-photos');
fs.mkdirSync(output,{recursive:true});
const photos={
120:'9707dae2-3694-416b-b1b6-8e73d2a3aa01',122:'d483327a-4cb6-4fbc-8b2e-f84955df9500',123:'a8eb6417-f699-4b15-a3a8-0180d88a52bb',125:'a81de549-5723-468d-9864-8ca7c34e60c7',127:'95af9120-fb94-4dab-a942-82acc3e673a1',128:'a81de549-5723-468d-9864-8ca7c34e60c7',131:'4e34b810-b42b-4120-9366-8639bd51aefc',132:'c1c38526-89a7-4b79-90c6-30dca16c863b',146:'f9fb8ede-e9e1-4e7d-b1b3-4d858dea5438',148:'4058297c-cd8b-43d4-9fa1-b0a69a6b1f37',152:'6812eaf9-81b7-4414-b6c1-037adac34afb',154:'e965009a-3170-45b9-a430-e7332d420e48',155:'e965009a-3170-45b9-a430-e7332d420e48',156:'e965009a-3170-45b9-a430-e7332d420e48',161:'c29ee42b-6526-4da3-94e9-d7f05c96f373',162:'d3cdaf31-9523-4fab-99f0-5862f5c6c4aa',163:'d3cdaf31-9523-4fab-99f0-5862f5c6c4aa',164:'d3cdaf31-9523-4fab-99f0-5862f5c6c4aa',169:'d375f309-1812-48af-8bf5-716959d39f0a',170:'d375f309-1812-48af-8bf5-716959d39f0a',171:'d375f309-1812-48af-8bf5-716959d39f0a',174:'db1feb34-7204-4f99-be07-60e40402824e',177:'9ba381f5-e313-4dc3-8735-a047aa3a020e',182:'0b399c57-7c93-4b6d-a75f-84ed0fe2d0eb',183:'3723854d-bc3c-49be-8e70-e819dd36ac7f',184:'378c9def-1fcf-4878-8d1b-aff61ad53bc8',185:'378c9def-1fcf-4878-8d1b-aff61ad53bc8',186:'378c9def-1fcf-4878-8d1b-aff61ad53bc8',188:'be0d7b7d-92ac-4100-b2d3-d4e5b340ac3b',190:'54fa084c-6f46-45f4-ba03-ee4362714f30'};
let text=fs.readFileSync(catalog,'utf8');
for(const [number,id] of Object.entries(photos)){
 const productId=`AC-P${number}`;
 const lines=text.split('\n');
 const index=lines.findIndex(line=>line.includes(`id:"${productId}"`));
 if(index<0) throw Error(`Missing ${productId}`);
 const src=path.join(source,`codex-clipboard-${id}.jpg`);
 const name=`${productId.toLowerCase()}-${id.slice(0,8)}.jpg`;
 fs.copyFileSync(src,path.join(output,name));
 lines[index]=lines[index].replace(/image:"[^"]+"/,`image:"source-assets/customer-product-photos/${name}"`);
 text=lines.join('\n');
}
fs.writeFileSync(catalog,text);
console.log(`Updated ${Object.keys(photos).length} products`);
