# ArchiCiva catalog backend

Project: `archiciva-dev` (`krbzqvogldbvlsdadshp`). The storefront uses a public publishable key and database RLS. No service-role key is required in the browser, build or GitHub Actions.

## Installed schema

Apply migrations in filename order to an empty project using Dashboard → SQL Editor. Each migration is transactional and intended to run once. On this project migrations 001–004, the initial import and the named administrator bootstrap have been applied. Do not rerun schema creation against the existing tables.

`bootstrap-admin.sql` verifies the existing Auth user's UUID and email before granting catalog administration. Administrators cannot grant themselves membership through the browser. Creating a new administrator requires a reviewed SQL operation. Never store passwords here.

`node scripts/export-supabase.js` exports the original source catalog and checksums. `import/catalog.sql` imports missing products only, including their colors, sizes, copy and image references. Existing products and their child rows are left untouched on repeat imports. It is not a backup of later administrator edits.

## Data and images

Prices are integer SAR minor units. A missing compare-at price means no discount. A compare-at price must exceed the current price. Prices currently apply to a product, not separately to each color or size.

Product IDs and existing slugs are retained. Product saves use `save_catalog_product` with an expected version and an atomic transaction; stale writes are rejected. Updates are audited. Deletion in the UI is reversible archival.

The manager interface provides inline current/before-discount prices beside product photos. The full editor only asks for the name, category, prices, description, colors, sizes and images. New product/category paths and product SEO defaults are generated automatically; existing paths and unedited legacy fields are preserved. Quick price writes also check the current product version and use the same database constraints, RLS and audit triggers.

`product_images.color_id` uses a composite foreign key to ensure the color belongs to the same product. A null color means a shared image. Removing an image in the UI detaches it from the product; storage files are retained for recovery. Do not delete storage objects without auditing references.

New images go into the private `catalog-drafts` bucket. Administrators preview them with expiring signed URLs. Publishing copies images into `catalog-public`; public images remain publicly accessible even when their product is later hidden. Public storage is not suitable for confidential material.

The 191 optimized original product images were uploaded under immutable SHA-256 paths and verified after upload. Original local source assets and legacy website URLs remain intact. `prepare-media-import.js` generates a temporary local-only uploader under ignored `dist/dev-import/`; a full build removes that page. Do not sync that helper page to production.

The archived products `AC-95c3406f` and `AC-71a9c844` and the hidden category `planters/admin-verification-category` are internal UI verification fixtures. The product was temporarily published only for a local route, gallery and checkout test, then archived before production publication. Its test pictures contain copies of existing catalog images; some copies are public because the publication path was tested. Neither fixture is part of the 191 published originals.

## Storefront and deployment

`src/data/catalog.js` loads a consistent RLS-filtered public snapshot from `get_store_catalog`. Build failures stop publication; there is no automatic fallback to the old catalog. The original data files remain as the migration source.

The storefront refreshes published prices, colors and images. A new product is discoverable only once its static route exists in `catalog-version.json`. Search, cart and WhatsApp use stable legacy IDs. The cart carries color and size choices, flags unavailable choices and checks prices again before WhatsApp checkout.

GitHub Actions checks for catalog changes every five minutes and rebuilds HTML, JSON-LD and sitemap when needed. Scheduled jobs can be delayed by GitHub. Hostinger deployment is a separate step and must pull the generated-output commit. The admin publication check compares the saved product version to the version served by the current host. It does not claim to inspect hPanel logs.

`npm ci`, `npm run build`, `npm run validate`, review the diff, then `npm run sync:hostinger`. Sync validates the manifest paths and only replaces generated top-level entries. The workflow stages generated output explicitly; it does not stage arbitrary private notes.

## Verification

`smoke-test.sql` exercises administrator saves, price checks, stale writes, non-admin denial and hidden child-row protection in a transaction which rolls back. `verify.sql` provides basic counts and role checks. Run those through SQL Editor, inspecting the results.

`node scripts/verify-catalog-import.js` is the initial migration acceptance check against the original files. It is expected to fail after legitimate owner edits, and must not be used as an ongoing CI check.

For disaster recovery, export current database rows and Storage media from Supabase before major maintenance. Re-importing the original static catalog will not restore subsequent administrator work. Reverting a Git commit also does not revert Supabase data.
