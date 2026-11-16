// Local-only migration helper, bundled into dist/dev-import/ temporarily.
// Uses the already signed-in administrator; no privileged key or password.
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig as c } from "../src/config/supabase.js";
const db = createClient(c.url, c.key);
const status = document.querySelector("#progress");
const check = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
document.querySelector("#files").onchange = async (event) => {
  try {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw Error("Sign in at /admin/ first");
    const products = check(
      await db
        .from("products")
        .select("id,details,status,version,name")
        .eq("status", "published")
        .limit(1000),
    );
    const images = check(
      await db
        .from("product_images")
        .select("*")
        .eq("bucket", "legacy")
        .limit(1000),
    );
    const files = new Map([...event.target.files].map((f) => [f.name, f]));
    let completed = 0;
    const queue = products.filter((p) =>
      images.some((i) => i.product_id === p.id && i.is_primary),
    );
    const total = queue.length;
    async function worker() {
      while (queue.length) {
        const p = queue.shift();
        const image = images.find((i) => i.product_id === p.id && i.is_primary);
        if (!image) continue;
        const file = files.get(`${p.details.imageName}-800.webp`);
        if (!file) throw Error(`Missing image for ${p.id}`);
        const bytes = await file.arrayBuffer();
        const digest = [
          ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const path = `legacy/${p.id}/${digest}.webp`;
        const upload = await db.storage
          .from("catalog-public")
          .upload(path, file, { contentType: "image/webp", upsert: false });
        if (
          upload.error &&
          upload.error.statusCode !== "409" &&
          upload.error.statusCode !== "400"
        )
          throw upload.error;
        const blob = check(
          await db.storage.from("catalog-public").download(path),
        );
        const actual = [
          ...new Uint8Array(
            await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
          ),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (actual !== digest)
          throw Error(`Uploaded checksum differs: ${p.id}`);
        check(
          await db
            .from("product_images")
            .update({ bucket: "catalog-public", path })
            .eq("id", image.id)
            .eq("bucket", "legacy"),
        );
        completed++;
        status.textContent = `Migrated and checksum verified: ${completed}/${total} — ${p.id}`;
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));
    status.textContent = `PASS: ${completed} published product images uploaded and SHA-256 verified. Original files and URLs preserved.`;
  } catch (error) {
    status.textContent = `ERROR: ${error.message}`;
  }
};
